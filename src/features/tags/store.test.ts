import { beforeEach, describe, it, expect } from 'vitest'
import { useTagStore, configureTagStore } from './store'
import type { Task } from '../../shared/types'

describe('TagStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useTagStore.setState({
      tags: [],
      loadFromStorage: useTagStore.getState().loadFromStorage,
      setResolvers: useTagStore.getState().setResolvers,
      getTagById: useTagStore.getState().getTagById,
      getTagTaskCount: useTagStore.getState().getTagTaskCount,
      createTag: useTagStore.getState().createTag,
      getOrCreateTag: useTagStore.getState().getOrCreateTag,
      updateTag: useTagStore.getState().updateTag,
      deleteTag: useTagStore.getState().deleteTag,
    })
    configureTagStore({ debounceMs: 0 })
  })

  it('performs CRUD and duplicate validation', () => {
    const s = useTagStore.getState()
    const a = s.createTag({ name: 'alpha' })
    expect(useTagStore.getState().tags.length).toBe(1)
    // duplicate create should throw
    expect(() => s.createTag({ name: 'Alpha' })).toThrow()
    const upd = s.updateTag(a.id, { name: 'alpha2' })
    expect(upd!.name).toBe('alpha2')
    // Duplicate on update should throw
    const b = s.createTag({ name: 'bravo' })
    expect(() => s.updateTag(b.id, { name: 'Alpha2' })).toThrow()
    s.deleteTag(b.id)
    expect(useTagStore.getState().tags.find((t) => t.id === b.id)).toBeUndefined()
  })

  it('getOrCreateTag returns existing or creates new', () => {
    const s = useTagStore.getState()
    const t1 = s.getOrCreateTag('news')
    const t2 = s.getOrCreateTag('NEWS')
    expect(t2.id).toBe(t1.id)
    const t3 = s.getOrCreateTag('sports')
    expect(t3.id).not.toBe(t1.id)
  })

  it('returns task count per tag via resolver', () => {
    const s = useTagStore.getState()
    const tag = s.createTag({ name: 'x' })
    const tasks: Task[] = [
      { id: 't1', name: 'A', completed: false, tagIds: [tag.id] },
      { id: 't2', name: 'B', completed: false, tagIds: [tag.id, 'other'] },
      { id: 't3', name: 'C', completed: false, tagIds: ['other'] },
    ]
    configureTagStore({ resolvers: { getTasksWithTag: (gid) => tasks.filter((t) => (t.tagIds ?? []).includes(gid)) } })
    expect(s.getTagTaskCount(tag.id)).toBe(2)
  })

  it('notifies integration on delete to remove tag from tasks', () => {
    const s = useTagStore.getState()
    const tag = s.createTag({ name: 'cleanup' })
    const tasks: Task[] = [
      { id: 't1', name: 'A', completed: false, tagIds: [tag.id] },
      { id: 't2', name: 'B', completed: false, tagIds: [tag.id, 'keep'] },
      { id: 't3', name: 'C', completed: false, tagIds: ['keep'] },
    ]
    configureTagStore({
      integrations: {
        onTagDeleted: (gid) => {
          for (const t of tasks) t.tagIds = (t.tagIds ?? []).filter((x) => x !== gid)
        },
      },
    })
    s.deleteTag(tag.id)
    expect(tasks.find((t) => t.id === 't1')!.tagIds).toEqual([])
    expect(tasks.find((t) => t.id === 't2')!.tagIds).toEqual(['keep'])
    expect(tasks.find((t) => t.id === 't3')!.tagIds).toEqual(['keep'])
  })

  it('persists to localStorage', () => {
    const s = useTagStore.getState()
    s.createTag({ name: 'Persisted' })
    const saved = localStorage.getItem('tags')
    expect(saved).not.toBeNull()
    const parsed = JSON.parse(saved!)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)
  })
})

