import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoLabsis from '../assets/logolabsis.png'

const fmt = (n) => Number(n || 0).toLocaleString('es')

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [labInfo, setLabInfo] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/ordenes', { replace: true })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    fetch('/api/auth/lab-info')
      .then(r => r.ok ? r.json() : null)
      .then(d => { d && setLabInfo(d); setTimeout(() => setReady(true), 50) })
      .catch(() => setTimeout(() => setReady(true), 50))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Ingresa usuario y contraseña')
      return
    }
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate('/ordenes', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const stats = labInfo?.stats
  const labName = labInfo?.lab?.nombre || ''

  return (
    <div className={`lg-page ${ready ? 'lg-ready' : ''}`}>

      {/* ── Floating logos with vignette mask ── */}
      <div className="lg-fl lg-fl--logo1">
        {labInfo?.hasLogo && (
          <div className="lg-logo-mask">
            <img src="/api/auth/lab-logo" alt={labName} className="lg-logo-client" />
          </div>
        )}
      </div>
      <div className="lg-fl lg-fl--logo2">
        <img src={logoLabsis} alt="Labsis" className="lg-logo-labsis" />
      </div>

      {/* ── Floating stats ── */}
      {stats && (<>
        <div className="lg-fl lg-fl--s1">
          <div className="lg-stat lg-stat--blue">
            <div className="lg-stat-ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div className="lg-stat-body">
              <span className="lg-stat-num">{fmt(stats.total_ordenes)}</span>
              <span className="lg-stat-label">Órdenes</span>
            </div>
          </div>
        </div>
        <div className="lg-fl lg-fl--s2">
          <div className="lg-stat lg-stat--green">
            <div className="lg-stat-ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="lg-stat-body">
              <span className="lg-stat-num">{fmt(stats.total_pacientes)}</span>
              <span className="lg-stat-label">Pacientes</span>
            </div>
          </div>
        </div>
        <div className="lg-fl lg-fl--s3">
          <div className="lg-stat lg-stat--purple">
            <div className="lg-stat-ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
            </div>
            <div className="lg-stat-body">
              <span className="lg-stat-num">{fmt(stats.total_pruebas)}</span>
              <span className="lg-stat-label">Pruebas</span>
            </div>
          </div>
        </div>
        <div className="lg-fl lg-fl--s4">
          <div className="lg-stat lg-stat--amber">
            <div className="lg-stat-ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <div className="lg-stat-body">
              <span className="lg-stat-num">{stats.total_areas}</span>
              <span className="lg-stat-label">Áreas</span>
            </div>
          </div>
        </div>
      </>)}

      {/* ══ NUCLEUS — Login form ══ */}
      <div className="lg-nucleus">
        <div className="lg-nucleus-ring" />
        <div className="lg-form-card">
          <form className="lg-form" onSubmit={handleSubmit}>
            <div className="lg-form-head">
              <h2 className="lg-form-title">Iniciar Sesión</h2>
              <p className="lg-form-sub">Ingresa tus credenciales</p>
            </div>

            {error && (
              <div className="lg-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {error}
              </div>
            )}

            <div className="lg-field">
              <label htmlFor="lg-user">Usuario</label>
              <div className="lg-input-wrap">
                <svg className="lg-input-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input id="lg-user" type="text" placeholder="Tu nombre de usuario"
                  autoComplete="username" autoFocus
                  value={username} onChange={e => setUsername(e.target.value)} disabled={submitting} />
              </div>
            </div>

            <div className="lg-field">
              <label htmlFor="lg-pass">Contraseña</label>
              <div className="lg-input-wrap">
                <svg className="lg-input-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input id="lg-pass" type={showPass ? 'text' : 'password'}
                  placeholder="Tu contraseña" autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)} disabled={submitting} />
                <button type="button" className="lg-eye" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <button className="lg-submit" type="submit" disabled={submitting}>
              {submitting ? <><span className="lg-spin" /> Ingresando...</> : <>Iniciar Sesión</>}
            </button>
          </form>
        </div>
      </div>

      {/* ── Tagline — large, bottom, vertical float only ── */}
      <div className="lg-fl lg-fl--tag">
        <h2 className="lg-tagline">Sistema Integral de Laboratorios</h2>
        <p className="lg-tagline-sub">Gestión de órdenes · Resultados · Facturación · Control de calidad</p>
      </div>

      {/* Footer */}
      <div className="lg-footer">
        {labName && <><span className="lg-footer-lab">{labName}</span><span className="lg-footer-sep">·</span></>}
        <span>Powered by <strong>Labsis</strong></span>
      </div>
    </div>
  )
}
