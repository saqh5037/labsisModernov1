import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * BarcodeScanner — Dual-mode camera barcode scanner.
 * Mode 1: Continuous video scanning (native BarcodeDetector on Android)
 * Mode 2: Photo capture + analyze with ZXing WASM (works on ALL browsers)
 * Uses zxing-wasm (ZXing C++ → WebAssembly) for maximum 1D barcode detection.
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
  const [captureState, setCaptureState] = useState('idle')

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

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const resumeScanning = useCallback(() => {
    const video = videoRef.current
    const detector = detectorRef.current
    if (!video || !detector || !mountedRef.current) return

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

  // === ZXing WASM decoder (primary engine) ===
  const tryZxingDecode = useCallback(async (imageData) => {
    try {
      const { readBarcodes } = await import('zxing-wasm/reader')
      const results = await readBarcodes(imageData, {
        formats: ['Code128', 'Code39', 'EAN-13', 'EAN-8', 'ITF', 'Codabar', 'QRCode'],
        tryHarder: true,
        tryRotate: true,
        tryInvert: true,
        tryDownscale: true,
        maxNumberOfSymbols: 1,
        minLineCount: 1,
      })
      if (results.length > 0 && results[0].text) {
        return results[0].text
      }
    } catch { /* zxing decode failed */ }
    return null
  }, [])

  // Get ImageData from a canvas
  const getImageData = useCallback((cvs) => {
    const ctx = cvs.getContext('2d')
    return ctx.getImageData(0, 0, cvs.width, cvs.height)
  }, [])

  // Create processed canvas
  const processImage = useCallback((srcCanvas, mode) => {
    const tmp = document.createElement('canvas')
    const ctx = tmp.getContext('2d')
    const sw = srcCanvas.width
    const sh = srcCanvas.height

    if (mode === 'crop') {
      const cropW = Math.round(sw * 0.85)
      const cropH = Math.round(sh * 0.45)
      const cropX = Math.round((sw - cropW) / 2)
      const cropY = Math.round((sh - cropH) / 2)
      tmp.width = cropW
      tmp.height = cropH
      ctx.drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
    } else if (mode === 'binarize') {
      const cropW = Math.round(sw * 0.85)
      const cropH = Math.round(sh * 0.45)
      const cropX = Math.round((sw - cropW) / 2)
      const cropY = Math.round((sh - cropH) / 2)
      tmp.width = cropW
      tmp.height = cropH
      ctx.drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
      const imgData = ctx.getImageData(0, 0, cropW, cropH)
      const d = imgData.data
      for (let i = 0; i < d.length; i += 4) {
        const lum = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114
        const val = lum > 128 ? 255 : 0
        d[i] = d[i+1] = d[i+2] = val
      }
      ctx.putImageData(imgData, 0, 0)
    }
    return tmp
  }, [])

  // === PHOTO CAPTURE + ANALYZE ===
  const captureAndAnalyze = useCallback(async () => {
    if (!streamRef.current || !videoRef.current) return

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    setCaptureState('analyzing')

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    const track = streamRef.current.getVideoTracks()[0]
    const settings = track?.getSettings?.() || {}
    const w = settings.width || video.videoWidth || 1280
    const h = settings.height || video.videoHeight || 720

    canvas.width = w
    canvas.height = h
    const ctx2d = canvas.getContext('2d')
    ctx2d.drawImage(video, 0, 0, w, h)
    canvas.style.display = 'block'

    let detected = false

    // Pass 1: Native BarcodeDetector (Android only, fast)
    if (!detected && detectorRef.current) {
      try {
        const barcodes = await detectorRef.current.detect(canvas)
        if (barcodes.length > 0) {
          handleDetection(barcodes[0].rawValue)
          detected = true
        }
      } catch { /* native detection failed */ }
    }

    // Pass 2: ZXing WASM on full image
    if (!detected) {
      const code = await tryZxingDecode(getImageData(canvas))
      if (code) { handleDetection(code); detected = true }
    }

    // Pass 3: ZXing WASM on cropped center
    if (!detected) {
      const cropped = processImage(canvas, 'crop')
      const code = await tryZxingDecode(getImageData(cropped))
      if (code) { handleDetection(code); detected = true }
    }

    // Pass 4: ZXing WASM on binarized crop
    if (!detected) {
      const bin = processImage(canvas, 'binarize')
      const code = await tryZxingDecode(getImageData(bin))
      if (code) { handleDetection(code); detected = true }
    }

    if (!detected && mountedRef.current) {
      setCaptureState('failed')
    }
  }, [handleDetection, tryZxingDecode, getImageData, processImage])

  const retryCapture = useCallback(() => {
    setCaptureState('idle')
    const canvas = canvasRef.current
    if (canvas) canvas.style.display = 'none'

    if (detectorRef.current) {
      resumeScanning()
    }
  }, [resumeScanning])

  useEffect(() => {
    mountedRef.current = true

    const startNativeScanner = async () => {
      try {
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

        const track = stream.getVideoTracks()[0]
        const caps = track?.getCapabilities?.()
        if (caps?.torch) setTorchSupported(true)

        if (detectorRef.current) {
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

          {captureState === 'analyzing' && (
            <div className="barcode-scanner-capture-overlay">
              <div className="barcode-scanner-capture-spinner" />
              <span>Analizando foto...</span>
            </div>
          )}

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
