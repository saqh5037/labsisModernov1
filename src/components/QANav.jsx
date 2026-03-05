import { useNavigate, useLocation } from 'react-router-dom'
import QANotificationBell from './QANotificationBell'
import QAToastContainer from './QAToast'
import QANotepad from './QANotepad'

const IconCode = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
const IconFlask = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6v8l4 8H5l4-8V3z" /><line x1="9" y1="3" x2="15" y2="3" />
  </svg>
)

export default function QANav({ active }) {
  const navigate = useNavigate()
  const loc = useLocation()

  const links = [
    { id: 'dashboard', label: 'Dashboard', path: '/qa', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg> },
    { id: 'suites', label: 'Test Suites', path: '/qa/suites', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg> },
    { id: 'runs', label: 'Runs', path: '/qa/runs', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg> },
    { id: 'bugs', label: 'Bugs', path: '/qa/bugs', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg> },
    { id: 'team', label: 'Equipo', path: '/qa/team', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
  ]

  const isActive = (link) => {
    if (active) return active === link.id
    if (link.path === '/qa') return loc.pathname === '/qa'
    return loc.pathname.startsWith(link.path)
  }

  return (
    <>
      <nav className="dv-nav">
        <div className="dv-nav-left">
          <div className="dv-nav-icon"><IconCode /></div>
          <span className="dv-nav-brand">Lab<span>sis</span></span>
          <span className="dv-nav-tag">QA Testing</span>
        </div>
        <div className="dv-nav-right">
          <div className="dv-nav-live"><span className="dv-live-dot" />Quality Assurance</div>
          {links.map(link => (
            <button
              key={link.id}
              className={`dv-nav-link ${isActive(link) ? 'dv-nav-active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              {link.icon} {link.label}
            </button>
          ))}
          <QANotificationBell />
          <button className="dv-nav-link" onClick={() => navigate('/dev')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
            Dev
          </button>
          <button className="dv-nav-link" onClick={() => navigate('/ordenes')}>
            <IconFlask /> App
          </button>
        </div>
      </nav>
      <QAToastContainer />
      <QANotepad />
    </>
  )
}
