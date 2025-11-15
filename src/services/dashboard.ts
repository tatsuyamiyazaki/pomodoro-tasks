import type { Project, Task } from '../shared/types'

const DAY_MS = 24 * 60 * 60 * 1000

function toStartOfDay(input: Date): Date {
  const d = new Date(input)
  d.setHours(0, 0, 0, 0)
  return d
}

function parseDate(input?: string | null): Date | null {
  if (!input) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, day] = input.split('-').map(Number)
    return new Date(y, (m || 1) - 1, day || 1)
  }
  const parsed = Date.parse(input)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed)
}

function formatLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function sumPlannedMinutes(tasks: Task[]): number {
  return tasks.reduce((sum, task) => {
    const value = typeof task.estimatedDurationMinutes === 'number' ? task.estimatedDurationMinutes : 25
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)
}

export interface WeeklyCompletionPoint {
  date: string
  label: string
  count: number
}

export interface ProjectSummary {
  projectId: string
  projectName: string
  projectColor?: string
  totalTasks: number
  completedTasks: number
}

export interface DashboardStats {
  totalPlannedMinutes: number
  incompleteCount: number
  completedCount: number
  todayTotalTasks: number
  todayCompletedTasks: number
  todayCompletionRate: number
  weeklyCompleted: WeeklyCompletionPoint[]
  projectSummaries: ProjectSummary[]
}

function buildWeeklySeries(tasks: Task[], now: Date): WeeklyCompletionPoint[] {
  const today = toStartOfDay(now)
  const start = new Date(today.getTime() - 6 * DAY_MS)
  const series: WeeklyCompletionPoint[] = []
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(start.getTime() + i * DAY_MS)
    const dayEnd = new Date(dayStart.getTime() + DAY_MS)
    const count = tasks.filter((task) => {
      if (!task.completedAt) return false
      const completedDate = parseDate(task.completedAt)
      if (!completedDate) return false
      const time = completedDate.getTime()
      return time >= dayStart.getTime() && time < dayEnd.getTime()
    }).length
    series.push({ date: dayStart.toISOString(), label: formatLabel(dayStart), count })
  }
  return series
}

function buildProjectSummaries(tasks: Task[], projects: Project[]): ProjectSummary[] {
  return projects.map((project) => {
    const inProject = tasks.filter((task) => task.projectId === project.id)
    const completed = inProject.filter((task) => task.completed).length
    return {
      projectId: project.id,
      projectName: project.name,
      projectColor: project.color,
      totalTasks: inProject.length,
      completedTasks: completed,
    }
  })
}

export function calculateDashboardStats(tasks: Task[], projects: Project[], now: Date = new Date()): DashboardStats {
  const totalPlannedMinutes = sumPlannedMinutes(tasks)
  const incompleteCount = tasks.filter((task) => !task.completed).length
  const completedCount = tasks.filter((task) => task.completed).length

  const today = toStartOfDay(now)
  const tomorrow = new Date(today.getTime() + DAY_MS)
  const dueToday = tasks.filter((task) => {
    const due = parseDate(task.dueDate)
    if (!due) return false
    const time = due.getTime()
    return time >= today.getTime() && time < tomorrow.getTime()
  })
  const todayCompletedTasks = dueToday.filter((task) => task.completed).length
  const todayTotalTasks = dueToday.length
  const todayCompletionRate = todayTotalTasks === 0 ? 0 : (todayCompletedTasks / todayTotalTasks) * 100

  const weeklyCompleted = buildWeeklySeries(tasks, now)
  const projectSummaries = buildProjectSummaries(tasks, projects)

  return {
    totalPlannedMinutes,
    incompleteCount,
    completedCount,
    todayTotalTasks,
    todayCompletedTasks,
    todayCompletionRate,
    weeklyCompleted,
    projectSummaries,
  }
}

