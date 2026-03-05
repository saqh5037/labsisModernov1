import { useState, useRef } from 'react'

function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  // Detect iOS/Safari — prefer mp4 there, webm everywhere else
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  const types = (isIOS || isSafari)
    ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
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
  const streamRef = useRef(null)

  const showError = (msg) => {
    setErr(msg)
    setTimeout(() => setErr(null), 5000)
  }

  const startRecording = async () => {
    setErr(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = getSupportedMimeType()
      const opts = mimeType ? { mimeType } : {}

      let recorder
      try {
        recorder = new MediaRecorder(stream, opts)
      } catch {
        // Fallback: let browser pick format
        recorder = new MediaRecorder(stream)
      }
      chunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.onerror = (e) => {
        console.error('MediaRecorder error:', e)
        cleanup()
        showError('Error al grabar')
      }

      recorder.onstop = async () => {
        cleanup()
        setTranscribing(true)

        if (chunks.current.length === 0) {
          showError('No se grabó audio')
          setTranscribing(false)
          return
        }

        const actualType = recorder.mimeType || mimeType || 'audio/webm'
        const ext = actualType.includes('mp4') ? 'recording.mp4'
          : actualType.includes('ogg') ? 'recording.ogg'
          : 'recording.webm'
        const blob = new Blob(chunks.current, { type: actualType })

        if (blob.size < 100) {
          showError('Grabación muy corta')
          setTranscribing(false)
          return
        }

        const formData = new FormData()
        formData.append('audio', blob, ext)
        console.log('[VoiceRecorder] sending:', { ext, type: actualType, blobSize: blob.size, chunks: chunks.current.length })

        try {
          const res = await fetch(`${apiBase}/qa/transcribe`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })
          const rawText = await res.text()
          console.log('[VoiceRecorder] response:', res.status, rawText.substring(0, 200))
          let data
          try { data = JSON.parse(rawText) } catch { data = {} }
          if (!res.ok) {
            throw new Error(data.error || `Error ${res.status}`)
          }
          if (data.text) {
            onTranscription(data.text)
          } else {
            showError('No se detectó texto')
          }
        } catch (e) {
          console.error('[VoiceRecorder] error:', e)
          showError(e.message || 'Error de transcripción')
        }
        setTranscribing(false)
      }

      // Start with timeslice to ensure data flows periodically
      recorder.start(1000)
      mediaRecorder.current = recorder
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
    } catch (e) {
      console.error('getUserMedia error:', e)
      showError(e.name === 'NotAllowedError' ? 'Permiso de micrófono denegado' : 'Micrófono no disponible')
    }
  }

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    clearInterval(timerRef.current)
    setRecording(false)
  }

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
    } else {
      cleanup()
    }
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
          padding: '6px 10px', borderRadius: 6, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
          animation: 'fadeUp 200ms ease-out forwards',
          zIndex: 100,
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
