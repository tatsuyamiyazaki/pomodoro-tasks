import { create } from 'zustand'
import { StorageService } from '../../services/storage'
import type { Tag, Task } from '../../shared/types'

function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      // @ts-ignore
      return crypto.randomUUID()
    }
  } catch {}
  return 'tag_' + Math.random().toString(36).slice(2, 10)
}

function isoNow(): string {
  return new Date().toISOString()
}

const storage = new StorageService()
let saveTimer: ReturnType<typeof setTimeout> | null = null
let persistenceDelayMs = 300
function scheduleSave(tags: Tag[]) {
  if (saveTimer) clearTimeout(saveTimer)
  if (persistenceDelayMs <= 0) {
    storage.save('tags', tags)
    saveTimer = null
    return
  }
  saveTimer = setTimeout(() => {
    storage.save('tags', tags)
    saveTimer = null
  }, persistenceDelayMs)
}

type Resolvers = {
  /** Return tasks which contain this tag id */
  getTasksWithTag: (tagId: string) => Task[]
}

type Integrations = {
  /** Called after a tag is deleted so dependent stores can react */
  onTagDeleted: (tagId: string) => void
}

const resolversRef: Resolvers = {
  getTasksWithTag: () => [],
}

const integrationsRef: Partial<Integrations> = {}

export function configureTagStore(options: {
  debounceMs?: number
  resolvers?: Partial<Resolvers>
  integrations?: Partial<Integrations>
}) {
  if (typeof options.debounceMs === 'number') persistenceDelayMs = options.debounceMs
  if (options.resolvers?.getTasksWithTag) resolversRef.getTasksWithTag = options.resolvers.getTasksWithTag
  if (options.integrations) Object.assign(integrationsRef, options.integrations)
}

export interface CreateTagInput {
  name: string
  color?: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
}

function normName(n: string): string {
  return (n ?? '').trim().toLowerCase()
}

function isValidHexColor(value: string | undefined): boolean {
  if (!value) return true
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

type State = {
  tags: Tag[]
  // init/load
  loadFromStorage: () => void
  setResolvers: (res: { resolvers?: Partial<Resolvers>; integrations?: Partial<Integrations> }) => void
  // queries
  getTagById: (id: string) => Tag | undefined
  getTagTaskCount: (tagId: string) => number
  // CRUD
  createTag: (input: CreateTagInput) => Tag
  getOrCreateTag: (name: string, color?: string) => Tag
  updateTag: (id: string, input: UpdateTagInput) => Tag | null
  deleteTag: (id: string) => void
}

export const useTagStore = create<State>((set, get) => ({
  tags: (() => {
    const loaded = storage.load<Tag[]>('tags')
    return loaded.ok && Array.isArray(loaded.value) ? loaded.value : []
  })(),

  setResolvers: ({ resolvers, integrations }) => {
    if (resolvers) configureTagStore({ resolvers })
    if (integrations) configureTagStore({ integrations })
  },

  loadFromStorage: () => {
    const loaded = storage.load<Tag[]>('tags')
    if (loaded.ok && Array.isArray(loaded.value)) set({ tags: loaded.value })
  },

  getTagById: (id) => get().tags.find((t) => t.id === id),

  getTagTaskCount: (tagId) => {
    const tasks = resolversRef.getTasksWithTag(tagId) || []
    return tasks.length
  },

  createTag: (input) => {
    const name = input.name?.trim()
    if (!name) throw new Error('Tag name is required')
    if (!isValidHexColor(input.color)) throw new Error('Invalid color format. Expected hex like #fff or #ffffff')
    const exists = get().tags.find((t) => normName(t.name) === normName(name))
    if (exists) throw new Error(`Tag name already exists: ${name}`)
    const now = isoNow()
    const tag: Tag = { id: genId(), name, color: input.color, createdAt: now, updatedAt: now }
    set((s) => {
      const tags = [tag, ...s.tags]
      scheduleSave(tags)
      return { tags }
    })
    return tag
  },

  getOrCreateTag: (name, color) => {
    const trimmed = (name ?? '').trim()
    if (!trimmed) throw new Error('Tag name is required')
    const existing = get().tags.find((t) => normName(t.name) === normName(trimmed))
    if (existing) return existing
    return get().createTag({ name: trimmed, color })
  },

  updateTag: (id, input) => {
    let updated: Tag | null = null
    set((s) => {
      const next = s.tags.map((t) => {
        if (t.id !== id) return t
        const nextName = 'name' in input ? (input.name ?? t.name) : t.name
        if (!nextName || nextName.trim().length === 0) throw new Error('Tag name is required')
        const dup = s.tags.find((x) => x.id !== id && normName(x.name) === normName(nextName))
        if (dup) throw new Error(`Tag name already exists: ${nextName}`)
        if (!isValidHexColor(input.color)) throw new Error('Invalid color format. Expected hex like #fff or #ffffff')
        updated = {
          ...t,
          name: nextName,
          ...(input.color !== undefined ? { color: input.color } : {}),
          updatedAt: isoNow(),
        }
        return updated!
      })
      scheduleSave(next)
      return { tags: next }
    })
    return updated
  },

  deleteTag: (id) => {
    set((s) => {
      const tags = s.tags.filter((t) => t.id !== id)
      scheduleSave(tags)
      return { tags }
    })
    integrationsRef.onTagDeleted?.(id)
  },
}))

export type { Tag }
