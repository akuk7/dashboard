import { useEffect, useRef } from 'react'
import { RECORD_CREATED_EVENT } from './commit'

export type RecordKind = 'transaction' | 'todo' | 'habit_log'

// Runs `onCreated` whenever the chat assistant saves a record of one of the given kinds, so the
// view that owns that data can reload itself.
export function useRecordCreated(kinds: RecordKind[], onCreated: () => void) {
  const callbackRef = useRef(onCreated)
  const kindsRef = useRef(kinds)
  useEffect(() => {
    callbackRef.current = onCreated
    kindsRef.current = kinds
  })

  useEffect(() => {
    const handler = (e: Event) => {
      const kind = (e as CustomEvent<{ kind: RecordKind }>).detail?.kind
      if (kindsRef.current.includes(kind)) callbackRef.current()
    }
    window.addEventListener(RECORD_CREATED_EVENT, handler)
    return () => window.removeEventListener(RECORD_CREATED_EVENT, handler)
  }, [])
}
