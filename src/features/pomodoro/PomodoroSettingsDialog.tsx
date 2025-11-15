import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import { usePomodoro } from './context'

type FormState = {
  focusMinutes: string
  shortBreakMinutes: string
  longBreakMinutes: string
  longBreakInterval: string
}

function toFormState(settings: import('../../shared/types').PomodoroSettings): FormState {
  return {
    focusMinutes: String(settings.focusMinutes ?? 25),
    shortBreakMinutes: String(settings.shortBreakMinutes ?? 5),
    longBreakMinutes: String(settings.longBreakMinutes ?? 15),
    longBreakInterval: String(settings.longBreakInterval ?? 4),
  }
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return Math.floor(parsed)
}

export function PomodoroSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = usePomodoro()
  const [form, setForm] = useState<FormState>(() => toFormState(settings))

  useEffect(() => {
    if (open) {
      setForm(toFormState(settings))
    }
  }, [open, settings])

  const errors = useMemo(() => {
    return {
      focusMinutes: parsePositiveInt(form.focusMinutes) ? null : '1以上の値を入力してください',
      shortBreakMinutes: parsePositiveInt(form.shortBreakMinutes) ? null : '1以上の値を入力してください',
      longBreakMinutes: parsePositiveInt(form.longBreakMinutes) ? null : '1以上の値を入力してください',
      longBreakInterval: parsePositiveInt(form.longBreakInterval) ? null : '1以上の値を入力してください',
    }
  }, [form])

  const isValid = useMemo(() => Object.values(errors).every((err) => err === null), [errors])

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    updateSettings({
      focusMinutes: parsePositiveInt(form.focusMinutes) ?? settings.focusMinutes,
      shortBreakMinutes: parsePositiveInt(form.shortBreakMinutes) ?? settings.shortBreakMinutes,
      longBreakMinutes: parsePositiveInt(form.longBreakMinutes) ?? settings.longBreakMinutes,
      longBreakInterval: parsePositiveInt(form.longBreakInterval) ?? settings.longBreakInterval,
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSave}>
        <DialogTitle>ポモドーロ設定</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="集中時間 (分)"
              type="number"
              value={form.focusMinutes}
              onChange={(e) => handleChange('focusMinutes', e.target.value)}
              inputProps={{ min: 1 }}
              error={Boolean(errors.focusMinutes)}
              helperText={errors.focusMinutes ?? 'デフォルト: 25分'}
              required
              fullWidth
            />
            <TextField
              label="短い休憩 (分)"
              type="number"
              value={form.shortBreakMinutes}
              onChange={(e) => handleChange('shortBreakMinutes', e.target.value)}
              inputProps={{ min: 1 }}
              error={Boolean(errors.shortBreakMinutes)}
              helperText={errors.shortBreakMinutes ?? 'デフォルト: 5分'}
              required
              fullWidth
            />
            <TextField
              label="長い休憩 (分)"
              type="number"
              value={form.longBreakMinutes}
              onChange={(e) => handleChange('longBreakMinutes', e.target.value)}
              inputProps={{ min: 1 }}
              error={Boolean(errors.longBreakMinutes)}
              helperText={errors.longBreakMinutes ?? 'デフォルト: 15分'}
              required
              fullWidth
            />
            <TextField
              label="長い休憩の間隔"
              type="number"
              value={form.longBreakInterval}
              onChange={(e) => handleChange('longBreakInterval', e.target.value)}
              inputProps={{ min: 1 }}
              error={Boolean(errors.longBreakInterval)}
              helperText={errors.longBreakInterval ?? '例: 4'}
              required
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>キャンセル</Button>
          <Button type="submit" variant="contained" disabled={!isValid}>
            保存
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
