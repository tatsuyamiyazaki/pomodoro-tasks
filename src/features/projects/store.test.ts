import { beforeEach, describe, it, expect } from 'vitest'
import { useProjectStore, configureProjectStore } from './store'
import type { Task } from '../../shared/types'

describe('ProjectStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useProjectStore.setState({
      projects: [],
      loadFromStorage: useProjectStore.getState().loadFromStorage,
      setResolvers: useProjectStore.getState().setResolvers,
      getProjectById: useProjectStore.getState().getProjectById,
      getProjectStats: useProjectStore.getState().getProjectStats,
      createProject: useProjectStore.getState().createProject,
      updateProject: useProjectStore.getState().updateProject,
      deleteProject: useProjectStore.getState().deleteProject,
    })
    configureProjectStore({ debounceMs: 0 })
  })

  it('performs CRUD operations', () => {
    const s = useProjectStore.getState()
    const p = s.createProject({ name: 'Proj', color: '#fff' })
    expect(useProjectStore.getState().projects.length).toBe(1)
    const upd = s.updateProject(p.id, { name: 'Proj*' })
    expect(upd).not.toBeNull()
    expect(upd!.name).toBe('Proj*')
    s.deleteProject(p.id)
    expect(useProjectStore.getState().projects.length).toBe(0)
  })

  it('gets project by id and computes stats', () => {
    const s = useProjectStore.getState()
    const p = s.createProject({ name: 'P' })
    expect(s.getProjectById(p.id)?.name).toBe('P')

    const allTasks: Task[] = [
      { id: 't1', name: 'A', completed: false, projectId: p.id },
      { id: 't2', name: 'B', completed: true, projectId: p.id },
      { id: 't3', name: 'C', completed: false, projectId: 'other' },
    ]
    configureProjectStore({ resolvers: { getTasksForProject: (pid) => allTasks.filter((t) => t.projectId === pid) } })
    const stats = s.getProjectStats(p.id)
    expect(stats.totalTasks).toBe(2)
    expect(stats.completedTasks).toBe(1)
  })

  it('notifies integration on delete to clear related task projectId', () => {
    const s = useProjectStore.getState()
    const p = s.createProject({ name: 'P' })
    const tasks: Task[] = [
      { id: 't1', name: 'A', completed: false, projectId: p.id },
      { id: 't2', name: 'B', completed: true, projectId: p.id },
      { id: 't3', name: 'C', completed: false, projectId: 'keep' },
    ]
    configureProjectStore({
      integrations: {
        onProjectDeleted: (pid) => {
          for (const t of tasks) if (t.projectId === pid) t.projectId = null
        },
      },
    })
    s.deleteProject(p.id)
    expect(tasks.find((t) => t.id === 't1')!.projectId).toBeNull()
    expect(tasks.find((t) => t.id === 't2')!.projectId).toBeNull()
    expect(tasks.find((t) => t.id === 't3')!.projectId).toBe('keep')
  })

  it('persists to localStorage', () => {
    const s = useProjectStore.getState()
    s.createProject({ name: 'Persisted' })
    const saved = localStorage.getItem('projects')
    expect(saved).not.toBeNull()
    const parsed = JSON.parse(saved!)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)
  })
})

