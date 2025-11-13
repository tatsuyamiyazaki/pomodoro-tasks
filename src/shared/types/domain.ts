// Minimal domain types to satisfy design-time contracts.
// These will be fleshed out in later phases.

/** A single task item */
export interface Task {
  id: string
  title: string
  completed: boolean
  projectId?: string | null
  tagIds?: string[]
  createdAt?: string // ISO 8601
  updatedAt?: string // ISO 8601
}

/** Project groups tasks */
export interface Project {
  id: string
  name: string
  color?: string
  createdAt?: string
  updatedAt?: string
}

/** Tag classification for tasks */
export interface Tag {
  id: string
  name: string
  color?: string
}

/** Pomodoro timer settings */
export interface PomodoroSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakInterval: number
}
