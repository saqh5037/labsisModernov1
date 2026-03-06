import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * BarcodeScanner — High-precision camera barcode scanner.
 * Uses native BarcodeDetector API (Chrome/Android) for best accuracy,
 * falls back to html5-qrcode library if native API not available.
 * Features: HD resolution, continuous autofocus, torch, anti-duplicate,
 * laser overlay, vibration + beep feedback.
 */
export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const lastScanRef = useRef({ code: '', time: 0 })
  const mountedRef = useRef(true)

  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [lastCode, setLastCode] = useState('')
  const [scanFlash, setScanFlash] = useState(false)
  const [useNative, setUseNative] = useState(false)

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
    // Anti-duplicate: ignore same code within 1.5s
    if (code === lastScanRef.current.code && now - lastScanRef.current.time < 1500) return
    lastScanRef.current = { code, time: now }

    // Feedback
    if (navigator.vibrate) navigator.vibrate(200)
    playBeep()
    setLastCode(code)
    setScanFlash(true)
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

  useEffect(() => {
    mountedRef.current = true
    let detector = null
    let html5QrInstance = null

    const startNativeScanner = async () => {
      try {
        // Check native BarcodeDetector support
        const hasNative = 'BarcodeDetector' in window
        if (hasNative) {
          const supported = await window.BarcodeDetector.getSupportedFormats()
          if (supported.includes('code_128') || supported.includes('ean_13')) {
            detector = new window.BarcodeDetector({
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

        if (detector) {
          // Native BarcodeDetector — scan loop via requestAnimationFrame
          let frameCount = 0
          const scanLoop = async () => {
            if (!mountedRef.current) return
            frameCount++
            // Scan every 3rd frame (~20fps on 60fps display = ~6-7 scans/sec)
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
        } else {
          // Fallback: html5-qrcode with video element
          const { Html5Qrcode } = await import('html5-qrcode')
          const scannerId = 'barcode-fallback-region'
          // Create a hidden div for html5-qrcode
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
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {cameraReady && <div className="barcode-scanner-laser" />}
          {scanFlash && <div className="barcode-scanner-flash" />}
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

        <div className="barcode-scanner-hint">
          Alinea el codigo de barras con la linea roja
        </div>
      </div>
    </div>
  )
}
