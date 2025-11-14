import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { StorageService } from '../../services/storage'
import type { PomodoroSettings } from '../../shared/types'
import { useTaskStore } from '../tasks/store'

export type PomodoroPhase = 'focus' | 'short_break' | 'long_break'

export interface PomodoroState {
  phase: PomodoroPhase
  isRunning: boolean
  remainingSeconds: number
  sessionCount: number // completed focus sessions since last long break
  currentTaskId: string | null
  settings: PomodoroSettings
}

type Action =
  | { type: 'START'; taskId: string | null }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'TICK' }
  | { type: 'SKIP' }
  | { type: 'APPLY_SETTINGS'; settings: PomodoroSettings }

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
}

function secondsForPhase(phase: PomodoroPhase, s: PomodoroSettings): number {
  switch (phase) {
    case 'focus':
      return s.focusMinutes * 60
    case 'short_break':
      return s.shortBreakMinutes * 60
    case 'long_break':
      return s.longBreakMinutes * 60
  }
}

function nextPhaseAfterFocus(sessionCount: number, s: PomodoroSettings): PomodoroPhase {
  // After completing a focus session, decide break type
  return sessionCount % s.longBreakInterval === 0 ? 'long_break' : 'short_break'
}

function reducer(state: PomodoroState, action: Action): PomodoroState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        isRunning: true,
        currentTaskId: action.taskId ?? null,
        // If previously ended or at 0, ensure remainingSeconds is set for current phase
        remainingSeconds: state.remainingSeconds > 0 ? state.remainingSeconds : secondsForPhase(state.phase, state.settings),
      }
    case 'PAUSE':
      return { ...state, isRunning: false }
    case 'RESUME':
      return { ...state, isRunning: true }
    case 'RESET': {
      return {
        ...state,
        isRunning: false,
        phase: 'focus',
        remainingSeconds: secondsForPhase('focus', state.settings),
        sessionCount: 0,
        currentTaskId: null,
      }
    }
    case 'TICK': {
      if (!state.isRunning) return state
      if (state.remainingSeconds > 0) {
        return { ...state, remainingSeconds: state.remainingSeconds - 1 }
      }
      // Reached zero - stay here; transition handled externally to allow side-effects
      return state
    }
    case 'SKIP': {
      if (state.phase === 'focus') {
        const nextPhase = nextPhaseAfterFocus(state.sessionCount + 1, state.settings)
        return {
          ...state,
          phase: nextPhase,
          remainingSeconds: secondsForPhase(nextPhase, state.settings),
          isRunning: true,
          sessionCount: state.sessionCount + 1,
        }
      }
      // From break -> back to focus
      return {
        ...state,
        phase: 'focus',
        remainingSeconds: secondsForPhase('focus', state.settings),
        isRunning: true,
      }
    }
    case 'APPLY_SETTINGS': {
      const next = { ...state, settings: action.settings }
      // Recalculate remaining for current phase if not running to reflect new settings
      if (!state.isRunning) {
        next.remainingSeconds = secondsForPhase(next.phase, next.settings)
      }
      return next
    }
    default:
      return state
  }
}

interface PomodoroContextValue extends PomodoroState {
  startPomodoro: (taskId: string | null) => void
  pausePomodoro: () => void
  resumePomodoro: () => void
  resetPomodoro: () => void
  skipPhase: () => void
  updateSettings: (input: Partial<PomodoroSettings>) => void
}

const Ctx = createContext<PomodoroContextValue | undefined>(undefined)

const storage = new StorageService('pomodoro')

function loadSettings(): PomodoroSettings {
  const res = storage.load<PomodoroSettings>('settings')
  return res.ok ? { ...DEFAULT_SETTINGS, ...res.value } : { ...DEFAULT_SETTINGS }
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const initial: PomodoroState = useMemo(
    () => ({
      phase: 'focus',
      isRunning: false,
      remainingSeconds: secondsForPhase('focus', loadSettings()),
      sessionCount: 0,
      currentTaskId: null,
      settings: loadSettings(),
    }),
    []
  )

  const [state, dispatch] = useReducer(reducer, initial)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const taskStore = useTaskStore()

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startPomodoro = useCallback((taskId: string | null) => {
    dispatch({ type: 'START', taskId })
  }, [])

  const pausePomodoro = useCallback(() => {
    dispatch({ type: 'PAUSE' })
  }, [])

  const resumePomodoro = useCallback(() => {
    dispatch({ type: 'RESUME' })
  }, [])

  const resetPomodoro = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const skipPhase = useCallback(() => {
    dispatch({ type: 'SKIP' })
  }, [])

  const updateSettings = useCallback((input: Partial<PomodoroSettings>) => {
    const next: PomodoroSettings = {
      ...state.settings,
      ...input,
    }
    // Validate positive integers
    function posInt(n: number, fallback: number): number {
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
    }
    next.focusMinutes = posInt(next.focusMinutes, DEFAULT_SETTINGS.focusMinutes)
    next.shortBreakMinutes = posInt(next.shortBreakMinutes, DEFAULT_SETTINGS.shortBreakMinutes)
    next.longBreakMinutes = posInt(next.longBreakMinutes, DEFAULT_SETTINGS.longBreakMinutes)
    next.longBreakInterval = posInt(next.longBreakInterval, DEFAULT_SETTINGS.longBreakInterval)
    storage.save('settings', next)
    dispatch({ type: 'APPLY_SETTINGS', settings: next })
  }, [state.settings])

  // Manage ticking
  useEffect(() => {
    clearTimer()
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK' })
      }, 1000)
    }
    return clearTimer
  }, [state.isRunning, clearTimer])

  // Handle end-of-phase transitions and side-effects when remainingSeconds reaches 0 while running
  useEffect(() => {
    if (!state.isRunning) return
    if (state.remainingSeconds > 0) return

    // Phase completed
    if (state.phase === 'focus') {
      // Record completion on task if exists
      const tid = state.currentTaskId
      if (tid) {
        const t = taskStore.tasks.find((x) => x.id === tid)
        const prev = t?.completedPomodoros ?? 0
        taskStore.updateTask(tid, { completedPomodoros: prev + 1 })
      }
      // Notify if supported
      try {
        if (typeof Notification !== 'undefined') {
          if (Notification.permission === 'granted') {
            new Notification('Focus session complete', { body: 'Time for a break!' })
          } else if (Notification.permission === 'default') {
            Notification.requestPermission().then((perm) => {
              if (perm === 'granted') new Notification('Focus session complete', { body: 'Time for a break!' })
            })
          }
        }
      } catch {}
      // Auto-advance and continue running
      // We cannot dispatch multiple actions synchronously with derivation in reducer; instead, emulate via direct dispatches
      dispatch({ type: 'SKIP' })
      return
    }
    // Break finished -> return to focus and continue
    dispatch({ type: 'SKIP' })
  }, [state.remainingSeconds, state.isRunning, state.phase, state.sessionCount, state.settings, state.currentTaskId, taskStore])

  const value = useMemo<PomodoroContextValue>(
    () => ({
      ...state,
      startPomodoro,
      pausePomodoro,
      resumePomodoro,
      resetPomodoro,
      skipPhase,
      updateSettings,
    }),
    [state, startPomodoro, pausePomodoro, resumePomodoro, resetPomodoro, skipPhase, updateSettings]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePomodoro(): PomodoroContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePomodoro must be used within PomodoroProvider')
  return ctx
}




