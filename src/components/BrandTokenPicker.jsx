import { useState, useEffect, useRef, useMemo } from 'react'
import { getQABrandTokens } from '../services/api'

const RECENT_KEY = 'qa-brand-tokens-recent'
const MAX_RECENT = 8

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function addRecent(token) {
  const list = getRecent().filter(t => t.code !== token.code)
  list.unshift(token)
  if (list.length > MAX_RECENT) list.length = MAX_RECENT
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

// Mini color swatch for tokens that have a color
function Swatch({ color }) {
  if (!color) return null
  return <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 4, background: color, border: '1px solid rgba(0,0,0,0.1)', verticalAlign: 'middle', marginRight: 6, flexShrink: 0 }} />
}

function TokenChip({ token, onRemove, small }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'rgba(139,92,246,0.08)', color: '#8b5cf6',
      border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: 20, padding: small ? '2px 8px' : '3px 10px',
      fontSize: small ? 10 : 11, fontWeight: 600, fontFamily: 'var(--font-mono, monospace)',
      lineHeight: 1.4,
    }}>
      <Swatch color={token.color} />
      {token.code}
      {onRemove && (
        <span onClick={e => { e.stopPropagation(); onRemove(token.code) }} style={{ cursor: 'pointer', marginLeft: 2, opacity: 0.6, fontSize: 13 }}>&times;</span>
      )}
    </span>
  )
}

/* Gallery modal — extracted so both modes share it */
function GalleryModal({ categories, allTokens, selectedTokens, onTokensChange, isSelected, toggleToken, onClose }) {
  const [galleryCat, setGalleryCat] = useState(null)
  const [gallerySearch, setGallerySearch] = useState('')
  const recentTokens = getRecent()

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'center',
      zIndex: 9999, padding: 'env(safe-area-inset-top, 0) 0 0',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 0, width: '100%', maxWidth: 900,
        height: '100%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }}>
        {/* Gallery Header */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border, #e2e8f0)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b' }}>
              Galería de Tokens
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
              {allTokens.length} tokens — {categories.length} categorías
              {selectedTokens.length > 0 && <span style={{ color: '#8b5cf6', fontWeight: 600 }}> — {selectedTokens.length} seleccionados</span>}
            </p>
          </div>
          <input
            type="text"
            value={gallerySearch}
            onChange={e => setGallerySearch(e.target.value)}
            placeholder="Buscar token..."
            style={{
              width: 180, padding: '6px 10px', borderRadius: 8,
              border: '1px solid var(--border, #e2e8f0)', fontSize: 12,
              marginRight: 8,
            }}
          />
          <button onClick={onClose} style={{
            background: 'rgba(0,0,0,0.04)', border: 'none', fontSize: 18, cursor: 'pointer',
            color: '#64748b', width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>&times;</button>
        </div>

        {/* Recent tokens quick access — only when there are recent tokens */}
        {recentTokens.length > 0 && (
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid var(--border, #e2e8f0)',
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: 'rgba(139,92,246,0.02)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>Recientes:</span>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {recentTokens.map(t => (
                <span
                  key={t.code}
                  onClick={() => toggleToken(t)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    background: isSelected(t.code) ? 'rgba(139,92,246,0.12)' : 'rgba(0,0,0,0.03)',
                    border: isSelected(t.code) ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                    borderRadius: 12, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    fontSize: 11, fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 600, color: isSelected(t.code) ? '#8b5cf6' : 'var(--text-3, #64748b)',
                    transition: 'all 150ms',
                  }}
                >
                  <Swatch color={t.color} />
                  {t.code}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Category pills */}
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid var(--border, #e2e8f0)',
          overflowX: 'auto', display: 'flex', gap: 6, flexShrink: 0,
          WebkitOverflowScrolling: 'touch',
        }}>
          <button onClick={() => setGalleryCat(null)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            background: galleryCat === null ? '#8b5cf6' : '#f1f5f9',
            color: galleryCat === null ? '#fff' : '#64748b',
          }}>
            Todas ({allTokens.length})
          </button>
          {categories.map(c => (
            <button key={c.prefix} onClick={() => setGalleryCat(c.prefix)} style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
              background: galleryCat === c.prefix ? '#8b5cf6' : '#f1f5f9',
              color: galleryCat === c.prefix ? '#fff' : '#64748b',
            }}>
              {c.category} ({c.tokens.length})
            </button>
          ))}
        </div>

        {/* Tokens grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, WebkitOverflowScrolling: 'touch' }}>
          {(galleryCat ? categories.filter(c => c.prefix === galleryCat) : categories).map(cat => {
            const filteredCatTokens = gallerySearch.trim()
              ? cat.tokens.filter(t => {
                  const s = gallerySearch.toLowerCase()
                  return t.code.toLowerCase().includes(s) || t.name.toLowerCase().includes(s) || t.desc.toLowerCase().includes(s)
                })
              : cat.tokens
            if (filteredCatTokens.length === 0) return null
            return (
              <div key={cat.prefix} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  color: '#8b5cf6', letterSpacing: '0.05em', marginBottom: 10,
                  borderBottom: '1px solid rgba(139,92,246,0.1)', paddingBottom: 6,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>{cat.prefix} — {cat.category}</span>
                  <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 500, textTransform: 'none' }}>{filteredCatTokens.length} tokens</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                  {filteredCatTokens.map(t => {
                    const sel = isSelected(t.code)
                    return (
                      <div
                        key={t.code}
                        onClick={() => toggleToken({ ...t, category: cat.category })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                          background: sel ? 'rgba(139,92,246,0.08)' : '#f8fafc',
                          border: sel ? '2px solid #8b5cf6' : '2px solid transparent',
                          transition: 'all 150ms', minHeight: 52,
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: t.color || 'rgba(139,92,246,0.1)',
                          border: '1px solid rgba(0,0,0,0.06)',
                          fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-mono)',
                          color: t.color && isLightColor(t.color) ? '#333' : '#fff'
                        }}>
                          {t.color ? '' : cat.prefix.substring(0, 3)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#8b5cf6' }}>{t.code}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.3, marginTop: 2 }}>{t.desc}</div>
                        </div>
                        {sel && (
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', background: '#8b5cf6',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 700, flexShrink: 0,
                          }}>✓</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Gallery footer */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border, #e2e8f0)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: '#fff',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1, marginRight: 12, maxHeight: 48, overflowY: 'auto' }}>
            {selectedTokens.map(t => <TokenChip key={t.code} token={t} onRemove={(code) => onTokensChange(selectedTokens.filter(x => x.code !== code))} small />)}
            {selectedTokens.length === 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>Toca un token para seleccionarlo</span>}
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#8b5cf6', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(139,92,246,0.3)',
            }}
          >
            Listo ({selectedTokens.length})
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BrandTokenPicker({ selectedTokens = [], onTokensChange, zone = '', onZoneChange, openAsGallery = false, onClose }) {
  const [categories, setCategories] = useState([])
  const [showGallery, setShowGallery] = useState(openAsGallery)
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    getQABrandTokens().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allTokens = useMemo(() =>
    categories.flatMap(c => c.tokens.map(t => ({ ...t, category: c.category, prefix: c.prefix }))),
    [categories]
  )

  const filteredTokens = useMemo(() => {
    if (!search.trim()) return []
    const s = search.toLowerCase()
    return allTokens.filter(t =>
      t.code.toLowerCase().includes(s) ||
      t.name.toLowerCase().includes(s) ||
      t.desc.toLowerCase().includes(s) ||
      t.category.toLowerCase().includes(s)
    ).slice(0, 12)
  }, [search, allTokens])

  const toggleToken = (token) => {
    const exists = selectedTokens.find(t => t.code === token.code)
    if (exists) {
      onTokensChange(selectedTokens.filter(t => t.code !== token.code))
    } else {
      addRecent(token)
      onTokensChange([...selectedTokens, { code: token.code, name: token.name, color: token.color, category: token.category }])
    }
    setSearch('')
    setDropdownOpen(false)
  }

  const isSelected = (code) => selectedTokens.some(t => t.code === code)

  const closeGallery = () => {
    setShowGallery(false)
    if (onClose) onClose()
  }

  // When opened as gallery popup, only render the gallery modal
  if (openAsGallery) {
    return (
      <GalleryModal
        categories={categories}
        allTokens={allTokens}
        selectedTokens={selectedTokens}
        onTokensChange={onTokensChange}
        isSelected={isSelected}
        toggleToken={toggleToken}
        onClose={closeGallery}
      />
    )
  }

  const inputStyle = { width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border, #e2e8f0)', fontSize: 12, background: 'var(--surface, #fff)' }
  const labelStyle = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-4, #94a3b8)', letterSpacing: '0.04em', marginBottom: 4, display: 'block' }
  const recentTokens = getRecent()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Zone picker */}
      <div>
        <label style={labelStyle}>Zona de Pantalla</label>
        <select value={zone} onChange={e => onZoneChange(e.target.value)} style={inputStyle}>
          <option value="">Sin especificar</option>
          <option value="header">Header / Top bar</option>
          <option value="sidebar">Sidebar / Menú lateral</option>
          <option value="filtros">Zona de Filtros</option>
          <option value="tabla">Tabla de Datos</option>
          <option value="formulario">Formulario / Inputs</option>
          <option value="modal">Modal / Diálogo</option>
          <option value="footer">Footer</option>
          <option value="card">Tarjeta / Card</option>
          <option value="boton">Botón / Acción</option>
          <option value="badge">Badge / Etiqueta</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      {/* Token search dropdown */}
      <div ref={dropRef} style={{ position: 'relative' }}>
        <label style={labelStyle}>Token Visual (Brand Manual)</label>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setDropdownOpen(true) }}
          onFocus={() => setDropdownOpen(true)}
          placeholder="Buscar: BTN-001, color, botón..."
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => setShowGallery(true)}
          style={{
            position: 'absolute', right: 4, top: 18, bottom: 2,
            background: '#8b5cf6', color: '#fff',
            border: 'none', borderRadius: 6,
            fontSize: 11, fontWeight: 700, padding: '0 12px', cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(139,92,246,0.25)',
          }}
        >
          Galería
        </button>

        {/* Dropdown results */}
        {dropdownOpen && filteredTokens.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: '#fff', border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            maxHeight: 240, overflowY: 'auto', marginTop: 2
          }}>
            {filteredTokens.map(t => (
              <div
                key={t.code}
                onClick={() => toggleToken(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', cursor: 'pointer', fontSize: 12,
                  background: isSelected(t.code) ? 'rgba(139,92,246,0.06)' : 'transparent',
                  borderLeft: isSelected(t.code) ? '3px solid #8b5cf6' : '3px solid transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = isSelected(t.code) ? 'rgba(139,92,246,0.06)' : 'transparent'}
              >
                <Swatch color={t.color} />
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#8b5cf6', minWidth: 60, fontSize: 11 }}>{t.code}</span>
                <span style={{ flex: 1, color: 'var(--text-2, #334155)' }}>{t.name}</span>
                <span style={{ color: 'var(--text-4, #94a3b8)', fontSize: 10 }}>{t.category}</span>
                {isSelected(t.code) && <span style={{ color: '#8b5cf6' }}>✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected tokens */}
      {selectedTokens.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {selectedTokens.map(t => (
            <TokenChip key={t.code} token={t} onRemove={(code) => onTokensChange(selectedTokens.filter(x => x.code !== code))} />
          ))}
        </div>
      )}

      {/* Recent tokens (accesos rápidos) */}
      {recentTokens.length > 0 && (
        <div>
          <label style={{ ...labelStyle, fontSize: 9, opacity: 0.7 }}>Accesos Rápidos</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {recentTokens.map(t => (
              <span
                key={t.code}
                onClick={() => toggleToken(t)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  background: isSelected(t.code) ? 'rgba(139,92,246,0.12)' : 'rgba(0,0,0,0.03)',
                  border: isSelected(t.code) ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                  borderRadius: 12, padding: '2px 7px', cursor: 'pointer',
                  fontSize: 10, fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 600, color: isSelected(t.code) ? '#8b5cf6' : 'var(--text-3, #64748b)',
                  transition: 'all 150ms',
                }}
              >
                <Swatch color={t.color} />
                {t.code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {showGallery && (
        <GalleryModal
          categories={categories}
          allTokens={allTokens}
          selectedTokens={selectedTokens}
          onTokensChange={onTokensChange}
          isSelected={isSelected}
          toggleToken={toggleToken}
          onClose={closeGallery}
        />
      )}
    </div>
  )
}

function isLightColor(hex) {
  if (!hex || !hex.startsWith('#')) return true
  const c = hex.substring(1)
  const r = parseInt(c.substr(0, 2), 16)
  const g = parseInt(c.substr(2, 2), 16)
  const b = parseInt(c.substr(4, 2), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}
