export default function StatusDot({ color, label }) {
  const bg = color && color.includes('/') ? color.split('/')[0] : color
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: bg || '#ccc' }}
        title={label}
      />
      <span className="text-[12px] text-slate-700">{label}</span>
    </span>
  )
}
