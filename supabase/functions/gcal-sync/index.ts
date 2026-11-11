// Mirrors todos into Google Calendar as all-day events. Triggered by a Supabase Database Webhook
// on public.todos (INSERT / UPDATE / DELETE), so every write path (editor, kanban drag, chat) is
// covered without touching client code.
// Deploy: supabase functions deploy gcal-sync --no-verify-jwt   (the webhook can't send a user JWT;
//         it authenticates with the shared secret header below instead)
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, WEBHOOK_SECRET
// Webhook header to configure: x-webhook-secret: <same WEBHOOK_SECRET>

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!

type Todo = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  expected_complete_at: string | null
  google_event_id: string | null
}
type Payload = { type: 'INSERT' | 'UPDATE' | 'DELETE'; record: Todo | null; old_record: Todo | null }

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

async function accessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`token refresh failed: ${data.error_description || data.error}`)
  return data.access_token
}

// All-day events use an exclusive end date, so end = due date + 1 day.
function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function toEvent(t: Todo) {
  const done = t.status === 'DONE'
  return {
    summary: done ? `✓ ${t.title}` : t.title,
    description: t.description ?? undefined,
    start: { date: t.expected_complete_at },
    end: { date: nextDay(t.expected_complete_at!) },
    transparency: 'transparent', // don't block the calendar as "busy"
  }
}

const RELEVANT = ['title', 'description', 'status', 'expected_complete_at'] as const

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) return new Response('Unauthorized', { status: 401 })

  const { type, record, old_record }: Payload = await req.json()

  // Writing google_event_id back fires another UPDATE webhook; ignore updates that changed nothing we mirror.
  if (type === 'UPDATE' && record && old_record && RELEVANT.every((k) => record[k] === old_record[k])) {
    return new Response('no-op')
  }

  const connRes = await db('google_calendar_connection?select=refresh_token,calendar_id&id=eq.1')
  const [conn] = await connRes.json()
  if (!conn) return new Response('not connected') // sync is off until the user connects

  const token = await accessToken(conn.refresh_token)
  const cal = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events`
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const removeEvent = async (eventId: string) => {
    const res = await fetch(`${cal}/${eventId}`, { method: 'DELETE', headers: auth })
    if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error(`delete failed: ${await res.text()}`)
  }

  if (type === 'DELETE') {
    if (old_record?.google_event_id) await removeEvent(old_record.google_event_id)
    return new Response('deleted')
  }

  const todo = record!

  // No due date -> nothing to put on a calendar (and drop any event that existed).
  if (!todo.expected_complete_at) {
    if (todo.google_event_id) {
      await removeEvent(todo.google_event_id)
      await db(`todos?id=eq.${todo.id}`, { method: 'PATCH', body: JSON.stringify({ google_event_id: null }) })
    }
    return new Response('no date')
  }

  if (todo.google_event_id) {
    const res = await fetch(`${cal}/${todo.google_event_id}`, { method: 'PATCH', headers: auth, body: JSON.stringify(toEvent(todo)) })
    if (res.ok) return new Response('updated')
    if (res.status !== 404 && res.status !== 410) throw new Error(`update failed: ${await res.text()}`)
    // Event was deleted in Calendar by hand: fall through and recreate it.
  }

  const res = await fetch(cal, { method: 'POST', headers: auth, body: JSON.stringify(toEvent(todo)) })
  if (!res.ok) throw new Error(`insert failed: ${await res.text()}`)
  const created = await res.json()
  await db(`todos?id=eq.${todo.id}`, { method: 'PATCH', body: JSON.stringify({ google_event_id: created.id }) })
  return new Response('created')
})
