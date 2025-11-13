// Minimal domain types to satisfy design-time contracts.
// These will be fleshed out in later phases.

/** Subtask definition */
export interface SubTask {
  id: string
  title: string
  completed: boolean
  createdAt?: string // ISO 8601
  updatedAt?: string // ISO 8601
}

/** Priority levels for tasks */
export type TaskPriority = 'low' | 'medium' | 'high'

/** A single task item */
export interface Task {
  id: string
  name: string
  completed: boolean
  projectId?: string | null
  tagIds?: string[]
  /** Optional free-form description/notes */
  description?: string | null
  /** Due date for the task (local date or full ISO 8601 string) */
  dueDate?: string | null
  /** Optional priority for sorting and filters */
  priority?: TaskPriority
  /** Optional subtasks */
  subTasks?: SubTask[]
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
