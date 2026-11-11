// Connects / disconnects the user's Google Calendar. Called from the browser with the user's
// Supabase JWT (verified by the platform), so only a logged-in user can use it.
//   { action: 'url',  redirectUri }        -> { url }   Google consent URL to send the browser to
//   { action: 'exchange', code, redirectUri } -> { connected: true }  trades the code for a refresh token
//   { action: 'status' }                   -> { connected }
//   { action: 'disconnect' }               -> { connected: false }
// Deploy: supabase functions deploy gcal-auth
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (SUPABASE_URL / SERVICE_ROLE_KEY are built in)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

// Minimal PostgREST helper using the service role (bypasses RLS).
function db(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { action, code, redirectUri } = await req.json()

    if (action === 'url') {
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline', // ask for a refresh token
        prompt: 'consent', // force it to be re-issued on every connect
      })
      return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
    }

    if (action === 'exchange') {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })
      const tokens = await res.json()
      if (!res.ok || !tokens.refresh_token) {
        return json({ error: tokens.error_description || 'No refresh token returned' }, 400)
      }
      const save = await db('google_calendar_connection', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: 1, refresh_token: tokens.refresh_token, connected_at: new Date().toISOString() }),
      })
      if (!save.ok) return json({ error: await save.text() }, 500)
      return json({ connected: true })
    }

    if (action === 'status') {
      const res = await db('google_calendar_connection?select=id&id=eq.1')
      const rows = await res.json()
      return json({ connected: Array.isArray(rows) && rows.length > 0 })
    }

    if (action === 'disconnect') {
      await db('google_calendar_connection?id=eq.1', { method: 'DELETE' })
      return json({ connected: false })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
