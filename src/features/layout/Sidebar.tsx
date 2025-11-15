import {
  Badge,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material'
import { useTaskStore } from '../../features/tasks/store'
import { useProjectStore } from '../../features/projects/store'
import { useTagStore } from '../../features/tags/store'
import { TagFilter } from '../../features/tags/TagFilter'
import { useState } from 'react'
import { Button } from '@mui/material'
import { ProjectForm } from '../projects/ProjectForm'
import type { ViewType } from './Layout'

const drawerWidth = 280

const VIEWS: { key: ViewType; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'overdue', label: '期限切れ' },
  { key: 'tomorrow', label: '明日' },
  { key: 'thisWeek', label: '今週' },
  { key: 'next7Days', label: '次の7日間' },
  { key: 'highPriority', label: '高優先度' },
  { key: 'upcoming', label: '今後' },
  { key: 'completed', label: '完了済み' },
  { key: 'all', label: 'すべて' },
]

export function Sidebar({
  mobileOpen,
  onCloseMobile,
  selectedView,
  onSelectView,
}: {
  mobileOpen: boolean
  onCloseMobile: () => void
  selectedView: ViewType
  onSelectView: (v: ViewType) => void
}) {
  const getFilteredTasks = useTaskStore((s) => s.getFilteredTasks)
  const projects = useProjectStore((s) => s.projects)
  const getProjectStats = useProjectStore((s) => s.getProjectStats)
  // Tag list rendering moved to TagFilter component
  const [projOpen, setProjOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<null | import('../../shared/types').Project>(null)

  // Drawer content
  const content = (
    <Box sx={{ width: drawerWidth }} role="presentation">
      <Toolbar />
      <Box sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">
          ビュー
        </Typography>
      </Box>
      <List>
        {VIEWS.map((v) => (
          <ListItemButton key={v.key} selected={selectedView === v.key} onClick={() => onSelectView(v.key)}>
            <ListItemText primary={v.label} />
            <Badge color="primary" badgeContent={getFilteredTasks(v.key).length} />
          </ListItemButton>
        ))}
      </List>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">
          プロジェクト
        </Typography>
        <Button size="small" sx={{ ml: 1 }} onClick={() => { setEditingProject(null); setProjOpen(true) }}>
          追加
        </Button>
      </Box>
      <List>
        {projects.map((p) => {
          const stats = getProjectStats(p.id)
          return (
            <ListItemButton key={p.id} onClick={() => { setEditingProject(p); setProjOpen(true) }}>
              <ListItemText primary={p.name} />
              <Badge color="secondary" badgeContent={stats.totalTasks} />
            </ListItemButton>
          )
        })}
      </List>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">
          タグ
        </Typography>
      </Box>
      <TagFilter onSelectView={onSelectView} />

      <ProjectForm open={projOpen} onClose={() => setProjOpen(false)} project={editingProject} />
    </Box>
  )

  return (
    <>
      {/* Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {content}
      </Drawer>
      {/* Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {content}
      </Drawer>
    </>
  )
}


