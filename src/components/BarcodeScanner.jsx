import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

/**
 * BarcodeScanner — High-precision camera barcode scanner optimized for 1D codes.
 * Features: HD resolution, continuous autofocus, torch toggle, anti-duplicate,
 * laser-line overlay, vibration + beep feedback, narrow scan zone.
 */
export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const lastScanRef = useRef({ code: '', time: 0 })
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [lastCode, setLastCode] = useState('')
  const [scanFlash, setScanFlash] = useState(false)

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

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrRef.current) {
        const state = html5QrRef.current.getState()
        if (state === 2 || state === 3) {
          await html5QrRef.current.stop()
        }
        html5QrRef.current.clear()
        html5QrRef.current = null
      }
    } catch { /* ignore cleanup errors */ }
  }, [])

  // Toggle torch/flash
  const toggleTorch = useCallback(async () => {
    try {
      if (!html5QrRef.current) return
      const videoEl = document.querySelector('#barcode-scanner-region video')
      if (!videoEl?.srcObject) return
      const track = videoEl.srcObject.getVideoTracks()[0]
      if (!track) return
      const newTorch = !torchOn
      await track.applyConstraints({ advanced: [{ torch: newTorch }] })
      setTorchOn(newTorch)
    } catch { /* torch toggle failed */ }
  }, [torchOn])

  useEffect(() => {
    let mounted = true

    const startScanner = async () => {
      try {
        const scannerId = 'barcode-scanner-region'
        const html5Qr = new Html5Qrcode(scannerId)
        html5QrRef.current = html5Qr

        // Use facingMode constraint for reliable back camera + HD resolution
        const cameraConstraints = {
          facingMode: 'environment',
          width: { min: 1280, ideal: 1920 },
          height: { min: 720, ideal: 1080 },
          focusMode: 'continuous',
        }

        await html5Qr.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 320, height: 80 },
            aspectRatio: 1.777,
            videoConstraints: cameraConstraints,
            formatsToSupport: [
              2,  // CODE_128 (Labsis primary)
              1,  // CODE_39
              4,  // EAN_13
              5,  // EAN_8
              9,  // ITF
              10, // CODABAR
              0,  // QR_CODE
            ]
          },
          (decodedText) => {
            if (!mounted) return
            // Anti-duplicate: ignore same code within 1.5s cooldown
            const now = Date.now()
            if (decodedText === lastScanRef.current.code &&
                now - lastScanRef.current.time < 1500) {
              return
            }
            lastScanRef.current = { code: decodedText, time: now }

            // Feedback: vibrate + beep + flash
            if (navigator.vibrate) navigator.vibrate(200)
            playBeep()
            setLastCode(decodedText)
            setScanFlash(true)
            setTimeout(() => setScanFlash(false), 400)

            onScan(decodedText)
          },
          () => { /* ignore scan failures */ }
        )

        if (mounted) {
          setCameraReady(true)
          // Check torch support
          setTimeout(() => {
            try {
              const videoEl = document.querySelector('#barcode-scanner-region video')
              if (videoEl?.srcObject) {
                const track = videoEl.srcObject.getVideoTracks()[0]
                const capabilities = track?.getCapabilities?.()
                if (capabilities?.torch) {
                  setTorchSupported(true)
                }
              }
            } catch { /* no torch */ }
          }, 500)
        }
      } catch (err) {
        if (!mounted) return
        if (err.toString().includes('NotAllowedError') || err.toString().includes('Permission')) {
          setError('Permiso de cámara denegado. Habilítalo en la configuración del navegador.')
        } else {
          setError(`Error al iniciar cámara: ${err.message || err}`)
        }
      }
    }

    startScanner()

    return () => {
      mounted = false
      stopScanner()
    }
  }, [onScan, stopScanner, playBeep])

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  return (
    <div className="barcode-scanner-overlay">
      <div className="barcode-scanner-modal">
        <div className="barcode-scanner-header">
          <span>Escanear con cámara</span>
          <div className="barcode-scanner-header-actions">
            {torchSupported && (
              <button
                type="button"
                className={`barcode-scanner-torch ${torchOn ? 'active' : ''}`}
                onClick={toggleTorch}
                title={torchOn ? 'Apagar linterna' : 'Encender linterna'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
                {/* Flash/bolt icon */}
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
          <div
            id="barcode-scanner-region"
            ref={scannerRef}
            className="barcode-scanner-viewport"
          />
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
