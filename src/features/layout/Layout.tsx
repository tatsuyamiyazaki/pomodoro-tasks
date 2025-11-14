import { ReactNode, useState } from 'react'
import { Box } from '@mui/material'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'

export type ViewType =
  | 'today'
  | 'overdue'
  | 'tomorrow'
  | 'thisWeek'
  | 'next7Days'
  | 'highPriority'
  | 'upcoming'
  | 'completed'
  | 'all'

export function Layout({
  children,
  themeMode,
  onToggleTheme,
}: {
  children: ReactNode
  themeMode: 'light' | 'dark'
  onToggleTheme: () => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedView, setSelectedView] = useState<ViewType>('all')

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TopBar
        themeMode={themeMode}
        onToggleTheme={onToggleTheme}
        onMenuClick={() => setMobileOpen(true)}
      />
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        selectedView={selectedView}
        onSelectView={setSelectedView}
      />
      <Box component="main" sx={{ flexGrow: 1, p: 2, mt: 8, overflow: 'auto' }}>
        {children}
      </Box>
    </Box>
  )
}

