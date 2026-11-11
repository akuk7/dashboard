import { useCallback, useRef, useState } from 'react'
import supabase from '../supabase'

const MAX_RECORD_MS = 60_000

// Records mic audio and sends it to the chat-transcribe edge function.
export function useVoiceRecorder(onTranscript: (text: string) => void, onError: (msg: string) => void) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

  const stop = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [])

  const start = useCallback(async () => {
    if (!supported) return onError('Voice recording is not supported in this browser.')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setRecording(false)
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size === 0) return
        setTranscribing(true)
        try {
          const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'
          const form = new FormData()
          form.append('audio', blob, `speech.${ext}`)
          const { data, error } = await supabase.functions.invoke('chat-transcribe', { body: form })
          if (error) throw error
          const text = String(data?.text ?? '').trim()
          if (text) onTranscript(text)
          else onError('Could not hear anything, try again.')
        } catch (e) {
          console.error('Transcription failed', e)
          onError('Transcription failed.')
        } finally {
          setTranscribing(false)
        }
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
      timeoutRef.current = window.setTimeout(stop, MAX_RECORD_MS)
    } catch (e) {
      console.error('Mic error', e)
      onError('Microphone access was denied.')
    }
  }, [supported, onTranscript, onError, stop])

  return { supported, recording, transcribing, start, stop }
}
