import './App.css'
import { useEffect, useState } from 'react'
import { Layout } from './features/layout/Layout'
import { TaskForm, TaskList } from './features/tasks'
import { PomodoroTimer } from './features/pomodoro'
import { useProjectStore } from './features/projects/store'
import { useTagStore } from './features/tags/store'
import { useTaskStore, configureTaskStore } from './features/tasks/store'

export default function App({
  themeMode,
  onToggleTheme,
}: {
  themeMode: 'light' | 'dark'
  onToggleTheme: () => void
}) {
  // Configure cross-store resolvers for counts and search integration
  useEffect(() => {
    // Wire projects/tags to tasks for counts
    useProjectStore.getState().setResolvers({
      resolvers: {
        getTasksForProject: (projectId) => useTaskStore.getState().tasks.filter((t) => t.projectId === projectId),
      },
    })
    useTagStore.getState().setResolvers({
      resolvers: {
        getTasksWithTag: (tagId) => useTaskStore.getState().tasks.filter((t) => (t.tagIds ?? []).includes(tagId)),
      },
    })
    // Wire task store name resolvers for search friendliness
    configureTaskStore({
      resolvers: {
        getProjectNameById: (id) => useProjectStore.getState().projects.find((p) => p.id === id)?.name,
        getTagNameById: (id) => useTagStore.getState().tags.find((t) => t.id === id)?.name,
      },
    })
  }, [])

  return (
    <Layout
      themeMode={themeMode}
      onToggleTheme={onToggleTheme}
      renderMain={(view) => <MainArea view={view} />}
    />
  )
}

function MainArea({ view }: { view: string }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<null | import('./shared/types').Task>(null)
  return (
    <>
      <PomodoroTimer />
      <TaskList
        viewKey={view}
        onEdit={(t) => {
          setEditing(t)
          setOpen(true)
        }}
      />
      <TaskForm open={open} onClose={() => setOpen(false)} task={editing} />
    </>
  )
}
