// Turns a free-text message ("credit 250 alfahm food") into structured actions for
// transactions, todos and habit logs. It never writes to the database: the client shows
// an approval card and inserts only after the user presses Approve.
// Deploy: supabase functions deploy chat-parse
// Secret: supabase secrets set GEMINI_API_KEY=...

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

// Override without a redeploy by setting a GEMINI_MODEL secret (models get retired).
const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite'
const MAX_MESSAGE_CHARS = 1000

const TRANSACTION_TYPES = [
  'debit', 'credit', 'internal_transfer', 'lend_out', 'lend_in',
  'lend_out_topup', 'lend_in_topup', 'repayment_received', 'repayment_made',
] as const

type Named = { id: string; name: string }
type Loan = { id: string; name: string; kind: 'lend_out' | 'lend_in'; outstanding: number }
type Context = {
  today: string
  accounts: Named[]
  transactionCategories: Named[]
  todoCategories: Named[]
  habits: Named[]
  loans: Loan[]
}
type HistoryItem = { role: 'user' | 'assistant'; text: string }

const nullableString = { type: 'STRING', nullable: true }

const responseSchema = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    actions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING', enum: ['transaction', 'todo', 'habit_log', 'clarify'] },
          // transaction
          type: { type: 'STRING', nullable: true, enum: [...TRANSACTION_TYPES] },
          // Not nullable: the newer model tends to leave an optional number empty. Use 0 when not a transaction.
          amount: { type: 'NUMBER' },
          description: nullableString,
          account_id: nullableString,
          to_account_id: nullableString,
          category_id: nullableString,
          related_loan_id: nullableString,
          transaction_date: nullableString,
          // todo
          title: nullableString,
          todo_category_id: nullableString,
          expected_complete_at: nullableString,
          // habit
          habit_id: nullableString,
          date: nullableString,
          done: { type: 'BOOLEAN', nullable: true },
          // clarify
          question: nullableString,
        },
        required: ['kind', 'amount'],
      },
    },
  },
  required: ['reply', 'actions'],
}

function buildSystemPrompt(ctx: Context): string {
  const list = (items: Named[]) => (items.length ? items.map((i) => `- ${i.name} => ${i.id}`).join('\n') : '(none)')
  const loans = ctx.loans.length
    ? ctx.loans.map((l) => `- ${l.name} [${l.kind}, outstanding ${l.outstanding}] => ${l.id}`).join('\n')
    : '(none)'

  const weekday = new Date(`${ctx.today}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })

  return `You are the logging assistant inside a personal dashboard. Today's date is ${ctx.today}, a ${weekday} (IST).
You turn short messages into structured records. You support exactly three services:
1. transaction  2. todo  3. habit_log
Anything else (questions, chit-chat): return no actions and put a short answer in "reply".

Rules for ALL actions:
- Use ONLY the ids listed below. Never invent an id. Match names case-insensitively and forgive typos.
- If a required value is missing or a name matches nothing or several things, return a "clarify" action with a short "question" instead of guessing.
- Dates are YYYY-MM-DD. Resolve "today", "yesterday", "tomorrow", "day before yesterday", "3 days ago", "last friday" (most recent past one), "next monday" (upcoming one) relative to ${ctx.today} (${weekday}). Count days carefully. Default to ${ctx.today}.
- A message may contain MANY records (several lines, a list, or "all transactions of <day>: ..."). Return one separate action per record, in the order given, never merged. A date or account stated once for the whole list applies to every record in it. If a single line has several amounts (e.g. "food 50, tea 20 on canara"), that is several records.
- "reply" is one short sentence summarising what you understood. Nothing is saved until the user approves the card, so never say "logged" or "saved"; say e.g. "Got it, a debit of 200 from Canara for home."
- Id fields must contain the UUID after "=>", never the name. Every transaction needs account_id; if the user states the account once for a list ("from canara", "on canara"), copy that account's UUID into EVERY record.
- Date field per kind: transaction uses "transaction_date", todo uses "expected_complete_at", habit_log uses "date". ALWAYS fill that field with the resolved YYYY-MM-DD (e.g. "yesterday" => the day before ${ctx.today}), even when it equals today. A date the user types (10-11-2026 means 10 Nov 2026, day-month-year) is used as given.
- Always set "amount" (a number). For transactions it is the amount; for todo, habit_log and clarify use 0.

TRANSACTIONS (kind "transaction"):
Message shape is usually: <type> <amount> <account> <category/description>, e.g. "credit 250 alfahm food".
The account is the payment method / wallet / bank. The category is a spending category.
Types: ${TRANSACTION_TYPES.join(', ')}.
- "credit" = money coming in, "debit" = money going out (words like spent, paid, bought mean debit; got, received, salary mean credit).
- internal_transfer: needs account_id (from) and to_account_id (to), which must differ. category_id null.
- lend_out = I lent money to someone; lend_in = I borrowed money. description should hold the person's name.
- lend_out_topup / lend_in_topup = more money added to an existing loan. repayment_received / repayment_made = money paid back against an existing loan. These need related_loan_id from the loans list, and category_id null.
- All types except internal_transfer must have to_account_id null.
- description: short, e.g. "food" or what the user said after the amount. amount must be > 0.
- For credit/debit pick category_id from the categories list, or null if nothing fits.

TODOS (kind "todo"): title (required), optional todo_category_id, expected_complete_at (default ${ctx.today}).

HABIT LOGS (kind "habit_log"): habit_id from the habits list, date (default ${ctx.today}), done true (use false only for "undo"/"unmark").

ACCOUNTS (name => id):
${list(ctx.accounts)}

TRANSACTION CATEGORIES (name => id):
${list(ctx.transactionCategories)}

TODO CATEGORIES (name => id):
${list(ctx.todoCategories)}

ACTIVE HABITS (name => id):
${list(ctx.habits)}

OPEN LOANS (name [kind, outstanding] => id):
${loans}`
}

// ---- validation: never trust model output; check every id against the context we sent ----

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// deno-lint-ignore no-explicit-any
function validateAction(a: any, ctx: Context): any {
  const clarify = (question: string) => ({ kind: 'clarify', question })
  // Accepts the exact id, or (if the model wrote the name instead) a unique case-insensitive name match.
  const pick = (items: Named[], v: unknown): string | null => {
    if (typeof v !== 'string' || !v.trim()) return null
    const byId = items.find((i) => i.id === v)
    if (byId) return byId.id
    const name = v.trim().toLowerCase()
    const byName = items.filter((i) => i.name.trim().toLowerCase() === name)
    return byName.length === 1 ? byName[0].id : null
  }
  // The model sometimes puts the date in a sibling date field, so take the first valid one.
  const date = (...vals: unknown[]) => {
    const hit = vals.find((v) => typeof v === 'string' && DATE_RE.test(v.trim()))
    return typeof hit === 'string' ? hit.trim() : ctx.today
  }

  if (a?.kind === 'clarify') return clarify(String(a.question ?? 'Could you rephrase that?'))

  if (a?.kind === 'transaction') {
    if (!(TRANSACTION_TYPES as readonly string[]).includes(a.type)) return clarify('What type of transaction is this?')
    const amount = typeof a.amount === 'string' ? Number(a.amount.replace(/,/g, '')) : Number(a.amount)
    if (!Number.isFinite(amount) || amount <= 0) return clarify('What is the amount?')
    const accountId = pick(ctx.accounts, a.account_id)
    if (!accountId) return clarify('Which account was this on?')

    const isTransfer = a.type === 'internal_transfer'
    const needsLoan = ['lend_out_topup', 'lend_in_topup', 'repayment_received', 'repayment_made'].includes(a.type)

    const toAccountId = isTransfer ? pick(ctx.accounts, a.to_account_id) : null
    if (isTransfer && (!toAccountId || toAccountId === accountId)) {
      return clarify('Which account is the money going to?')
    }
    const loanId = needsLoan ? pick(ctx.loans, a.related_loan_id) : null
    if (needsLoan && !loanId) return clarify('Which loan is this for?')

    return {
      kind: 'transaction',
      type: a.type,
      amount,
      description: String(a.description ?? '').trim() || String(a.type).replace(/_/g, ' '),
      account_id: accountId,
      to_account_id: toAccountId,
      category_id: !isTransfer && !needsLoan ? pick(ctx.transactionCategories, a.category_id) : null,
      related_loan_id: loanId,
      transaction_date: date(a.transaction_date, a.date, a.expected_complete_at),
    }
  }

  if (a?.kind === 'todo') {
    const title = String(a.title ?? '').trim()
    if (!title) return clarify('What should the todo say?')
    return {
      kind: 'todo',
      title,
      todo_category_id: pick(ctx.todoCategories, a.todo_category_id),
      expected_complete_at: date(a.expected_complete_at, a.date, a.transaction_date),
    }
  }

  if (a?.kind === 'habit_log') {
    const habitId = pick(ctx.habits, a.habit_id)
    if (!habitId) return clarify('Which habit did you mean?')
    return { kind: 'habit_log', habit_id: habitId, date: date(a.date, a.transaction_date, a.expected_complete_at), done: a.done !== false }
  }

  return null
}

function isContext(c: unknown): c is Context {
  const x = c as Context
  const arr = (v: unknown) => Array.isArray(v)
  return !!x && typeof x.today === 'string' && DATE_RE.test(x.today) &&
    arr(x.accounts) && arr(x.transactionCategories) && arr(x.todoCategories) && arr(x.habits) && arr(x.loans)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'GEMINI_API_KEY is not configured' }, 500)

  let body: { message?: unknown; context?: unknown; history?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return json({ error: 'Message is empty' }, 400)
  if (message.length > MAX_MESSAGE_CHARS) return json({ error: 'Message is too long' }, 413)
  if (!isContext(body.context)) return json({ error: 'Invalid context' }, 400)
  const ctx = body.context

  const history: HistoryItem[] = Array.isArray(body.history)
    ? (body.history as HistoryItem[])
        .filter((h) => (h?.role === 'user' || h?.role === 'assistant') && typeof h.text === 'string')
        .slice(-4)
    : []

  const contents = [
    ...history.map((h) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text.slice(0, MAX_MESSAGE_CHARS) }] })),
    { role: 'user', parts: [{ text: message }] },
  ]

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(ctx) }] },
      contents,
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema,
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('Gemini error', res.status, detail)
    return json({
      error: res.status === 429 ? 'AI quota reached, try again later' : 'Could not parse that message',
      geminiStatus: res.status,
      detail: detail.slice(0, 500),
    }, 502)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  let parsed: { reply?: string; actions?: unknown[] }
  try {
    parsed = JSON.parse(text)
  } catch {
    console.error('Unparseable model output', text)
    return json({ error: 'Could not understand the AI response' }, 502)
  }

  const rawActions = Array.isArray(parsed.actions) ? parsed.actions : []
  const validated = rawActions.map((a) => validateAction(a, ctx)).filter(Boolean)
  // Several identical questions (e.g. 4 records all missing the account) collapse into one.
  const seenQuestions = new Set<string>()
  const actions = validated.filter((a) => {
    if (a.kind !== 'clarify') return true
    if (seenQuestions.has(a.question)) return false
    seenQuestions.add(a.question)
    return true
  })
  if (actions.some((a) => a.kind === 'clarify')) console.log('Clarify returned. Raw model output:', text)

  return json({ reply: String(parsed.reply ?? ''), actions })
})
