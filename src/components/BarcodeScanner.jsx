import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

/**
 * BarcodeScanner — Opens camera to scan 1D barcodes (Code128, Code39, EAN, etc.) and QR codes.
 * Shows on mobile devices with a toggle button. When a code is detected, calls onScan(code).
 */
export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrRef.current) {
        const state = html5QrRef.current.getState()
        // 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await html5QrRef.current.stop()
        }
        html5QrRef.current.clear()
        html5QrRef.current = null
      }
    } catch { /* ignore cleanup errors */ }
  }, [])

  useEffect(() => {
    let mounted = true

    const startScanner = async () => {
      try {
        const scannerId = 'barcode-scanner-region'
        const html5Qr = new Html5Qrcode(scannerId)
        html5QrRef.current = html5Qr

        // Prefer back camera on mobile
        const cameras = await Html5Qrcode.getCameras()
        if (!cameras || cameras.length === 0) {
          setError('No se detectaron cámaras en este dispositivo')
          return
        }

        const backCamera = cameras.find(c =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('trasera') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        )
        const cameraId = backCamera ? backCamera.id : cameras[cameras.length - 1].id

        await html5Qr.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.0,
            formatsToSupport: [
              0,  // QR_CODE
              2,  // CODE_128
              1,  // CODE_39
              4,  // EAN_13
              5,  // EAN_8
              9,  // ITF
              10, // CODABAR
            ]
          },
          (decodedText) => {
            if (!mounted) return
            // Vibrate on scan if available
            if (navigator.vibrate) navigator.vibrate(100)
            onScan(decodedText)
          },
          () => { /* ignore scan failures (every frame that doesn't decode) */ }
        )

        if (mounted) setCameraReady(true)
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
  }, [onScan, stopScanner])

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  return (
    <div className="barcode-scanner-overlay">
      <div className="barcode-scanner-modal">
        <div className="barcode-scanner-header">
          <span>Escanear con cámara</span>
          <button type="button" className="barcode-scanner-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          id="barcode-scanner-region"
          ref={scannerRef}
          className="barcode-scanner-viewport"
        />

        {!cameraReady && !error && (
          <div className="barcode-scanner-loading">Iniciando cámara...</div>
        )}

        {error && (
          <div className="barcode-scanner-error">{error}</div>
        )}

        <div className="barcode-scanner-hint">
          Apunta la cámara al código de barras de la etiqueta
        </div>
      </div>
    </div>
  )
}
