import { useCallback, useEffect, useState } from 'react'
import supabase from './supabase'

// Google redirects back to the app root; the code is exchanged server-side (gcal-auth) so the
// client secret and refresh token never reach the browser.
const REDIRECT_URI = `${window.location.origin}/`
const PENDING_KEY = 'gcal_connecting'

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('gcal-auth', { body })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data as T
}

export async function startGoogleCalendarConnect(): Promise<void> {
  const { url } = await call<{ url: string }>({ action: 'url', redirectUri: REDIRECT_URI })
  sessionStorage.setItem(PENDING_KEY, '1')
  window.location.href = url
}

// Run once while logged in: finishes the OAuth round-trip if we just came back from Google.
export async function completeGoogleCalendarConnect(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (!code || !sessionStorage.getItem(PENDING_KEY)) return false
  sessionStorage.removeItem(PENDING_KEY)
  window.history.replaceState({}, '', window.location.pathname)
  await call({ action: 'exchange', code, redirectUri: REDIRECT_URI })
  return true
}

export function useGoogleCalendar() {
  const [connected, setConnected] = useState<boolean | null>(null)

  const refresh = useCallback(async () => {
    try {
      setConnected((await call<{ connected: boolean }>({ action: 'status' })).connected)
    } catch {
      setConnected(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const disconnect = async () => {
    await call({ action: 'disconnect' })
    setConnected(false)
  }

  return { connected, refresh, disconnect }
}
