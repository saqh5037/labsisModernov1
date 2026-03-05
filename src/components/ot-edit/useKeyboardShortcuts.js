import { useEffect } from 'react'

export default function useKeyboardShortcuts({
  handleSave, navigate, anyDropdownOpen,
  pacInputRef, procInputRef, examSearchInputRef
}) {
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+S / Cmd+S: Save
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 's') {
        e.preventDefault()
        handleSave(false)
      }
      // Ctrl+Shift+S: Save and Bill
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        handleSave(true)
      }
      // Escape: go back (only if no dropdown open)
      if (e.key === 'Escape' && !anyDropdownOpen) {
        navigate(-1)
      }
      // Ctrl+1/2/3: jump to step
      if ((e.ctrlKey || e.metaKey) && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault()
        const targets = { '1': pacInputRef, '2': procInputRef, '3': examSearchInputRef }
        targets[e.key]?.current?.focus()
      }
      // "/" to focus exam search (when not in an input)
      if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
        e.preventDefault()
        examSearchInputRef?.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleSave, navigate, anyDropdownOpen, pacInputRef, procInputRef, examSearchInputRef])
}
