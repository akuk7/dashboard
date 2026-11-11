// Proxies a short audio clip to Groq's Whisper endpoint so the API key stays server-side.
// Deploy: supabase functions deploy chat-transcribe
// Secret: supabase secrets set GROQ_API_KEY=...

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

const MAX_BYTES = 5 * 1024 * 1024 // a spoken command is a few seconds; 5MB is plenty

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) return json({ error: 'GROQ_API_KEY is not configured' }, 500)

  let incoming: FormData
  try {
    incoming = await req.formData()
  } catch {
    return json({ error: 'Expected multipart form data with an "audio" file' }, 400)
  }

  const audio = incoming.get('audio')
  if (!(audio instanceof File)) return json({ error: 'Missing "audio" file' }, 400)
  if (audio.size === 0 || audio.size > MAX_BYTES) return json({ error: 'Audio is empty or too large' }, 413)

  const form = new FormData()
  form.append('file', audio, audio.name || 'speech.webm')
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'json')
  form.append('temperature', '0')
  // Hint toward the vocabulary of this app so short commands transcribe better.
  form.append('prompt', 'Expense logging: credit, debit, lend, repayment, transfer, todo, habit.')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('Groq error', res.status, detail)
    return json({ error: res.status === 429 ? 'Voice quota reached, try again later' : 'Transcription failed' }, 502)
  }

  const data = await res.json()
  return json({ text: String(data.text ?? '').trim() })
})
