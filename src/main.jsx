import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'flatpickr/dist/flatpickr.min.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
