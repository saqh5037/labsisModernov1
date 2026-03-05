import { useState, useEffect, useRef, useCallback } from 'react'

export function useSSE({ onNotification, onComment } = {}) {
  const [connected, setConnected] = useState(false)
  const esRef = useRef(null)
  const retriesRef = useRef(0)
  const callbacksRef = useRef({ onNotification, onComment })
  callbacksRef.current = { onNotification, onComment }

  const connect = useCallback(() => {
    if (esRef.current) return

    const url = '/api/qa/sse/stream'
    const es = new EventSource(url, { withCredentials: true })
    esRef.current = es

    es.onopen = () => {
      setConnected(true)
      retriesRef.current = 0
    }

    es.addEventListener('notification', (e) => {
      try {
        const data = JSON.parse(e.data)
        callbacksRef.current.onNotification?.(data)
      } catch { /* ignore parse errors */ }
    })

    es.addEventListener('comment', (e) => {
      try {
        const data = JSON.parse(e.data)
        callbacksRef.current.onComment?.(data)
      } catch { /* ignore */ }
    })

    es.onerror = () => {
      es.close()
      esRef.current = null
      setConnected(false)

      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const retries = retriesRef.current++
      if (retries < 10) {
        const delay = Math.min(1000 * Math.pow(2, retries), 30000)
        setTimeout(connect, delay)
      }
      // After 10 retries, stop trying (fallback to polling in the bell)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [connect])

  return { connected }
}
