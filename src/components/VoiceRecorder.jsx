import { useState, useRef } from 'react'

function getSupportedMimeType() {
  // iOS Safari doesn't support audio/webm — try mp4 first, then webm
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return '' // Let browser pick default
}

export default function VoiceRecorder({ onTranscription, apiBase = '/api' }) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [err, setErr] = useState(null)
  const mediaRecorder = useRef(null)
  const chunks = useRef([])
  const timerRef = useRef(null)

  const startRecording = async () => {
    setErr(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const opts = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, opts)
      chunks.current = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        clearInterval(timerRef.current)
        setRecording(false)
        setTranscribing(true)

        const actualType = recorder.mimeType || mimeType || 'audio/webm'
        const ext = actualType.includes('mp4') ? 'recording.mp4' : 'recording.webm'
        const blob = new Blob(chunks.current, { type: actualType })
        const formData = new FormData()
        formData.append('audio', blob, ext)

        try {
          const res = await fetch(`${apiBase}/qa/transcribe`, { method: 'POST', body: formData })
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData.error || 'Error de transcripción')
          }
          const data = await res.json()
          if (data.text) onTranscription(data.text)
        } catch (e) {
          setErr(e.message || 'Error')
          setTimeout(() => setErr(null), 3000)
        }
        setTranscribing(false)
      }

      recorder.start()
      mediaRecorder.current = recorder
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
    } catch (e) {
      setErr('Micrófono no disponible')
      setTimeout(() => setErr(null), 3000)
    }
  }

  const stopRecording = () => {
    mediaRecorder.current?.stop()
  }

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (transcribing) {
    return (
      <button disabled style={{
        ...btnStyle,
        background: 'rgba(139,92,246,0.06)', border: '2px solid rgba(139,92,246,0.2)', color: '#8b5cf6',
      }}>
        <div style={{ width: 14, height: 14, border: '2px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 10, fontWeight: 600 }}>Transcribiendo</span>
      </button>
    )
  }

  if (recording) {
    return (
      <button onClick={stopRecording} style={{
        ...btnStyle,
        background: 'rgba(220,38,38,0.06)', border: '2px solid rgba(220,38,38,0.3)', color: '#dc2626',
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%', background: '#dc2626',
          animation: 'pulse 1s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{fmtTime(elapsed)}</span>
        <span style={{ fontSize: 9, fontWeight: 600 }}>Detener</span>
      </button>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={startRecording} title="Grabar nota de voz" style={{
        ...btnStyle,
        background: '#f8fafc', border: '2px solid #e2e8f0', color: '#64748b',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <span style={{ fontSize: 10, fontWeight: 600 }}>Voz</span>
      </button>
      {err && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
          background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 600,
          padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap',
          animation: 'fadeUp 200ms ease-out forwards',
        }}>{err}</div>
      )}
    </div>
  )
}

const btnStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
  padding: '10px 10px', borderRadius: 10, cursor: 'pointer',
  minHeight: 56, minWidth: 64, transition: 'all 200ms',
}
