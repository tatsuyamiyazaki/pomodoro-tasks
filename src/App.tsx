import './App.css'
import { useEffect } from 'react'
import { Layout } from './features/layout/Layout'
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
    <Layout themeMode={themeMode} onToggleTheme={onToggleTheme}>
      {/* Phase 7 will populate the main content with TaskList/TaskForm */}
      <div>
        <h2>Welcome</h2>
        <p>Use the sidebar to choose a view, search from the top bar, or quick add a task.</p>
      </div>
    </Layout>
  )
}
