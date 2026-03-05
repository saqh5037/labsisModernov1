import { useRef, useEffect } from 'react'
import flatpickr from 'flatpickr'
import { Spanish } from 'flatpickr/dist/l10n/es'

function fmtDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/* Parse "yyyy-mm-dd" → Date object (local timezone, avoids ISO-UTC shift) */
function parseISO(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/* Sync value to flatpickr using Date objects — never raw ISO strings */
function syncToFlatpickr(fp, value, isRange) {
  if (!fp) return
  if (isRange) {
    if (!value?.from) {
      fp.clear()
    } else {
      const dates = [parseISO(value.from)]
      if (value.to) dates.push(parseISO(value.to))
      fp.setDate(dates, false)
    }
  } else {
    if (!value) {
      fp.clear()
    } else {
      fp.setDate(parseISO(value), false)
    }
  }
}

export default function DatePickerGlass({ value, onChange, placeholder = 'dd/mm/aaaa', mode = 'single' }) {
  const wrapRef = useRef(null)
  const fpRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const isRange = mode === 'range'

  useEffect(() => {
    const input = wrapRef.current?.querySelector('input')
    if (!input) return

    fpRef.current = flatpickr(input, {
      locale: Spanish,
      dateFormat: 'd/m/Y',
      mode: isRange ? 'range' : 'single',
      allowInput: false,
      clickOpens: true,
      onChange: (dates) => {
        if (isRange) {
          if (dates.length >= 2) {
            onChangeRef.current({ from: fmtDate(dates[0]), to: fmtDate(dates[1]) })
          }
          // length === 1: wait for second date
        } else {
          onChangeRef.current(dates[0] ? fmtDate(dates[0]) : '')
        }
      },
      onClose: (dates) => {
        if (isRange && dates.length === 1) {
          onChangeRef.current({ from: fmtDate(dates[0]), to: fmtDate(dates[0]) })
        }
      },
    })

    // Set initial value using Date objects (not strings) to avoid format confusion
    syncToFlatpickr(fpRef.current, value, isRange)

    return () => fpRef.current?.destroy()
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes back to flatpickr
  useEffect(() => {
    if (!fpRef.current) return
    syncToFlatpickr(fpRef.current, value, isRange)
  }, [value, isRange])

  const hasValue = isRange ? !!value?.from : !!value

  return (
    <div ref={wrapRef} className="dp-wrap">
      <input
        className={`dp-input ${hasValue ? 'has-value' : ''}`}
        placeholder={isRange ? (placeholder || 'Rango de fechas') : placeholder}
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
