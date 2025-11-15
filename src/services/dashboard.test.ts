import { describe, it, expect } from 'vitest'
import { calculateDashboardStats } from './dashboard'
import type { Project, Task } from '../shared/types'

describe('DashboardService', () => {
  it('calculates aggregate metrics and series data', () => {
    const now = new Date('2025-01-15T12:00:00.000Z')
    const tasks: Task[] = [
      {
        id: 't1',
        name: 'Incomplete',
        completed: false,
        completedAt: null,
        dueDate: '2025-01-15',
        estimatedDurationMinutes: 30,
        projectId: 'p1',
      },
      {
        id: 't2',
        name: 'Done today',
        completed: true,
        completedAt: '2025-01-15T09:00:00.000Z',
        dueDate: '2025-01-15',
        estimatedDurationMinutes: 45,
        projectId: 'p1',
      },
      {
        id: 't3',
        name: 'Done yesterday',
        completed: true,
        completedAt: '2025-01-14T12:00:00.000Z',
        dueDate: '2025-01-14',
        projectId: 'p2',
      },
      {
        id: 't4',
        name: 'Done five days ago',
        completed: true,
        completedAt: '2025-01-10T12:00:00.000Z',
        dueDate: '2025-01-10',
        estimatedDurationMinutes: 15,
      },
      {
        id: 't5',
        name: 'Old completion',
        completed: true,
        completedAt: '2024-12-31T12:00:00.000Z',
        dueDate: '2024-12-31',
        estimatedDurationMinutes: 60,
      },
    ]

    const projects: Project[] = [
      { id: 'p1', name: 'Alpha', color: '#ff0000' },
      { id: 'p2', name: 'Beta', color: '#00ff00' },
    ]

    const stats = calculateDashboardStats(tasks, projects, now)

    expect(stats.totalPlannedMinutes).toBe(30 + 45 + 25 + 15 + 60)
    expect(stats.incompleteCount).toBe(1)
    expect(stats.completedCount).toBe(4)
    expect(stats.todayTotalTasks).toBe(2)
    expect(stats.todayCompletedTasks).toBe(1)
    expect(stats.todayCompletionRate).toBeCloseTo(50)

    expect(stats.weeklyCompleted).toHaveLength(7)
    const weeklySum = stats.weeklyCompleted.reduce((sum, point) => sum + point.count, 0)
    expect(weeklySum).toBe(3)

    const todayPoint = stats.weeklyCompleted[stats.weeklyCompleted.length - 1]
    expect(todayPoint.count).toBeGreaterThanOrEqual(1)

    expect(stats.projectSummaries).toHaveLength(2)
    const alpha = stats.projectSummaries.find((p) => p.projectId === 'p1')!
    expect(alpha.totalTasks).toBe(2)
    expect(alpha.completedTasks).toBe(1)
    const beta = stats.projectSummaries.find((p) => p.projectId === 'p2')!
    expect(beta.totalTasks).toBe(1)
    expect(beta.completedTasks).toBe(1)
  })
})

