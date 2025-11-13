import type { Task, Project, Tag, PomodoroSettings } from './domain'

/**
 * Storage-level error variants.
 * - quota_exceeded: localStorage quota limits have been hit.
 * - parse_error: JSON failed to parse or structure invalid.
 * - not_found: requested key was not found.
 * - unknown: any other unexpected error condition.
 */
export type StorageError =
  | { type: 'quota_exceeded'; message: string; cause?: unknown }
  | { type: 'parse_error'; message: string; cause?: unknown }
  | { type: 'not_found'; message: string; cause?: unknown }
  | { type: 'unknown'; message: string; cause?: unknown }

/** A small Result helper type for success/failure returns. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

// Export/Import schema per design
/**
 * Export/Import payload schema used for backups and data migration.
 * Note: when serialized as JSON, `exportedAt` will be an ISO 8601 string.
 */
export interface ExportData {
  version: string
  exportedAt: Date
  tasks: Task[]
  projects: Project[]
  tags: Tag[]
  settings: {
    pomodoro: PomodoroSettings
    theme: 'light' | 'dark'
  }
}

/** Options for import behavior */
export type ImportOptions = {
  /**
   * Overwrite will replace existing keys. Merge will keep existing keys and skip writing.
   * Default: 'overwrite'
   */
  strategy?: 'merge' | 'overwrite'
  /**
   * If true, treat any validation warning as an error and abort import.
   * Default: false
   */
  strict?: boolean
}

export type { Task, Project, Tag, PomodoroSettings }
