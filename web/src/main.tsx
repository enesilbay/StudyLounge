import { StrictMode } from 'react'
import { initSentry } from './lib/sentry'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installSessionHandlers } from './lib/session'

// Hata takibi, uygulama çizilmeden önce başlar (DSN yoksa hiçbir şey yapmaz).
initSentry()
// 401 kesicisi ve sunucu kaynaklı çıkış (force_logout) ortak çıkış akışına bağlanır.
installSessionHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
