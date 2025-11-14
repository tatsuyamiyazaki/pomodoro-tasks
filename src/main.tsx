import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PomodoroProvider } from './features/pomodoro'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PomodoroProvider>
      <App />
    </PomodoroProvider>
  </StrictMode>
)
