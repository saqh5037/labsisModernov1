import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTrazabilidadCheckpoints, scanBarcode, getMuestraLogs, getOrdenMuestras } from '../services/api'
import { useNotificationSound } from '../hooks/useNotificationSound'
import BarcodeScanner from '../components/BarcodeScanner'

const STATUS_COLORS = {
  REC: '#22c55e', TRA: '#f59e0b', ACM: '#3b82f6', DIS: '#8b5cf6',
  PRO: '#06b6d4', ALM: '#64748b', NOE: '#ef4444', DES: '#dc2626',
}

export default function TrazabilidadScanPage() {
  const { checkpointId } = useParams()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const { playDing } = useNotificationSound()

  const [checkpoint, setCheckpoint] = useState(null)
  const [barcode, setBarcode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState(null) // { muestra, statusAnterior, statusNuevo, logs }
  const [error, setError] = useState('')
  const [scanHistory, setScanHistory] = useState([]) // recent scans in this session
  const [loading, setLoading] = useState(true)
  const [otMuestras, setOtMuestras] = useState([])
  const [showOtMuestras, setShowOtMuestras] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'ok'|'error', text }
  const [showCamera, setShowCamera] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)

  // Detect if device has a camera
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        setHasCamera(devices.some(d => d.kind === 'videoinput'))
      }).catch(() => setHasCamera(false))
    }
  }, [])

  // Error beep (300Hz grave)
  const playErrorBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const sampleRate = 8000
      const duration = 0.3
      const samples = Math.floor(sampleRate * duration)
      const buffer = ctx.createBuffer(1, samples, sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate
        data[i] = Math.sin(2 * Math.PI * 300 * t) * Math.exp(-t * 6) * 0.5
      }
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start()
      source.onended = () => ctx.close()
    } catch { /* ignore */ }
  }, [])

  // Load checkpoint info
  useEffect(() => {
    getTrazabilidadCheckpoints().then(list => {
      const cp = list.find(c => c.id === parseInt(checkpointId))
      if (!cp) {
        setError('Checkpoint no encontrado')
        setLoading(false)
        return
      }
      setCheckpoint(cp)
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }).catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [checkpointId])

  // Perform scan
  const handleScan = useCallback(async () => {
    const code = barcode.trim()
    if (!code || scanning) return

    setScanning(true)
    setError('')
    try {
      const result = await scanBarcode(parseInt(checkpointId), code)
      setLastScan(result)
      setScanHistory(prev => [{
        barcode: code,
        muestra: result.muestra,
        statusAnterior: result.statusAnterior,
        statusNuevo: result.statusNuevo,
        time: new Date(),
      }, ...prev].slice(0, 50))
      setBarcode('')
      playDing()
      setFeedback({ type: 'ok', text: `${result.statusAnterior.codigo} → ${result.statusNuevo.codigo}` })
      setTimeout(() => setFeedback(null), 2000)
      // Load OT muestras
      if (result.muestra?.orden_id) {
        getOrdenMuestras(result.muestra.orden_id).then(setOtMuestras).catch(() => setOtMuestras([]))
      }
    } catch (err) {
      setError(err.message)
      playErrorBeep()
      setFeedback({ type: 'error', text: 'Error' })
      setTimeout(() => setFeedback(null), 2000)
    } finally {
      setScanning(false)
      inputRef.current?.focus()
    }
  }, [barcode, checkpointId, scanning, playDing, playErrorBeep])

  // Camera scan: auto-submit when barcode detected
  const handleCameraScan = useCallback((code) => {
    if (!code || scanning) return
    setShowCamera(false)
    setBarcode(code)
    // Auto-submit after a tick so state updates
    setTimeout(async () => {
      setScanning(true)
      setError('')
      try {
        const result = await scanBarcode(parseInt(checkpointId), code)
        setLastScan(result)
        setScanHistory(prev => [{
          barcode: code,
          muestra: result.muestra,
          statusAnterior: result.statusAnterior,
          statusNuevo: result.statusNuevo,
          time: new Date(),
        }, ...prev].slice(0, 50))
        setBarcode('')
        playDing()
        setFeedback({ type: 'ok', text: `${result.statusAnterior.codigo} → ${result.statusNuevo.codigo}` })
        setTimeout(() => setFeedback(null), 2000)
        if (result.muestra?.orden_id) {
          getOrdenMuestras(result.muestra.orden_id).then(setOtMuestras).catch(() => setOtMuestras([]))
        }
      } catch (err) {
        setError(err.message)
        playErrorBeep()
        setFeedback({ type: 'error', text: 'Error' })
        setTimeout(() => setFeedback(null), 2000)
      } finally {
        setScanning(false)
        inputRef.current?.focus()
      }
    }, 50)
  }, [scanning, checkpointId, playDing, playErrorBeep])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleScan()
    }
  }

  if (loading) return <div className="traz-loading">Cargando checkpoint...</div>
  if (!checkpoint) return (
    <div className="traz-empty">
      <p>{error || 'Checkpoint no encontrado'}</p>
      <button className="traz-btn" onClick={() => navigate('/trazabilidad')}>Volver</button>
    </div>
  )

  return (
    <div className="scan-page">
      {/* Audio feedback toast */}
      {feedback && (
        <div className={`scan-feedback scan-feedback--${feedback.type}`}>{feedback.text}</div>
      )}
      {/* Camera scanner overlay */}
      {showCamera && (
        <BarcodeScanner
          onScan={handleCameraScan}
          onClose={() => setShowCamera(false)}
        />
      )}
      {/* Header */}
      <div className="scan-header">
        <button className="scan-back" onClick={() => navigate('/trazabilidad')} title="Volver">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="scan-header__info">
          <h1>{checkpoint.descripcion}</h1>
          <div className="scan-header__meta">
            <span
              className="scan-header__status-dot"
              style={{ background: STATUS_COLORS[checkpoint.status_codigo] || '#94a3b8' }}
            />
            <span>Asigna: <strong>{checkpoint.status_nombre}</strong> ({checkpoint.status_codigo})</span>
            {checkpoint.entrada_lab && <span className="scan-header__badge">Entrada Lab</span>}
            {checkpoint.muestra_recibida && <span className="scan-header__badge">Marca Recibida</span>}
          </div>
        </div>
        <div className="scan-header__count">
          <span className="scan-header__count-num">{scanHistory.length}</span>
          <span className="scan-header__count-label">escaneos</span>
        </div>
      </div>

      {/* Scanner input */}
      <div className="scan-input-area">
        <div className="scan-input-wrap">
          <svg className="scan-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="scan-input"
            placeholder="Escanear código de barras..."
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={scanning}
            autoFocus
          />
          <button className="scan-btn" onClick={handleScan} disabled={!barcode.trim() || scanning}>
            {scanning ? 'Procesando...' : 'Ingresar'}
          </button>
          {hasCamera && (
            <button
              type="button"
              className="scan-camera-btn"
              onClick={() => setShowCamera(true)}
              title="Escanear con cámara"
              disabled={scanning}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          )}
        </div>
        {error && <div className="scan-error">{error}</div>}
        {lastScan?.ok && (
          <div className="scan-success">
            Muestra <strong>{lastScan.muestra.barcode}</strong> —
            <span style={{ color: STATUS_COLORS[lastScan.statusAnterior.codigo] }}> {lastScan.statusAnterior.codigo}</span>
            {' → '}
            <span style={{ color: STATUS_COLORS[lastScan.statusNuevo.codigo] }}>{lastScan.statusNuevo.codigo}</span>
          </div>
        )}
      </div>

      {/* Content: last scanned sample + log */}
      <div className="scan-content">
        {/* Left: last sample info */}
        <div className="scan-panel">
          <h3 className="scan-panel__title">Última Muestra</h3>
          {lastScan?.muestra ? (
            <>
              <div className="scan-sample">
                <div className="scan-sample__row">
                  <span className="scan-sample__label">Barcode</span>
                  <span className="scan-sample__value">{lastScan.muestra.barcode}</span>
                </div>
                <div className="scan-sample__row">
                  <span className="scan-sample__label">OT</span>
                  <span className="scan-sample__value">{lastScan.muestra.orden_numero}</span>
                </div>
                <div className="scan-sample__row">
                  <span className="scan-sample__label">Status</span>
                  <span className="scan-sample__value">
                    <span className="scan-dot" style={{ background: STATUS_COLORS[lastScan.muestra.status_codigo] || '#94a3b8' }} />
                    {lastScan.muestra.status_nombre} ({lastScan.muestra.status_codigo})
                  </span>
                </div>
                <div className="scan-sample__row">
                  <span className="scan-sample__label">Tipo Muestra</span>
                  <span className="scan-sample__value">{lastScan.muestra.tipo_muestra || '—'}</span>
                </div>
                <div className="scan-sample__row">
                  <span className="scan-sample__label">Contenedor</span>
                  <span className="scan-sample__value">
                    {lastScan.muestra.contenedor_color && (
                      <span className="scan-container-dot" style={{ background: lastScan.muestra.contenedor_color }} />
                    )}
                    {lastScan.muestra.contenedor || '—'} {lastScan.muestra.contenedor_abrev ? `(${lastScan.muestra.contenedor_abrev})` : ''}
                  </span>
                </div>
                {(lastScan.muestra.paciente_nombre || lastScan.muestra.paciente_apellido) && (
                  <div className="scan-sample__row">
                    <span className="scan-sample__label">Paciente</span>
                    <span className="scan-sample__value">
                      {lastScan.muestra.paciente_apellido} {lastScan.muestra.paciente_nombre}
                    </span>
                  </div>
                )}
                {lastScan.muestra.ci_paciente && (
                  <div className="scan-sample__row">
                    <span className="scan-sample__label">Cedula</span>
                    <span className="scan-sample__value">{lastScan.muestra.ci_paciente}</span>
                  </div>
                )}
                {lastScan.muestra.fecha_muestra_recibida && (
                  <div className="scan-sample__row">
                    <span className="scan-sample__label">Recibida</span>
                    <span className="scan-sample__value">
                      {new Date(lastScan.muestra.fecha_muestra_recibida).toLocaleString('es-MX')}
                    </span>
                  </div>
                )}
              </div>
              {/* Panel Muestras OT */}
              {otMuestras.length > 0 && (
                <div className="scan-ot-muestras">
                  <button
                    type="button"
                    className="scan-ot-muestras__toggle"
                    onClick={() => setShowOtMuestras(v => !v)}
                  >
                    {showOtMuestras ? 'Ocultar' : 'Ver'} muestras de la OT ({otMuestras.length})
                  </button>
                  {showOtMuestras && (
                    <div className="scan-ot-grid">
                      {otMuestras.map(m => (
                        <div
                          key={m.id}
                          className={`scan-ot-card${m.barcode === lastScan.muestra.barcode ? ' scan-ot-card--current' : ''}`}
                        >
                          <div className="scan-ot-card__barcode">{m.barcode}</div>
                          <div className="scan-ot-card__meta">
                            <span className="scan-dot" style={{ background: STATUS_COLORS[m.status_codigo] || '#94a3b8' }} />
                            {m.status_codigo} — {m.tipo_muestra || '?'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="scan-panel__empty">Escanee un código de barras para ver los datos de la muestra</p>
          )}
        </div>

        {/* Right: scan history (this session) */}
        <div className="scan-panel">
          <h3 className="scan-panel__title">Historial de Sesión</h3>
          {scanHistory.length === 0 ? (
            <p className="scan-panel__empty">Sin escaneos aún</p>
          ) : (
            <div className="scan-log-table-wrap">
              <table className="scan-log-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Barcode</th>
                    <th>OT</th>
                    <th>Transición</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {scanHistory.map((s, i) => (
                    <tr key={i}>
                      <td>{scanHistory.length - i}</td>
                      <td className="scan-log-barcode">{s.barcode}</td>
                      <td>{s.muestra?.orden_numero || '—'}</td>
                      <td>
                        <span style={{ color: STATUS_COLORS[s.statusAnterior?.codigo] }}>{s.statusAnterior?.codigo || '—'}</span>
                        {' → '}
                        <span style={{ color: STATUS_COLORS[s.statusNuevo?.codigo] }}>{s.statusNuevo?.codigo || '—'}</span>
                      </td>
                      <td>{s.time.toLocaleTimeString('es-MX')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: audit log from DB for last scanned sample */}
      {lastScan?.logs && lastScan.logs.length > 0 && (
        <div className="scan-audit">
          <h3 className="scan-panel__title">Audit Trail — {lastScan.muestra.barcode}</h3>
          <div className="scan-log-table-wrap">
            <table className="scan-log-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Checkpoint</th>
                  <th>Acción</th>
                  <th>Status</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {lastScan.logs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.realizado).toLocaleString('es-MX')}</td>
                    <td>{log.checkpoint || '—'}</td>
                    <td>{log.accion}</td>
                    <td>
                      <span className="scan-dot" style={{ background: STATUS_COLORS[log.status_codigo] || '#94a3b8' }} />
                      {log.status_nombre} ({log.status_codigo})
                    </td>
                    <td>{log.usuario || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
