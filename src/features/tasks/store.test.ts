import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { useTaskStore, configureTaskStore } from './store'

function ymd(y: number, m: number, d: number): string {
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

describe('TaskStore', () => {
  beforeEach(() => {
    // Reset store state and storage
    localStorage.clear()
    useTaskStore.setState({ tasks: [], searchQuery: '', setResolvers: useTaskStore.getState().setResolvers })
    // Disable debounce for tests to avoid timers
    configureTaskStore({ debounceMs: 0 })
    // Fix system time for deterministic filters
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('performs CRUD operations', () => {
    const { createTask, updateTask, toggleTaskCompletion, deleteTask } = useTaskStore.getState()

    const t = createTask({ name: 'A', priority: 'medium' })
    expect(useTaskStore.getState().tasks.length).toBe(1)
    expect(t.completed).toBe(false)

    const upd = updateTask(t.id, { name: 'A*', priority: 'high' })
    expect(upd).not.toBeNull()
    expect(upd!.name).toBe('A*')
    expect(upd!.priority).toBe('high')

    const toggled = toggleTaskCompletion(t.id)
    expect(toggled!.completed).toBe(true)

    deleteTask(t.id)
    expect(useTaskStore.getState().tasks.length).toBe(0)
  })

  it('manages subtasks', () => {
    const s = useTaskStore.getState()
    const t = s.createTask({ name: 'Parent' })
    const st = s.addSubTask(t.id, 'Child 1')
    expect(st).not.toBeNull()
    let task = useTaskStore.getState().tasks.find((x) => x.id === t.id)!
    expect(task.subTasks!.length).toBe(1)

    const upd = s.updateSubTask(t.id, st!.id, { title: 'Child 1*' })
    expect(upd!.title).toBe('Child 1*')

    const toggled = s.toggleSubTaskCompletion(t.id, st!.id)
    expect(toggled!.completed).toBe(true)

    s.deleteSubTask(t.id, st!.id)
    task = useTaskStore.getState().tasks.find((x) => x.id === t.id)!
    expect(task.subTasks!.length).toBe(0)

  })

  it('filters tasks correctly', () => {
    const s = useTaskStore.getState()
    const tToday = s.createTask({ name: 'today', dueDate: ymd(2025, 1, 15) })
    const tTomorrow = s.createTask({ name: 'tomorrow', dueDate: ymd(2025, 1, 16) })
    const tOverdue = s.createTask({ name: 'overdue', dueDate: ymd(2025, 1, 14) })
    const tHigh = s.createTask({ name: 'high', priority: 'high' })
    const tCompleted = s.createTask({ name: 'done' })
    s.toggleTaskCompletion(tCompleted.id)
    const tThisWeek = s.createTask({ name: 'thisWeek', dueDate: ymd(2025, 1, 18) }) // Saturday
    const tNext7 = s.createTask({ name: 'next7', dueDate: ymd(2025, 1, 20) }) // within next 7 days
    const tUpcoming = s.createTask({ name: 'upcoming', dueDate: ymd(2025, 1, 23) }) // > 7 days

    // today
    expect(s.getFilteredTasks('today').map((x) => x.id)).toContain(tToday.id)
    // tomorrow
    expect(s.getFilteredTasks('tomorrow').map((x) => x.id)).toContain(tTomorrow.id)
    // overdue (not completed)
    expect(s.getFilteredTasks('overdue').map((x) => x.id)).toContain(tOverdue.id)
    expect(s.getFilteredTasks('overdue').map((x) => x.id)).not.toContain(tCompleted.id)
    // highPriority
    expect(s.getFilteredTasks('highPriority').map((x) => x.id)).toContain(tHigh.id)
    // completed
    expect(s.getFilteredTasks('completed').map((x) => x.id)).toContain(tCompleted.id)
    // thisWeek
    expect(s.getFilteredTasks('thisWeek').map((x) => x.id)).toContain(tThisWeek.id)
    // next7Days excludes today and includes dates within next 7 days
    expect(s.getFilteredTasks('next7Days').map((x) => x.id)).toContain(tNext7.id)
    // upcoming (strictly future beyond today)
    expect(s.getFilteredTasks('upcoming').map((x) => x.id)).toContain(tUpcoming.id)
  })

  it('supports search by title and description', () => {
    const s = useTaskStore.getState()
    const a = s.createTask({ name: 'Alpha task', dueDate: null })
    const b = s.createTask({ name: 'Bravo task', dueDate: null })
    // simulate description update
    s.updateTask(b.id, { name: 'Bravo task', })
    // direct mutate via update to add description
    const withDesc = s.updateTask(b.id, {})
    // since description is not part of update input, patch state directly for test
    useTaskStore.setState((state) => ({
      tasks: state.tasks.map((t) => (t.id === b.id ? { ...t, description: 'contains alpha keyword' } : t)),
    }))

    s.setSearchQuery('alpha')
    const results = s.getFilteredTasks('all')
    const ids = results.map((x) => x.id)
    expect(ids).toContain(a.id)
    expect(ids).toContain(b.id)

    s.setSearchQuery('bravo')
    const results2 = s.getFilteredTasks('all')
    expect(results2.map((x) => x.id)).toContain(b.id)
    expect(results2.map((x) => x.id)).not.toContain(a.id)

  })

  it('reorders tasks according to provided ids', () => {
    const s = useTaskStore.getState()
    const a = s.createTask({ name: 'A' })
    const b = s.createTask({ name: 'B' })
    const c = s.createTask({ name: 'C' })

    s.reorderTasks([c.id, b.id, a.id])
    const order = useTaskStore.getState().tasks.map((t) => t.id)
    expect(order.slice(0, 3)).toEqual([c.id, b.id, a.id])

  })

  it('persists to localStorage after debounce', () => {
    const s = useTaskStore.getState()
    s.createTask({ name: 'Persist me' })
    // With debounce disabled, it should be present immediately
    const saved = localStorage.getItem('tasks')
    expect(saved).not.toBeNull()
    const parsed = JSON.parse(saved!)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)
  })
})
