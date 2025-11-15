import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import ReplayIcon from '@mui/icons-material/Replay'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SettingsIcon from '@mui/icons-material/Settings'
import { useTaskStore } from '../tasks/store'
import { usePomodoro } from './context'
import { PomodoroSettingsDialog } from './PomodoroSettingsDialog'

const phaseLabels: Record<import('./context').PomodoroPhase, string> = {
  focus: '集中',
  short_break: '短い休憩',
  long_break: '長い休憩',
}

function getPhaseDurationSeconds(phase: import('./context').PomodoroPhase, settings: import('../../shared/types').PomodoroSettings) {
  switch (phase) {
    case 'focus':
      return settings.focusMinutes * 60
    case 'short_break':
      return settings.shortBreakMinutes * 60
    case 'long_break':
      return settings.longBreakMinutes * 60
  }
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function PomodoroTimer() {
  const {
    phase,
    isRunning,
    remainingSeconds,
    sessionCount,
    currentTaskId,
    settings,
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    resetPomodoro,
    skipPhase,
  } = usePomodoro()

  const tasks = useTaskStore((s) => s.tasks)
  const targetTaskId = currentTaskId ?? null
  const currentTask = useMemo(() => tasks.find((t) => t.id === targetTaskId) ?? undefined, [tasks, targetTaskId])

  const totalSeconds = getPhaseDurationSeconds(phase, settings)
  const progressValue = useMemo(() => {
    if (!totalSeconds) return 0
    const elapsed = totalSeconds - remainingSeconds
    const pct = Math.max(0, Math.min(100, (elapsed / totalSeconds) * 100))
    return Number.isFinite(pct) ? pct : 0
  }, [remainingSeconds, totalSeconds])

  const [settingsOpen, setSettingsOpen] = useState(false)

  const showStart = !isRunning
  const canResume = !isRunning && remainingSeconds > 0 && remainingSeconds < totalSeconds

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress variant="determinate" value={progressValue} size={140} thickness={4} />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <Typography variant="h5" component="div">
                {formatTime(remainingSeconds)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {phaseLabels[phase]}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1">現在のセッション</Typography>
                <Chip label={phaseLabels[phase]} color={phase === 'focus' ? 'primary' : 'success'} size="small" />
              </Stack>
              {currentTask ? (
                <>
                  <Typography variant="h6">{currentTask.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    ポモドーロ: {currentTask.completedPomodoros ?? 0}
                    {typeof currentTask.estimatedPomodoros === 'number' ? ` / ${currentTask.estimatedPomodoros}` : ''}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  タスク未選択です。タスク一覧から開始してください。
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                完了したフォーカスセッション: {sessionCount}
              </Typography>
            </Stack>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => startPomodoro(currentTask?.id ?? null)}
              disabled={!showStart || !currentTask}
            >
              開始
            </Button>
            <Button variant="outlined" startIcon={<PauseIcon />} onClick={pausePomodoro} disabled={!isRunning}>
              一時停止
            </Button>
            <Button variant="outlined" startIcon={<PlayArrowIcon />} onClick={resumePomodoro} disabled={!canResume}>
              再開
            </Button>
            <Button variant="text" startIcon={<ReplayIcon />} onClick={resetPomodoro}>
              リセット
            </Button>
            <Button variant="text" startIcon={<SkipNextIcon />} onClick={skipPhase}>
              スキップ
            </Button>
            <Button variant="text" startIcon={<SettingsIcon />} onClick={() => setSettingsOpen(true)}>
              設定
            </Button>
          </Stack>
        </Stack>
      </CardContent>
      </Card>
      <PomodoroSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
