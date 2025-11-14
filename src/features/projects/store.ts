import { create } from 'zustand'
import { StorageService } from '../../services/storage'
import type { Project, Task } from '../../shared/types'

function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      // @ts-ignore
      return crypto.randomUUID()
    }
  } catch {}
  return 'proj_' + Math.random().toString(36).slice(2, 10)
}

function isoNow(): string {
  return new Date().toISOString()
}

// Debounced persistence to localStorage via StorageService
const storage = new StorageService()
let saveTimer: ReturnType<typeof setTimeout> | null = null
let persistenceDelayMs = 300
function scheduleSave(projects: Project[]) {
  if (saveTimer) clearTimeout(saveTimer)
  if (persistenceDelayMs <= 0) {
    storage.save('projects', projects)
    saveTimer = null
    return
  }
  saveTimer = setTimeout(() => {
    storage.save('projects', projects)
    saveTimer = null
  }, persistenceDelayMs)
}

type Resolvers = {
  /** Return tasks that belong to projectId */
  getTasksForProject: (projectId: string) => Task[]
}

type Integrations = {
  /** Called after a project is deleted so dependent stores can react */
  onProjectDeleted: (projectId: string) => void
}

const resolversRef: Resolvers = {
  getTasksForProject: () => [],
}

const integrationsRef: Partial<Integrations> = {}

export function configureProjectStore(options: {
  debounceMs?: number
  resolvers?: Partial<Resolvers>
  integrations?: Partial<Integrations>
}) {
  if (typeof options.debounceMs === 'number') persistenceDelayMs = options.debounceMs
  if (options.resolvers?.getTasksForProject) resolversRef.getTasksForProject = options.resolvers.getTasksForProject
  if (options.integrations) Object.assign(integrationsRef, options.integrations)
}

export interface CreateProjectInput {
  name: string
  description?: string | null
  color?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string | null
  color?: string
}

function isValidHexColor(value: string | undefined): boolean {
  if (!value) return true
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

type State = {
  projects: Project[]
  // init/load
  loadFromStorage: () => void
  setResolvers: (res: { resolvers?: Partial<Resolvers>; integrations?: Partial<Integrations> }) => void
  // queries
  getProjectById: (id: string) => Project | undefined
  getProjectStats: (projectId: string) => { totalTasks: number; completedTasks: number }
  // CRUD
  createProject: (input: CreateProjectInput) => Project
  updateProject: (id: string, input: UpdateProjectInput) => Project | null
  deleteProject: (id: string) => void
}

export const useProjectStore = create<State>((set, get) => ({
  projects: (() => {
    const loaded = storage.load<Project[]>('projects')
    return loaded.ok && Array.isArray(loaded.value) ? loaded.value : []
  })(),

  setResolvers: ({ resolvers, integrations }) => {
    if (resolvers) configureProjectStore({ resolvers })
    if (integrations) configureProjectStore({ integrations })
  },

  loadFromStorage: () => {
    const loaded = storage.load<Project[]>('projects')
    if (loaded.ok && Array.isArray(loaded.value)) set({ projects: loaded.value })
  },

  getProjectById: (id) => get().projects.find((p) => p.id === id),

  getProjectStats: (projectId) => {
    const tasks = resolversRef.getTasksForProject(projectId) || []
    const total = tasks.length
    const completed = tasks.filter((t) => t.completed).length
    return { totalTasks: total, completedTasks: completed }
  },

  createProject: (input) => {
    if (!isValidHexColor(input.color)) throw new Error('Invalid color format. Expected hex like #fff or #ffffff')
    const now = isoNow()
    const p: Project = {
      id: genId(),
      name: input.name,
      description: input.description ?? null,
      color: input.color,
      createdAt: now,
      updatedAt: now,
    }
    set((s) => {
      const projects = [p, ...s.projects]
      scheduleSave(projects)
      return { projects }
    })
    return p
  },

  updateProject: (id, input) => {
    let updated: Project | null = null
    set((s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== id) return p
        if (!isValidHexColor(input.color)) throw new Error('Invalid color format. Expected hex like #fff or #ffffff')
        updated = {
          ...p,
          ...('name' in input ? { name: input.name ?? p.name } : {}),
          ...('description' in input ? { description: input.description ?? null } : {}),
          ...('color' in input ? { color: input.color } : {}),
          updatedAt: isoNow(),
        }
        return updated!
      })
      scheduleSave(projects)
      return { projects }
    })
    return updated
  },

  deleteProject: (id) => {
    set((s) => {
      const projects = s.projects.filter((p) => p.id !== id)
      scheduleSave(projects)
      return { projects }
    })
    // Notify dependents after state updates
    integrationsRef.onProjectDeleted?.(id)
  },
}))

export type { Project }
