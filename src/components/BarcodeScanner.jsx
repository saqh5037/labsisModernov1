import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * BarcodeScanner — Dual-mode camera barcode scanner.
 * Mode 1: Continuous video scanning (native BarcodeDetector on Android)
 * Mode 2: Photo capture + analyze (works on ALL browsers including iOS)
 * Features: HD resolution, torch, anti-duplicate, laser overlay, vibration + beep.
 */
export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const detectorRef = useRef(null)
  const lastScanRef = useRef({ code: '', time: 0 })
  const mountedRef = useRef(true)

  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [lastCode, setLastCode] = useState('')
  const [scanFlash, setScanFlash] = useState(false)
  const [useNative, setUseNative] = useState(false)
  // 'idle' = live video, 'analyzing' = processing capture, 'failed' = no barcode found
  const [captureState, setCaptureState] = useState('idle')

  // Beep sound on successful scan (1200Hz, 150ms)
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.value = 1200
      gain.gain.value = 0.3
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.stop(ctx.currentTime + 0.15)
    } catch { /* audio not available */ }
  }, [])

  const handleDetection = useCallback((code) => {
    if (!mountedRef.current) return
    const now = Date.now()
    if (code === lastScanRef.current.code && now - lastScanRef.current.time < 1500) return
    lastScanRef.current = { code, time: now }

    if (navigator.vibrate) navigator.vibrate(200)
    playBeep()
    setLastCode(code)
    setScanFlash(true)
    setCaptureState('idle')
    setTimeout(() => setScanFlash(false), 400)

    onScan(code)
  }, [onScan, playBeep])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // Resume continuous scanning
  const resumeScanning = useCallback(() => {
    const video = videoRef.current
    const detector = detectorRef.current
    if (!video || !detector || !mountedRef.current) return

    // Hide canvas, show video
    const canvas = canvasRef.current
    if (canvas) canvas.style.display = 'none'

    let frameCount = 0
    const scanLoop = async () => {
      if (!mountedRef.current) return
      frameCount++
      if (frameCount % 3 === 0 && video.readyState === video.HAVE_ENOUGH_DATA) {
        try {
          const barcodes = await detector.detect(video)
          if (barcodes.length > 0) {
            handleDetection(barcodes[0].rawValue)
          }
        } catch { /* detection error, continue */ }
      }
      rafRef.current = requestAnimationFrame(scanLoop)
    }
    rafRef.current = requestAnimationFrame(scanLoop)
  }, [handleDetection])

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    try {
      if (!streamRef.current) return
      const track = streamRef.current.getVideoTracks()[0]
      if (!track) return
      const newVal = !torchOn
      await track.applyConstraints({ advanced: [{ torch: newVal }] })
      setTorchOn(newVal)
    } catch { /* torch failed */ }
  }, [torchOn])

  // === PHOTO CAPTURE + ANALYZE ===
  const captureAndAnalyze = useCallback(async () => {
    if (!streamRef.current || !videoRef.current) return

    // 1. Pause continuous scanning
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    setCaptureState('analyzing')

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    // 2. Get real stream resolution (higher than video element display size)
    const track = streamRef.current.getVideoTracks()[0]
    const settings = track?.getSettings?.() || {}
    const w = settings.width || video.videoWidth || 1280
    const h = settings.height || video.videoHeight || 720

    // 3. Draw frame to canvas at full resolution
    canvas.width = w
    canvas.height = h
    const ctx2d = canvas.getContext('2d')
    ctx2d.drawImage(video, 0, 0, w, h)

    // Show canvas (frozen frame) over video
    canvas.style.display = 'block'

    // 4. Try detection
    let detected = false

    // 4a. Try native BarcodeDetector on canvas
    if (detectorRef.current) {
      try {
        const barcodes = await detectorRef.current.detect(canvas)
        if (barcodes.length > 0) {
          handleDetection(barcodes[0].rawValue)
          detected = true
        }
      } catch { /* native detection failed */ }
    }

    // 4b. Fallback: html5-qrcode scanFile (works on ALL browsers including iOS Safari)
    if (!detected) {
      try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        if (blob) {
          const file = new File([blob], 'capture.png', { type: 'image/png' })
          const { Html5Qrcode } = await import('html5-qrcode')
          const code = await Html5Qrcode.scanFile(file, false)
          if (code) {
            handleDetection(code)
            detected = true
          }
        }
      } catch { /* scanFile failed or no barcode found */ }
    }

    // 5. If nothing detected, show retry
    if (!detected && mountedRef.current) {
      setCaptureState('failed')
    }
  }, [handleDetection])

  // Retry: go back to live video
  const retryCapture = useCallback(() => {
    setCaptureState('idle')
    const canvas = canvasRef.current
    if (canvas) canvas.style.display = 'none'

    // Resume continuous scanning if native detector available
    if (detectorRef.current) {
      resumeScanning()
    }
  }, [resumeScanning])

  useEffect(() => {
    mountedRef.current = true
    let html5QrInstance = null

    const startNativeScanner = async () => {
      try {
        // Check native BarcodeDetector support
        const hasNative = 'BarcodeDetector' in window
        if (hasNative) {
          const supported = await window.BarcodeDetector.getSupportedFormats()
          if (supported.includes('code_128') || supported.includes('ean_13')) {
            detectorRef.current = new window.BarcodeDetector({
              formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'itf', 'codabar', 'qr_code']
            })
            setUseNative(true)
          }
        }

        // Get camera stream with HD constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { min: 1280, ideal: 1920 },
            height: { min: 720, ideal: 1080 },
            focusMode: 'continuous',
            focusDistance: 0,
          },
          audio: false,
        })

        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()

        setCameraReady(true)

        // Check torch support
        const track = stream.getVideoTracks()[0]
        const caps = track?.getCapabilities?.()
        if (caps?.torch) setTorchSupported(true)

        if (detectorRef.current) {
          // Native BarcodeDetector — continuous scan loop
          let frameCount = 0
          const scanLoop = async () => {
            if (!mountedRef.current) return
            frameCount++
            if (frameCount % 3 === 0 && video.readyState === video.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await detectorRef.current.detect(video)
                if (barcodes.length > 0) {
                  handleDetection(barcodes[0].rawValue)
                }
              } catch { /* detection error, continue */ }
            }
            rafRef.current = requestAnimationFrame(scanLoop)
          }
          rafRef.current = requestAnimationFrame(scanLoop)
        } else {
          // Fallback: html5-qrcode continuous scanning
          const { Html5Qrcode } = await import('html5-qrcode')
          const scannerId = 'barcode-fallback-region'
          let div = document.getElementById(scannerId)
          if (!div) {
            div = document.createElement('div')
            div.id = scannerId
            div.style.display = 'none'
            document.body.appendChild(div)
          }
          html5QrInstance = new Html5Qrcode(scannerId)
          await html5QrInstance.start(
            { facingMode: 'environment' },
            { fps: 15, qrbox: { width: 320, height: 100 },
              formatsToSupport: [2, 1, 4, 5, 9, 10, 0] },
            (text) => handleDetection(text),
            () => {}
          )
        }
      } catch (err) {
        if (!mountedRef.current) return
        const msg = err.toString()
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setError('Permiso de cámara denegado. Habilítalo en la configuración del navegador.')
        } else if (msg.includes('secure context') || msg.includes('https')) {
          setError('La cámara requiere HTTPS. Usa la URL https://...')
        } else {
          setError(`Error al iniciar cámara: ${err.message || err}`)
        }
      }
    }

    startNativeScanner()

    return () => {
      mountedRef.current = false
      stopCamera()
      detectorRef.current = null
      if (html5QrInstance) {
        try {
          const state = html5QrInstance.getState()
          if (state === 2 || state === 3) html5QrInstance.stop()
          html5QrInstance.clear()
        } catch {}
      }
    }
  }, [handleDetection, stopCamera])

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <div className="barcode-scanner-overlay">
      <div className="barcode-scanner-modal">
        <div className="barcode-scanner-header">
          <span>
            Escanear con cámara
            {useNative && <span className="barcode-scanner-badge">HD</span>}
          </span>
          <div className="barcode-scanner-header-actions">
            {torchSupported && (
              <button
                type="button"
                className={`barcode-scanner-torch ${torchOn ? 'active' : ''}`}
                onClick={toggleTorch}
                title={torchOn ? 'Apagar linterna' : 'Encender linterna'}
              >
                <svg viewBox="0 0 24 24" fill={torchOn ? '#fbbf24' : 'none'} stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </button>
            )}
            <button type="button" className="barcode-scanner-close" onClick={handleClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="barcode-scanner-viewport-wrap">
          <video
            ref={videoRef}
            className="barcode-scanner-video"
            playsInline
            muted
            autoPlay
            style={{ display: captureState !== 'idle' ? 'none' : undefined }}
          />
          <canvas
            ref={canvasRef}
            className="barcode-scanner-video"
            style={{ display: captureState !== 'idle' ? 'block' : 'none' }}
          />
          {cameraReady && captureState === 'idle' && <div className="barcode-scanner-laser" />}
          {scanFlash && <div className="barcode-scanner-flash" />}

          {/* Analyzing overlay */}
          {captureState === 'analyzing' && (
            <div className="barcode-scanner-capture-overlay">
              <div className="barcode-scanner-capture-spinner" />
              <span>Analizando foto...</span>
            </div>
          )}

          {/* Failed overlay */}
          {captureState === 'failed' && (
            <div className="barcode-scanner-capture-overlay failed">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>No se detectó código</span>
              <button type="button" className="barcode-scanner-retry-btn" onClick={retryCapture}>
                Reintentar
              </button>
            </div>
          )}
        </div>

        {!cameraReady && !error && (
          <div className="barcode-scanner-loading">Iniciando cámara HD...</div>
        )}

        {error && (
          <div className="barcode-scanner-error">{error}</div>
        )}

        {lastCode && (
          <div className="barcode-scanner-last-code">
            Ultimo: <strong>{lastCode}</strong>
          </div>
        )}

        {/* Capture button — always visible when camera is ready */}
        {cameraReady && captureState === 'idle' && (
          <button type="button" className="barcode-scanner-capture-btn" onClick={captureAndAnalyze}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Capturar foto</span>
          </button>
        )}

        <div className="barcode-scanner-hint">
          {captureState === 'idle'
            ? 'Enfoca el código y toca Capturar foto'
            : captureState === 'failed'
            ? 'Acerca más la cámara al código de barras'
            : ''}
        </div>
      </div>
    </div>
  )
}
