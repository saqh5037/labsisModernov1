import { useRef, useEffect } from 'react'
import flatpickr from 'flatpickr'
import { Spanish } from 'flatpickr/dist/l10n/es'

export default function DatePickerGlass({ value, onChange, placeholder = 'dd/mm/aaaa' }) {
  const wrapRef = useRef(null)
  const fpRef = useRef(null)

  useEffect(() => {
    const input = wrapRef.current?.querySelector('input')
    if (!input) return
    fpRef.current = flatpickr(input, {
      locale: Spanish,
      dateFormat: 'd/m/Y',
      allowInput: false,
      clickOpens: true,
      defaultDate: value || null,
      onChange: ([date]) => {
        if (date) {
          const y = date.getFullYear()
          const m = String(date.getMonth() + 1).padStart(2, '0')
          const d = String(date.getDate()).padStart(2, '0')
          onChange(`${y}-${m}-${d}`)
        } else {
          onChange('')
        }
      },
    })
    return () => fpRef.current?.destroy()
  }, [])

  useEffect(() => {
    if (!fpRef.current) return
    if (!value) {
      fpRef.current.clear()
    } else {
      fpRef.current.setDate(value, false)
    }
  }, [value])

  return (
    <div ref={wrapRef} className="dp-wrap">
      <input
        className={`dp-input ${value ? 'has-value' : ''}`}
        placeholder={placeholder}
        readOnly
      />
      <svg className="dp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    </div>
  )
}
