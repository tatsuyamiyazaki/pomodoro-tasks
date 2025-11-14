import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { PomodoroProvider } from './features/pomodoro'
import './index.css'
import App from './App.tsx'

type ThemeMode = 'light' | 'dark'

function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem('theme') as ThemeMode | null
      return stored === 'dark' || stored === 'light' ? stored : 'light'
    } catch {
      return 'light'
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('theme', mode)
    } catch {}
  }, [mode])
  const toggle = () => setMode((m) => (m === 'light' ? 'dark' : 'light'))
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode])
  return { mode, theme, toggle }
}

function Root() {
  const { theme, toggle, mode } = useThemeMode()
  return (
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PomodoroProvider>
          <App themeMode={mode} onToggleTheme={toggle} />
        </PomodoroProvider>
      </ThemeProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
