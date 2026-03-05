import { useEffect, useRef } from 'react'

export default function Modal({ open, onClose, title, children, width = 380 }) {
  const overlayRef = useRef()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="ot-modal-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}>
      <div className="ot-modal" style={{ maxWidth: width }}>
        <div className="ot-modal-header">
          <span className="ot-modal-title">{title}</span>
          <button className="ot-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="ot-modal-body">{children}</div>
      </div>
    </div>
  )
}
