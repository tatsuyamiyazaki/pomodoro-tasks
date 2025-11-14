import { create } from 'zustand'
import { StorageService } from '../../services/storage'
import type { Task, SubTask, TaskPriority } from '../../shared/types'

// ID generator using Web Crypto when available
function genId(): string {
  try {
    // crypto.randomUUID is widely available in modern runtimes
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      // @ts-ignore - older TS lib may not declare randomUUID
      return crypto.randomUUID()
    }
  } catch {}
  // Fallback
  return 'id_' + Math.random().toString(36).slice(2, 10)
}

// Date helpers
function toStartOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function parseDate(input?: string | null): Date | null {
  if (!input) return null
  // Allow plain date (YYYY-MM-DD) or full ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, day] = input.split('-').map(Number)
    return new Date(y, (m || 1) - 1, day || 1)
  }
  const t = Date.parse(input)
  return Number.isNaN(t) ? null : new Date(t)
}

function isoNow(): string {
  return new Date().toISOString()
}

// Debounced persistence to localStorage via StorageService
const storage = new StorageService()
let saveTimer: ReturnType<typeof setTimeout> | null = null
let persistenceDelayMs = 300
function scheduleSave(tasks: Task[]) {
  if (saveTimer) clearTimeout(saveTimer)
  if (persistenceDelayMs <= 0) {
    storage.save('tasks', tasks)
    saveTimer = null
    return
  }
  saveTimer = setTimeout(() => {
    storage.save('tasks', tasks)
    saveTimer = null
  }, persistenceDelayMs)
}

export type TaskFilter =
  | 'today'
  | 'overdue'
  | 'tomorrow'
  | 'thisWeek'
  | 'next7Days'
  | 'highPriority'
  | 'upcoming'
  | 'completed'
  | 'all'

export interface CreateTaskInput {
  name: string
  projectId?: string | null
  tagIds?: string[]
  dueDate?: string | null
  priority?: TaskPriority
  description?: string | null
  estimatedPomodoros?: number
  estimatedDurationMinutes?: number
}

export interface UpdateTaskInput {
  name?: string
  projectId?: string | null
  tagIds?: string[]
  dueDate?: string | null
  priority?: TaskPriority
  completed?: boolean
  estimatedPomodoros?: number
  completedPomodoros?: number
  description?: string | null
  estimatedDurationMinutes?: number
}

type State = {
  tasks: Task[]
  searchQuery: string
  setResolvers: (resolvers: Partial<Resolvers>) => void
  // CRUD
  createTask: (input: CreateTaskInput) => Task
  updateTask: (id: string, input: UpdateTaskInput) => Task | null
  deleteTask: (id: string) => void
  toggleTaskCompletion: (id: string) => Task | null
  // Subtasks
  addSubTask: (taskId: string, title: string) => SubTask | null
  updateSubTask: (taskId: string, subTaskId: string, input: { title?: string; completed?: boolean }) => SubTask | null
  deleteSubTask: (taskId: string, subTaskId: string) => void
  toggleSubTaskCompletion: (taskId: string, subTaskId: string) => SubTask | null
  // Derived/queries
  getFilteredTasks: (filter: TaskFilter) => Task[]
  setSearchQuery: (q: string) => void
  reorderTasks: (taskIds: string[]) => void
  // Init/load
  loadFromStorage: () => void
}

type Resolvers = {
  getProjectNameById: (id: string | null | undefined) => string | undefined
  getTagNameById: (id: string) => string | undefined
}

const resolversRef: Resolvers = {
  getProjectNameById: () => undefined,
  getTagNameById: () => undefined,
}

export function configureTaskStore(options: { debounceMs?: number; resolvers?: Partial<Resolvers> }) {
  if (typeof options.debounceMs === 'number') persistenceDelayMs = options.debounceMs
  if (options.resolvers) {
    if (options.resolvers.getProjectNameById) resolversRef.getProjectNameById = options.resolvers.getProjectNameById
    if (options.resolvers.getTagNameById) resolversRef.getTagNameById = options.resolvers.getTagNameById
  }
}

export const useTaskStore = create<State>((set, get) => ({
  tasks: (() => {
    const loaded = storage.load<Task[]>('tasks')
    return loaded.ok && Array.isArray(loaded.value) ? loaded.value : []
  })(),
  searchQuery: '',
  setResolvers: (res) => {
    configureTaskStore({ resolvers: res })
  },

  setSearchQuery: (q) => set({ searchQuery: q ?? '' }),

  loadFromStorage: () => {
    const loaded = storage.load<Task[]>('tasks')
    if (loaded.ok && Array.isArray(loaded.value)) {
      set({ tasks: loaded.value })
    }
  },

  createTask: (input) => {
    const now = isoNow()
    const newTask: Task = {
      id: genId(),
      name: input.name,
      completed: false,
      projectId: input.projectId ?? null,
      tagIds: input.tagIds ?? [],
      dueDate: input.dueDate ?? null,
      priority: input.priority,
      description: input.description ?? null,
      estimatedPomodoros: input.estimatedPomodoros,
      estimatedDurationMinutes: input.estimatedDurationMinutes ?? 25,
      subTasks: [],
      createdAt: now,
      updatedAt: now,
    }
    set((s) => {
      const tasks = [newTask, ...s.tasks]
      scheduleSave(tasks)
      return { tasks }
    })
    return newTask
  },

  updateTask: (id, input) => {
    let updated: Task | null = null
    set((s) => {
      const tasks = s.tasks.map((t) => {
        if (t.id !== id) return t
        updated = {
          ...t,
          ...('name' in input ? { name: input.name ?? t.name } : {}),
          ...('projectId' in input ? { projectId: input.projectId ?? null } : {}),
          ...('tagIds' in input ? { tagIds: input.tagIds ?? [] } : {}),
          ...('dueDate' in input ? { dueDate: input.dueDate ?? null } : {}),
          ...('priority' in input ? { priority: input.priority } : {}),
          ...('completed' in input ? { completed: Boolean(input.completed) } : {}),
          ...('estimatedPomodoros' in input ? { estimatedPomodoros: input.estimatedPomodoros } : {}),
          ...('completedPomodoros' in input ? { completedPomodoros: input.completedPomodoros } : {}),
          ...('description' in input ? { description: input.description ?? t.description ?? null } : {}),
          ...('estimatedDurationMinutes' in input ? { estimatedDurationMinutes: input.estimatedDurationMinutes } : {}),
          updatedAt: isoNow(),
        }
        return updated!
      })
      scheduleSave(tasks)
      return { tasks }
    })
    return updated
  },

  deleteTask: (id) => {
    set((s) => {
      const tasks = s.tasks.filter((t) => t.id !== id)
      scheduleSave(tasks)
      return { tasks }
    })
  },

  toggleTaskCompletion: (id) => {
    let updated: Task | null = null
    set((s) => {
      const tasks = s.tasks.map((t) => {
        if (t.id !== id) return t
        updated = { ...t, completed: !t.completed, updatedAt: isoNow() }
        return updated!
      })
      scheduleSave(tasks)
      return { tasks }
    })
    return updated
  },

  addSubTask: (taskId, title) => {
    let created: SubTask | null = null
    set((s) => {
      const tasks = s.tasks.map((t) => {
        if (t.id !== taskId) return t
        const now = isoNow()
        const sub: SubTask = { id: genId(), title, completed: false, createdAt: now, updatedAt: now }
        created = sub
        const subTasks = Array.isArray(t.subTasks) ? [sub, ...t.subTasks] : [sub]
        return { ...t, subTasks, updatedAt: now }
      })
      scheduleSave(tasks)
      return { tasks }
    })
    return created
  },

  updateSubTask: (taskId, subTaskId, input) => {
    let updated: SubTask | null = null
    set((s) => {
      const tasks = s.tasks.map((t) => {
        if (t.id !== taskId) return t
        const nextSubs = (t.subTasks ?? []).map((st) => {
          if (st.id !== subTaskId) return st
          updated = {
            ...st,
            ...('title' in input ? { title: input.title ?? st.title } : {}),
            ...('completed' in input ? { completed: Boolean(input.completed) } : {}),
            updatedAt: isoNow(),
          }
          return updated!
        })
        return { ...t, subTasks: nextSubs, updatedAt: isoNow() }
      })
      scheduleSave(tasks)
      return { tasks }
    })
    return updated
  },

  deleteSubTask: (taskId, subTaskId) => {
    set((s) => {
      const tasks = s.tasks.map((t) => {
        if (t.id !== taskId) return t
        const nextSubs = (t.subTasks ?? []).filter((st) => st.id !== subTaskId)
        return { ...t, subTasks: nextSubs, updatedAt: isoNow() }
      })
      scheduleSave(tasks)
      return { tasks }
    })
  },

  toggleSubTaskCompletion: (taskId, subTaskId) => {
    let updated: SubTask | null = null
    set((s) => {
      const tasks = s.tasks.map((t) => {
        if (t.id !== taskId) return t
        const nextSubs = (t.subTasks ?? []).map((st) => {
          if (st.id !== subTaskId) return st
          updated = { ...st, completed: !st.completed, updatedAt: isoNow() }
          return updated!
        })
        return { ...t, subTasks: nextSubs, updatedAt: isoNow() }
      })
      scheduleSave(tasks)
      return { tasks }
    })
    return updated
  },

  getFilteredTasks: (filter) => {
    const q = get().searchQuery.trim().toLowerCase()
    const tasks = get().tasks
    if (filter === 'all' && q.length === 0) return tasks.slice()
    const now = new Date()
    const today = toStartOfDay(now).getTime()
    const inDays = (n: number) => new Date(toStartOfDay(now).getTime() + n * 86400000)
    const endOfWeek = (() => {
      const d = new Date(now)
      const day = d.getDay() // 0 Sun .. 6 Sat
      const diff = 6 - day // Saturday as week end
      return toStartOfDay(inDays(diff))
    })()

    const byFilter = tasks.filter((t) => {
      const due = parseDate(t.dueDate)?.getTime() ?? null
      switch (filter) {
        case 'completed':
          return t.completed
        case 'highPriority':
          return t.priority === 'high'
        case 'today':
          return due !== null && toStartOfDay(new Date(due)).getTime() === today
        case 'tomorrow':
          return due !== null && toStartOfDay(new Date(due)).getTime() === toStartOfDay(inDays(1)).getTime()
        case 'overdue':
          return due !== null && toStartOfDay(new Date(due)).getTime() < today && !t.completed
        case 'thisWeek':
          return (
            due !== null &&
            toStartOfDay(new Date(due)).getTime() >= today &&
            toStartOfDay(new Date(due)).getTime() <= endOfWeek.getTime()
          )
        case 'next7Days': {
          const until = toStartOfDay(inDays(7)).getTime()
          const dd = due !== null ? toStartOfDay(new Date(due)).getTime() : null
          return dd !== null && dd > today && dd <= until
        }
        case 'upcoming':
          return due !== null && toStartOfDay(new Date(due)).getTime() > today
        default:
          return true
      }
    })
    if (q.length === 0) return byFilter
    // Search over name/description + optional tag/project names via resolvers
    return byFilter.filter((t) => {
      const name = t.name?.toLowerCase?.() ?? ''
      const desc = (t.description ?? '').toLowerCase()
      const proj = resolversRef.getProjectNameById(t.projectId)?.toLowerCase?.() ?? ''
      const tags = (t.tagIds ?? [])
        .map((gid) => resolversRef.getTagNameById(gid)?.toLowerCase?.() ?? '')
        .join(' ')
      return name.includes(q) || desc.includes(q) || proj.includes(q) || tags.includes(q)
    })
  },

  reorderTasks: (taskIds) => {
    set((s) => {
      const idPos = new Map<string, number>()
      taskIds.forEach((id, idx) => idPos.set(id, idx))
      const known = s.tasks.filter((t) => idPos.has(t.id)).sort((a, b) => (idPos.get(a.id)! - idPos.get(b.id)!))
      const unknown = s.tasks.filter((t) => !idPos.has(t.id))
      const tasks = [...known, ...unknown]
      scheduleSave(tasks)
      return { tasks }
    })
  },
}))

export type { Task, SubTask, TaskPriority }



