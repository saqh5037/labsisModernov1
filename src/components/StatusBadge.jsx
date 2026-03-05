/**
 * Badge siguiendo el manual de marca v2 §05 — Badges
 *
 * Variantes semánticas:
 *   success  → verde   (Validado, Finalizada)
 *   warning  → naranja (Iniciada, En Espera, Por Validar)
 *   error    → rojo    (Activo/urgente, Abortada, Crítico)
 *   info     → azul    (default)
 *
 * Tamaños: sm (tabla) | md (default, filtros)
 */

function resolveVariant(status, color) {
  const s = (status || '').toLowerCase()
  const c = (color || '').toLowerCase()

  if (s.includes('valid') || s.includes('finaliz') || c.includes('#63981f') || c.includes('green'))
    return 'success'
  if (s.includes('abort') || s.includes('crítico') || s.includes('critico'))
    return 'error'
  if (s.includes('activo') || c === '#d44836' || c.includes('red'))
    return 'error'
  if (s.includes('inicia') || s.includes('espera') || s.includes('validar') || s.includes('reflejo') || c.includes('ffa500') || c.includes('f799'))
    return 'warning'
  return 'info'
}

const VARIANT_CLS = {
  success: {
    wrap: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  warning: {
    wrap: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  error: {
    wrap: 'bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
  info: {
    wrap: 'bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
}

/**
 * @param {{ status: string, color: string, size?: 'sm'|'md', dot?: boolean }} props
 */
export default function StatusBadge({ status, color, size = 'sm', dot = true }) {
  const variant = resolveVariant(status, color)
  const cls = VARIANT_CLS[variant]

  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'
  const fontSize = size === 'sm' ? 'text-[11px]' : 'text-[12px]'
  const dotSize = size === 'sm' ? 'w-1 h-1' : 'w-[5px] h-[5px]'

  return (
    <span
      className={`inline-flex items-center gap-1 ${padding} ${fontSize} font-medium rounded-full whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${cls.wrap}`}
    >
      {dot && <span className={`rounded-full flex-shrink-0 ${dotSize} ${cls.dot}`} />}
      {status}
    </span>
  )
}
