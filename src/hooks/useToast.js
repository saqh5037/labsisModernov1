import { useState, useEffect, useCallback } from 'react'

export function useToast(duration = 4000) {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), duration)
    return () => clearTimeout(t)
  }, [toast, duration])

  const showToast = useCallback((type, message) => {
    setToast({ type, message })
  }, [])

  return { toast, setToast, showToast }
}
