import { useRef, useState, useCallback } from 'react'

// Tiny notification ding as base64 WAV (~1KB)
// A short 200ms sine wave at 880Hz (A5 note)
function generateDing() {
  const sampleRate = 8000
  const duration = 0.2
  const samples = Math.floor(sampleRate * duration)
  const buffer = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    const envelope = Math.exp(-t * 12) // Fast decay
    buffer[i] = Math.sin(2 * Math.PI * 880 * t) * envelope * 0.5
  }
  return buffer
}

function playBuffer(buffer) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = ctx.createBuffer(1, buffer.length, 8000)
    audioBuffer.getChannelData(0).set(buffer)
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    source.start()
    source.onended = () => ctx.close()
  } catch { /* AudioContext not available */ }
}

export function useNotificationSound() {
  const dingBuffer = useRef(null)
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  const playDing = useCallback(() => {
    if (!dingBuffer.current) dingBuffer.current = generateDing()
    playBuffer(dingBuffer.current)
    // Vibrate on mobile (Chrome Android)
    if (navigator.vibrate) navigator.vibrate(200)
  }, [])

  const showBrowserNotif = useCallback((title, body, onClick) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const n = new Notification(title, { body, icon: '/favicon.ico' })
    if (onClick) n.onclick = () => { onClick(); n.close() }
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  return { playDing, showBrowserNotif, requestPermission, permission }
}
