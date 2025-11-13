import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageService } from './storage'
import type { ExportData } from '../shared/types'

describe('StorageService', () => {
  let service: StorageService

  beforeEach(() => {
    // Fresh namespace per test
    service = new StorageService('test')
    service.clear()
  })

  it('saves and loads data', () => {
    const saveRes = service.save('item', { a: 1, b: 'x' })
    expect(saveRes.ok).toBe(true)
    const loadRes = service.load<{ a: number; b: string }>('item')
    expect(loadRes.ok).toBe(true)
    if (loadRes.ok) {
      expect(loadRes.value).toEqual({ a: 1, b: 'x' })
    }
  })

  it('returns not_found when loading missing key', () => {
    const res = service.load('missing')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.type).toBe('not_found')
  })

  it('removes and clears keys', () => {
    service.save('a', 1)
    service.save('b', 2)
    expect(service.load('a').ok).toBe(true)
    expect(service.remove('a').ok).toBe(true)
    expect(service.load('a').ok).toBe(false)
    const cleared = service.clear()
    expect(cleared.ok).toBe(true)
    expect(service.load('b').ok).toBe(false)
  })

  it('reports used space increasing after save', () => {
    const before = service.getUsedSpace()
    service.save('big', 'x'.repeat(1024))
    const after = service.getUsedSpace()
    expect(after).toBeGreaterThan(before)
  })

  it('getAvailableSpace returns non-negative number', () => {
    const avail = service.getAvailableSpace(128 * 1024) // cap probing in tests
    expect(avail).toBeGreaterThanOrEqual(0)
  })

  it('exportData and importData roundtrip', () => {
    service.save('k1', { x: 1 })
    service.save('k2', { y: 'z' })
    // Place some domain-shaped data under expected keys
    service.save('tasks', [{ id: 't1', title: 'A', completed: false }])
    service.save('projects', [{ id: 'p1', name: 'P' }])
    service.save('tags', [{ id: 'g1', name: 'G' }])
    service.save('pomodoro_settings', { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 4 })

    const exp = service.exportData()
    expect(exp.ok).toBe(true)
    if (!exp.ok) return

    const ns2 = new StorageService('test2')
    ns2.clear()
    const data: ExportData = exp.value
    const imp = ns2.importData(data, { strategy: 'overwrite' })
    expect(imp.ok).toBe(true)
    // Verify domain data arrived
    expect(ns2.load<any>('tasks').ok).toBe(true)
    expect(ns2.load<any>('projects').ok).toBe(true)
    expect(ns2.load<any>('tags').ok).toBe(true)
    expect(ns2.load<any>('pomodoro_settings').ok).toBe(true)
  })

  it('importData respects merge strategy for existing keys', () => {
    // Seed target namespace with existing data
    const target = new StorageService('test')
    target.save('tasks', [{ id: 'exists', title: 'E', completed: false }])
    const exp = service.exportData()
    if (!exp.ok) throw new Error('export failed')
    const resMerge = target.importData(exp.value, { strategy: 'merge' })
    expect(resMerge.ok).toBe(true)
    // Since merge keeps existing, ensure existing still present
    const after = target.load<any>('tasks')
    expect(after.ok).toBe(true)
    if (after.ok) expect(after.value[0]?.id).toBe('exists')
  })

  it('load returns parse_error on corrupted JSON', () => {
    // Bypass service to corrupt value
    const k = (service as any).k('bad') as string
    window.localStorage.setItem(k, '{ not json')
    const res = service.load('bad')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.type).toBe('parse_error')
  })

  it('save returns quota_exceeded when storage is full', () => {
    const domEx = new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    const fakeStorage: Storage = {
      get length() {
        return 0
      },
      clear: () => {},
      key: () => null,
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw domEx
      },
    }
    const spy = vi.spyOn(window, 'localStorage', 'get').mockReturnValue(fakeStorage)
    const res = service.save('q', { x: 1 })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.type).toBe('quota_exceeded')
    spy.mockRestore()
  })
})
