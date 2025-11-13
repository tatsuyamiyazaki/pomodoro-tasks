// StorageService implementation - Phase 2
/**
 * StorageService wraps localStorage access with:
 * - Namespacing for keys
 * - JSON serialization with typed results
 * - Space metrics helpers
 * - Export/Import for domain data bundles
 */
import type { ExportData, ImportOptions, Result, StorageError } from '../shared/types'

function ok<T>(value: T): Result<T, StorageError> {
  return { ok: true, value }
}

function err(type: StorageError['type'], message: string, cause?: unknown): Result<never, StorageError> {
  return { ok: false, error: { type, message, cause } }
}

/** Heuristic detection for quota exceeded across runtimes */
function isQuotaExceededError(e: unknown): boolean {
  // Best-effort detection across browsers and jsdom
  // DOMException name may be 'QuotaExceededError' or code 22/1014
  if (typeof window === 'undefined') return false
  const anyErr = e as any
  if (anyErr && typeof anyErr === 'object') {
    if (anyErr.name === 'QuotaExceededError') return true
    if (typeof anyErr.code === 'number' && (anyErr.code === 22 || anyErr.code === 1014)) return true
    if (typeof anyErr.message === 'string' && anyErr.message.toLowerCase().includes('quota')) return true
  }
  return false
}

/** UTF-8 byte length of a string */
function byteLength(input: string): number {
  // Prefer TextEncoder when available
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(input).length
  }
  // Fallback for Node without TextEncoder
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const buf = (require('buffer') as typeof import('buffer')).Buffer
    return buf.byteLength(input, 'utf8')
  } catch {
    // Last resort approximation (UTF-16 length * 2)
    return input.length * 2
  }
}

/** Obtain localStorage, safely handling SSR/test environments */
function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

const APP_VERSION = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_APP_VERSION) || '0.0.0'

export class StorageService {
  private readonly namespace: string | null

  constructor(namespace?: string) {
    this.namespace = namespace ? namespace : null
  }

  /** Build a fully qualified key under the namespace */
  private k(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key
  }

  /** Check if a fully-qualified key is within this service's namespace */
  private matchesNamespace(fullKey: string): boolean {
    if (!this.namespace) return true
    return fullKey.startsWith(`${this.namespace}:`)
  }

  /** Save a JSON-serializable value under key */
  save<T>(key: string, value: T): Result<void, StorageError> {
    const storage = getStorage()
    if (!storage) return err('unknown', `localStorage is not available (op=save, key=${this.k(key)})`)
    try {
      const payload = JSON.stringify(value)
      storage.setItem(this.k(key), payload)
      return ok<void>(undefined)
    } catch (e) {
      if (isQuotaExceededError(e)) return err('quota_exceeded', `Quota exceeded while saving key ${this.k(key)}`, e)
      return err('unknown', `Failed to save key ${this.k(key)}: ${(e as any)?.message ?? 'unknown error'}`, e)
    }
  }

  /** Load and parse a JSON value from key */
  load<T>(key: string): Result<T, StorageError> {
    const storage = getStorage()
    if (!storage) return err('unknown', `localStorage is not available (op=load, key=${this.k(key)})`)
    try {
      const raw = storage.getItem(this.k(key))
      if (raw === null) return err('not_found', `Key not found: ${this.k(key)}`)
      try {
        return ok(JSON.parse(raw) as T)
      } catch (e) {
        return err('parse_error', `Failed to parse JSON for key ${this.k(key)}: ${(e as any)?.message ?? ''}`.trim(), e)
      }
    } catch (e) {
      return err('unknown', `Failed to load key ${this.k(key)}: ${(e as any)?.message ?? 'unknown error'}`, e)
    }
  }

  /** Remove a key */
  remove(key: string): Result<void, StorageError> {
    const storage = getStorage()
    if (!storage) return err('unknown', `localStorage is not available (op=remove, key=${this.k(key)})`)
    try {
      storage.removeItem(this.k(key))
      return ok<void>(undefined)
    } catch (e) {
      return err('unknown', `Failed to remove key ${this.k(key)}: ${(e as any)?.message ?? 'unknown error'}`, e)
    }
  }

  /** Clear all keys within namespace, or everything if no namespace */
  clear(): Result<void, StorageError> {
    const storage = getStorage()
    if (!storage) return err('unknown', 'localStorage is not available (op=clear)')
    try {
      if (this.namespace) {
        const toRemove: string[] = []
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i)
          if (k && this.matchesNamespace(k)) toRemove.push(k)
        }
        toRemove.forEach((k) => storage.removeItem(k))
      } else {
        storage.clear()
      }
      return ok<void>(undefined)
    } catch (e) {
      return err('unknown', `Failed to clear localStorage${this.namespace ? ` for namespace ${this.namespace}` : ''}: ${(e as any)?.message ?? 'unknown error'}`, e)
    }
  }

  /** Sum of key+value byte lengths for keys in namespace */
  getUsedSpace(): number {
    const storage = getStorage()
    if (!storage) return 0
    let bytes = 0
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (!k) continue
      if (!this.matchesNamespace(k)) continue
      const v = storage.getItem(k) ?? ''
      bytes += byteLength(k) + byteLength(v)
    }
    return bytes
  }

  /** Best-effort estimate of remaining storable bytes for this origin */
  getAvailableSpace(maxProbeBytes = 10 * 1024 * 1024): number {
    const storage = getStorage()
    if (!storage) return 0
    const probeKey = this.k('__probe__')
    try {
      // Binary search the largest value that can be stored under probeKey
      let low = 0
      let high = maxProbeBytes
      const chunk = '0'.repeat(1024) // 1KB chunk
      function makeSize(n: number): string {
        if (n <= 0) return ''
        const full = Math.floor(n / 1024)
        const tail = n % 1024
        return chunk.repeat(full) + (tail > 0 ? '0'.repeat(tail) : '')
      }
      while (low < high) {
        const mid = low + Math.ceil((high - low) / 2)
        try {
          storage.setItem(probeKey, makeSize(mid))
          low = mid
        } catch (e) {
          if (isQuotaExceededError(e)) {
            high = mid - 1
          } else {
            throw e
          }
        }
      }
      // Cleanup
      storage.removeItem(probeKey)
      return low
    } catch (e) {
      // Attempt cleanup if possible
      try {
        storage.removeItem(probeKey)
      } catch {}
      // On any error, return 0 as a safe fallback for metrics
      return 0
    }
  }

  /** Build an ExportData object by reading domain keys from storage */
  exportData(): Result<ExportData, StorageError> {
    const storage = getStorage()
    if (!storage) return err('unknown', 'localStorage is not available (op=exportData)')
    try {
      const tasksRaw = storage.getItem(this.k('tasks'))
      const projectsRaw = storage.getItem(this.k('projects'))
      const tagsRaw = storage.getItem(this.k('tags'))
      const pomoRaw = storage.getItem(this.k('pomodoro_settings'))

      function parseOr<T>(raw: string | null, fallback: T): T {
        if (!raw) return fallback
        try {
          return JSON.parse(raw) as T
        } catch {
          return fallback
        }
      }

      const data: ExportData = {
        version: String(APP_VERSION),
        exportedAt: new Date(),
        tasks: parseOr(tasksRaw, []),
        projects: parseOr(projectsRaw, []),
        tags: parseOr(tagsRaw, []),
        settings: {
          pomodoro: parseOr(pomoRaw, {
            focusMinutes: 25,
            shortBreakMinutes: 5,
            longBreakMinutes: 15,
            longBreakInterval: 4,
          }),
          theme: 'light',
        },
      }
      return ok(data)
    } catch (e) {
      return err('unknown', `Failed to export data: ${(e as any)?.message ?? 'unknown error'}`, e)
    }
  }

  /** Validate and import an ExportData payload into storage */
  importData(data: ExportData, options?: ImportOptions): Result<void, StorageError> {
    const storage = getStorage()
    if (!storage) return err('unknown', 'localStorage is not available (op=importData)')
    const strategy = options?.strategy ?? 'overwrite'
    try {
      // Structural and referential validation
      const { errors, warnings } = validateExportData(data)
      if (errors.length > 0 || (options?.strict && warnings.length > 0)) {
        const msg = `Invalid export data: ${[...errors, ...(options?.strict ? warnings : [])].join('; ')}`
        return err('parse_error', msg)
      }

      function write(key: string, value: unknown) {
        const full = (typeof value === 'string' ? value : JSON.stringify(value)) as string
        const exists = storage.getItem(key) !== null
        if (exists && strategy === 'merge') return
        storage.setItem(key, full)
      }

      try {
        write(this.k('tasks'), data.tasks)
        write(this.k('projects'), data.projects)
        write(this.k('tags'), data.tags)
        write(this.k('pomodoro_settings'), data.settings.pomodoro)
      } catch (e) {
        if (isQuotaExceededError(e)) return err('quota_exceeded', 'localStorage quota exceeded during import', e)
        return err('unknown', `Failed during import: ${(e as any)?.message ?? 'unknown error'}`, e)
      }
      return ok<void>(undefined)
    } catch (e) {
      return err('unknown', `Failed to import data: ${(e as any)?.message ?? 'unknown error'}`, e)
    }
  }
}

/** Validate ExportData structure and referential integrity */
function validateExportData(data: ExportData): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  if (!data || typeof data !== 'object') {
    return { errors: ['payload not an object'], warnings }
  }
  if (typeof data.version !== 'string' || data.version.length === 0) {
    errors.push('version must be a non-empty string')
  }
  // exportedAt may be Date or ISO string when deserialized elsewhere
  const exportedAtOk = data.exportedAt instanceof Date || (typeof (data as any).exportedAt === 'string' && !Number.isNaN(Date.parse((data as any).exportedAt)))
  if (!exportedAtOk) warnings.push('exportedAt is not a valid Date or ISO string')

  if (!Array.isArray(data.tasks)) errors.push('tasks must be an array')
  if (!Array.isArray(data.projects)) errors.push('projects must be an array')
  if (!Array.isArray(data.tags)) errors.push('tags must be an array')
  if (!data.settings || typeof data.settings !== 'object') errors.push('settings must be an object')

  // Short-circuit further checks on structural errors
  if (errors.length > 0) return { errors, warnings }

  // Unique IDs
  const projIds = new Set<string>()
  for (const p of data.projects) {
    if (!p || typeof p.id !== 'string' || p.id.length === 0) errors.push('project with invalid id')
    else if (projIds.has(p.id)) errors.push(`duplicate project id ${p.id}`)
    else projIds.add(p.id)
  }

  const tagIds = new Set<string>()
  for (const t of data.tags) {
    if (!t || typeof t.id !== 'string' || t.id.length === 0) errors.push('tag with invalid id')
    else if (tagIds.has(t.id)) errors.push(`duplicate tag id ${t.id}`)
    else tagIds.add(t.id)
  }

  // Tasks integrity
  for (const task of data.tasks) {
    if (!task || typeof task.id !== 'string' || task.id.length === 0) errors.push('task with invalid id')
    if (typeof (task as any).title !== 'string') warnings.push(`task ${task?.id ?? '?'} missing/invalid title`)
    if (typeof (task as any).completed !== 'boolean') warnings.push(`task ${task?.id ?? '?'} missing/invalid completed flag`)
    if (task.projectId && !projIds.has(task.projectId)) errors.push(`task ${task.id} references missing project ${task.projectId}`)
    if (Array.isArray(task.tagIds)) {
      for (const gid of task.tagIds) {
        if (!tagIds.has(gid)) errors.push(`task ${task.id} references missing tag ${gid}`)
      }
    }
  }

  // Pomodoro settings sanity
  const ps = data.settings.pomodoro
  const nums: Array<[string, number]> = [
    ['focusMinutes', (ps as any)?.focusMinutes],
    ['shortBreakMinutes', (ps as any)?.shortBreakMinutes],
    ['longBreakMinutes', (ps as any)?.longBreakMinutes],
    ['longBreakInterval', (ps as any)?.longBreakInterval],
  ]
  for (const [k, v] of nums) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) warnings.push(`pomodoro setting ${k} is non-positive or invalid`)
  }

  if (data.settings.theme !== 'light' && data.settings.theme !== 'dark') warnings.push('settings.theme must be light|dark')

  return { errors, warnings }
}

// Default instance with app namespace
export const storageService = new StorageService('ptm')

export default StorageService
