import StatusBadge from './StatusBadge'
import { Eye } from 'lucide-react'

const COLS = [
  { key: 'numero', label: 'N° Orden', width: 'w-32' },
  { key: 'fecha', label: 'Fecha', width: 'w-36' },
  { key: 'paciente', label: 'Paciente', width: '' },
  { key: 'cedula', label: 'Cédula', width: 'w-28' },
  { key: 'procedencia', label: 'Procedencia', width: 'w-32' },
  { key: 'status', label: 'Estado', width: 'w-36' },
  { key: 'actions', label: '', width: 'w-12' },
]

function formatFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function DataTable({ rows, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-100">
            {COLS.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400 bg-slate-50 ${c.width}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={COLS.length} className="px-4 py-8 text-center text-slate-400 text-[13px]">
                Cargando…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={COLS.length} className="px-4 py-8 text-center text-slate-400 text-[13px]">
                Sin resultados
              </td>
            </tr>
          )}
          {!loading && rows.map((row, i) => (
            <tr
              key={row.id}
              className={`border-b border-slate-50 hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}
            >
              <td className="px-4 py-2.5">
                {/* badge-order del manual: borde dorado, fuente mono */}
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-medium font-mono text-amber-700 bg-transparent border border-amber-300/60 whitespace-nowrap">
                  {row.numero}
                </span>
              </td>
              <td className="px-4 py-2.5 text-[13px] text-slate-600">
                {formatFecha(row.fecha)}
              </td>
              <td className="px-4 py-2.5 text-[13px] text-slate-800 font-medium">
                {row.paciente || '—'}
              </td>
              <td className="px-4 py-2.5 text-[13px] font-mono text-slate-600">
                {row.cedula || '—'}
              </td>
              <td className="px-4 py-2.5 text-[13px] text-slate-600">
                {row.procedencia || '—'}
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={row.status} color={row.color} size="sm" />
              </td>
              <td className="px-4 py-2.5">
                <button
                  className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Ver detalle"
                >
                  <Eye size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
