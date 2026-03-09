export default function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`lab-toast lab-toast-${toast.type}`}>
      {toast.type === 'success' ? '\u2713' : '\u2715'} {toast.message}
    </div>
  )
}
