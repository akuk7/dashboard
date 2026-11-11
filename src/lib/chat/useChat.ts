import { useCallback, useEffect, useRef, useState } from 'react'
import supabase from '../supabase'
import { loadChatContext } from './context'
import { commitAction } from './commit'
import type { ChatAction, ChatContext, ChatMessage, ParsedAction } from '../../types/chat'

const STORAGE_KEY = 'dashboard.chat.v1'
const MAX_STORED_MESSAGES = 100

function loadStored(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    // An action stuck mid-save when the page closed goes back to pending.
    return (parsed as ChatMessage[]).map(m => ({
      ...m,
      actions: m.actions?.map(a => (a.status === 'saving' ? { ...a, status: 'pending' as const } : a)),
    }))
  } catch {
    return []
  }
}

function persist(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)))
  } catch {
    // storage unavailable or full: chat still works, it just won't survive a reload
  }
}

const uid = () => crypto.randomUUID()

function labelsFor(action: ParsedAction, ctx: ChatContext): Record<string, string> {
  const name = (items: { id: string; name: string }[], id: string | null) => items.find(i => i.id === id)?.name
  const labels: Record<string, string | undefined> = {}
  if (action.kind === 'transaction') {
    labels.account = name(ctx.accounts, action.account_id)
    labels.toAccount = name(ctx.accounts, action.to_account_id)
    labels.category = name(ctx.transactionCategories, action.category_id)
    labels.loan = name(ctx.loans, action.related_loan_id)
  } else if (action.kind === 'todo') {
    labels.category = name(ctx.todoCategories, action.todo_category_id)
  } else if (action.kind === 'habit_log') {
    labels.habit = name(ctx.habits, action.habit_id)
  }
  return Object.fromEntries(Object.entries(labels).filter((e): e is [string, string] => !!e[1]))
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadStored)
  const [sending, setSending] = useState(false)
  const messagesRef = useRef(messages)

  useEffect(() => {
    messagesRef.current = messages
    persist(messages)
  }, [messages])

  const updateAction = useCallback((actionId: string, patch: Partial<ChatAction>) => {
    setMessages(prev => prev.map(m => m.actions?.some(a => a.id === actionId)
      ? { ...m, actions: m.actions.map(a => (a.id === actionId ? { ...a, ...patch } : a)) }
      : m))
  }, [])

  const send = useCallback(async (text: string) => {
    const message = text.trim()
    if (!message || sending) return

    const history = messagesRef.current.slice(-4).map(m => ({ role: m.role, text: m.text }))
    setMessages(prev => [...prev, { id: uid(), role: 'user', text: message }])
    setSending(true)

    try {
      const context = await loadChatContext()
      const { data, error } = await supabase.functions.invoke('chat-parse', { body: { message, context, history } })
      if (error) throw error

      const actions: ChatAction[] = (data.actions as ParsedAction[]).map(action => ({
        id: uid(),
        action,
        labels: labelsFor(action, context),
        status: 'pending',
      }))
      const reply = String(data.reply ?? '') || (actions.length ? 'Here is what I understood:' : "I couldn't find anything to log in that.")
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', text: reply, actions }])
    } catch (e) {
      console.error('Chat error', e)
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', text: 'Something went wrong. Please try again.' }])
    } finally {
      setSending(false)
    }
  }, [sending])

  const approve = useCallback(async (chatAction: ChatAction) => {
    if (chatAction.status !== 'pending' && chatAction.status !== 'error') return
    updateAction(chatAction.id, { status: 'saving', error: undefined })
    try {
      await commitAction(chatAction.action)
      updateAction(chatAction.id, { status: 'approved' })
    } catch (e) {
      console.error('Approve failed', e)
      updateAction(chatAction.id, { status: 'error', error: e instanceof Error ? e.message : 'Could not save.' })
    }
  }, [updateAction])

  // Saves every still-pending tile of one reply, one after another so they land in order.
  const approveAll = useCallback(async (items: ChatAction[]) => {
    for (const item of items) {
      if (item.action.kind !== 'clarify' && (item.status === 'pending' || item.status === 'error')) {
        await approve(item)
      }
    }
  }, [approve])

  const dismiss = useCallback((actionId: string) => updateAction(actionId, { status: 'dismissed' }), [updateAction])

  const clear = useCallback(() => {
    setMessages([])
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  return { messages, sending, send, approve, approveAll, dismiss, clear }
}
