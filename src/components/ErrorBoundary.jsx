import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => window.location.reload()

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24 }}>
        <div className="glass-card" style={{ maxWidth: 480, textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: 'var(--error)', marginBottom: 8 }}>Algo salio mal</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            Ocurrio un error inesperado. Intenta recargar la pagina.
          </p>
          <button className="btn btn-primary" onClick={this.handleReload}>
            Recargar pagina
          </button>
        </div>
      </div>
    )
  }
}
