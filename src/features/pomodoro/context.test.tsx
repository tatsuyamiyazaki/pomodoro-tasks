// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { PomodoroProvider, usePomodoro } from './context'
import { useTaskStore, configureTaskStore } from '../tasks/store'

type Exposed = {
  snapshot: any
  actions: any
}

function TestProbe({ expose }: { expose: Exposed }) {
  const ctx = usePomodoro()
  // Assign on render to keep latest snapshot and actions always available
  expose.snapshot = ctx
  expose.actions = {
    startPomodoro: ctx.startPomodoro,
    pausePomodoro: ctx.pausePomodoro,
    resumePomodoro: ctx.resumePomodoro,
    resetPomodoro: ctx.resetPomodoro,
    skipPhase: ctx.skipPhase,
    updateSettings: ctx.updateSettings,
  }
  return null
}

function renderWithProvider(expose: Exposed) {
  const div = document.createElement('div')
  document.body.appendChild(div)
  const root = createRoot(div)
  act(() => {
    root.render(
      <PomodoroProvider>
        <TestProbe expose={expose} />
      </PomodoroProvider>
    )
  })
  return { root, container: div }
}

describe('PomodoroContext', () => {
  beforeEach(() => {
    localStorage.clear()
    // Make timers deterministic and fast
    vi.useFakeTimers()
    // Configure task store for tests
    configureTaskStore({ debounceMs: 0 })
    // Reset task store
    useTaskStore.setState({ tasks: [], searchQuery: '', setResolvers: useTaskStore.getState().setResolvers })
  })

  it('basic actions toggle running state and phases', async () => {
    const expose: Exposed = { snapshot: null, actions: {} }
    // Preload settings
    localStorage.setItem(
      'pomodoro:settings',
      JSON.stringify({ focusMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 1, longBreakInterval: 2 })
    )
    const { root, container } = renderWithProvider(expose)

    // Start
    act(() => {
      expose.actions.startPomodoro('tid')
    })
    expect(expose.snapshot.isRunning).toBe(true)
    expect(expose.snapshot.currentTaskId).toBe('tid')

    // Pause
    act(() => {
      expose.actions.pausePomodoro()
    })
    expect(expose.snapshot.isRunning).toBe(false)

    // Resume
    act(() => {
      expose.actions.resumePomodoro()
    })
    expect(expose.snapshot.isRunning).toBe(true)

    // Skip to break
    act(() => {
      expose.actions.skipPhase()
    })
    expect(expose.snapshot.phase === 'short_break' || expose.snapshot.phase === 'long_break').toBe(true)
    expect(expose.snapshot.isRunning).toBe(true)

    // Reset
    act(() => {
      expose.actions.resetPomodoro()
    })
    expect(expose.snapshot.isRunning).toBe(false)
    expect(expose.snapshot.phase).toBe('focus')

    root.unmount()
    container.remove()
  })

  // Timer ticking is covered in integration tests; this suite validates action semantics

  it('resets to focus with default duration when reset', async () => {
    const expose: Exposed = { snapshot: null, actions: {} }
    localStorage.setItem(
      'pomodoro:settings',
      JSON.stringify({ focusMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 1, longBreakInterval: 2 })
    )
    const { root, container } = renderWithProvider(expose)

    act(() => {
      expose.actions.startPomodoro(null)
    })
    await Promise.resolve()
    act(() => {
      expose.actions.resetPomodoro()
    })
    await Promise.resolve()
    expect(expose.snapshot.isRunning).toBe(false)
    expect(expose.snapshot.phase).toBe('focus')
    expect(expose.snapshot.remainingSeconds).toBe(60)

    root.unmount()
    container.remove()
  })

  it('persists and restores settings from localStorage', async () => {
    const expose: Exposed = { snapshot: null, actions: {} }
    // Seed settings and verify restoration on mount
    localStorage.setItem(
      'pomodoro:settings',
      JSON.stringify({ focusMinutes: 2, shortBreakMinutes: 3, longBreakMinutes: 4, longBreakInterval: 5 })
    )
    let mount = renderWithProvider(expose)
    await Promise.resolve()
    expect(expose.snapshot.settings.focusMinutes).toBe(2)
    expect(expose.snapshot.settings.shortBreakMinutes).toBe(3)
    expect(expose.snapshot.settings.longBreakMinutes).toBe(4)
    expect(expose.snapshot.settings.longBreakInterval).toBe(5)
    mount.root.unmount()
    mount.container.remove()

    // Change settings between mounts to ensure new values load
    localStorage.setItem(
      'pomodoro:settings',
      JSON.stringify({ focusMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 1, longBreakInterval: 2 })
    )
    const expose2: Exposed = { snapshot: null, actions: {} }
    mount = renderWithProvider(expose2)
    await Promise.resolve()
    expect(expose2.snapshot.settings.focusMinutes).toBe(1)
    expect(expose2.snapshot.settings.shortBreakMinutes).toBe(1)
    expect(expose2.snapshot.settings.longBreakMinutes).toBe(1)
    expect(expose2.snapshot.settings.longBreakInterval).toBe(2)

    mount.root.unmount()
    mount.container.remove()
  })
})
