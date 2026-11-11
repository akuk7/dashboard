import React, { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Mic, Square, Trash2, Loader2, CheckCheck } from 'lucide-react'
import { useChat } from '../../lib/chat/useChat'
import { useVoiceRecorder } from '../../lib/chat/useVoiceRecorder'
import { useIsMobile } from '../../hooks/useIsMobile'
import ActionCard from './ActionCard'

const ChatWidget: React.FC = () => {
  const isMobile = useIsMobile()
  const { messages, sending, send, approve, approveAll, dismiss, clear } = useChat()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const onTranscript = useCallback((text: string) => { setNotice(null); setInput(prev => (prev ? `${prev} ${text}` : text)) }, [])
  const voice = useVoiceRecorder(onTranscript, setNotice)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, sending])

  const submit = () => {
    if (!input.trim() || sending) return
    const text = input
    setInput('')
    setNotice(null)
    void send(text)
  }

  const handleClear = () => {
    if (messages.length === 0) return
    clear()
  }

  // Tiles still waiting for approval in the most recent reply that has any.
  const pendingItems = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const items = (messages[i].actions ?? []).filter(a => a.action.kind !== 'clarify' && (a.status === 'pending' || a.status === 'error'))
      if (items.length > 0) return items
    }
    return []
  })()

  // Enter with an empty input approves the next waiting tile (top to bottom), one per press.
  // A tile that is still saving is skipped, so a fast double press can't approve it twice.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return
      if ((e.target as HTMLElement | null)?.closest('button')) return // Enter on a focused button clicks it
      if (inputRef.current?.value.trim()) return // typed text: the textarea handler sends it
      if (pendingItems.length === 0 || sending) return
      e.preventDefault()
      void approve(pendingItems[0])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Grow with the content up to ~5 lines, then keep that height and scroll (like ChatGPT).
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [input, open])

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open assistant"
          className={`fixed right-4 z-40 w-12 h-12 rounded-full bg-white text-black shadow-lg flex items-center justify-center hover:bg-gray-200 ${isMobile ? 'bottom-20' : 'bottom-6'}`}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div
          className={`fixed z-50 bg-[#121212] text-gray-100 border border-[#303030] shadow-2xl flex flex-col ${
            isMobile ? 'inset-0' : 'bottom-6 right-6 w-[400px] h-[600px] max-h-[85vh] rounded-xl'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#303030]">
            <h3 className="font-bold">Assistant</h3>
            <div className="flex items-center gap-3">
              <button onClick={handleClear} disabled={messages.length === 0} className="text-gray-400 hover:text-white disabled:opacity-30" aria-label="Clear chat" title="Clear chat">
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500">
                Log transactions, todos and habits. Try &quot;credit 250 alfahm food&quot;, &quot;todo renew passport friday&quot; or &quot;did gym today&quot;.
              </p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-white text-black' : 'bg-[#1c1c1c]'}`}>
                  {m.text}
                </div>
                {m.actions && m.actions.length > 0 && (
                  <div className="w-full space-y-2">
                    {m.actions.map(a => (
                      <ActionCard key={a.id} item={a} onApprove={() => void approve(a)} onDismiss={() => dismiss(a.id)} />
                    ))}
                    {m.actions.filter(a => a.action.kind !== 'clarify' && (a.status === 'pending' || a.status === 'error')).length > 1 && (
                      <button
                        onClick={() => void approveAll(m.actions!)}
                        className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold rounded-lg py-2 text-sm hover:bg-gray-200"
                      >
                        <CheckCheck className="w-4 h-4" /> Approve all
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</div>
            )}
            <div ref={bottomRef} />
          </div>

          {notice && <p className="px-4 pb-1 text-xs text-red-400">{notice}</p>}
          {voice.transcribing && <p className="px-4 pb-1 text-xs text-gray-400">Transcribing…</p>}

          <div className="flex items-end gap-2 p-3 border-t border-[#303030]">
            {voice.supported && (
              <button
                onClick={voice.recording ? voice.stop : () => void voice.start()}
                disabled={voice.transcribing}
                aria-label={voice.recording ? 'Stop recording' : 'Record voice'}
                className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center border border-[#303030] ${voice.recording ? 'bg-red-600 text-white animate-pulse' : 'text-gray-300 hover:text-white'} disabled:opacity-40`}
              >
                {voice.recording ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
              </button>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
              rows={1}
              placeholder={pendingItems.length > 0 ? `Press Enter to approve the next one (${pendingItems.length} waiting), or type a new message` : 'credit 250 alfahm food'}
              className="flex-1 resize-none overflow-y-auto bg-[#0A0A0A] border border-[#303030] focus:border-white rounded-lg px-3 py-2 text-sm leading-5 text-white outline-none"
            />
            <button
              onClick={submit}
              disabled={!input.trim() || sending}
              aria-label="Send"
              className="w-10 h-10 shrink-0 rounded-lg bg-white text-black flex items-center justify-center hover:bg-gray-200 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default ChatWidget
