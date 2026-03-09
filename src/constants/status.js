/* Status maps — single source of truth for colors/labels/icons */

export const ORDER_STATUS = {
  6:  { label: 'Abortada',       color: '#000000', icon: 'x' },
  0:  { label: 'Inactivo',       color: '#94a3b8', icon: 'dot' },
  1:  { label: 'Activo',         color: '#d44836', icon: 'dot' },
  2:  { label: 'Iniciada',       color: '#ffa500', icon: 'dot' },
  8:  { label: 'Por Validar',    color: '#f472b6', icon: 'dot' },
  9:  { label: 'Transmitido',    color: '#3e65b0', icon: 'arrows' },
  10: { label: 'En Espera',      color: '#4888f1', icon: 'dot' },
  11: { label: 'Reflejo',        color: '#919386', icon: 'dot' },
  7:  { label: 'Vacío Validado', color: '#63981f', icon: 'dot' },
  5:  { label: 'No Validado',    color: '#d44836', icon: 'dot' },
  4:  { label: 'Validado',       color: '#63981f', icon: 'check' },
  3:  { label: 'Finalizada',     color: '#d44836', icon: 'dot' },
}

export const CHECKPOINT_STATUS = {
  REC: '#22c55e', TRA: '#f59e0b', ACM: '#3b82f6', DIS: '#8b5cf6',
  PRO: '#06b6d4', ALM: '#64748b', NOE: '#ef4444', DES: '#dc2626',
}
