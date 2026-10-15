import { StrictMode } from 'react'
import { initSentry } from './lib/sentry'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Hata takibi, uygulama çizilmeden önce başlar (DSN yoksa hiçbir şey yapmaz).
initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
