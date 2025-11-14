import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Checkbox,
  ListItemText,
  IconButton,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/CheckCircleOutline'
import { useTaskStore } from './store'
import { useProjectStore } from '../projects/store'
import { useTagStore } from '../tags/store'
import type { Task, TaskPriority } from '../../shared/types'

export function TaskForm({ open, onClose, task }: { open: boolean; onClose: () => void; task?: Task | null }) {
  const isEdit = Boolean(task)
  const createTask = useTaskStore((s) => s.createTask)
  const updateTask = useTaskStore((s) => s.updateTask)
  const addSubTask = useTaskStore((s) => s.addSubTask)
  const toggleSubTaskCompletion = useTaskStore((s) => s.toggleSubTaskCompletion)
  const deleteSubTask = useTaskStore((s) => s.deleteSubTask)

  const projects = useProjectStore((s) => s.projects)
  const tags = useTagStore((s) => s.tags)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [priority, setPriority] = useState<TaskPriority | undefined>('medium')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [estimatedPomodoros, setEstimatedPomodoros] = useState<number | undefined>(undefined)
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<number>(25)

  const [subTaskName, setSubTaskName] = useState('')
  const [errors, setErrors] = useState<{ name?: string; dueDate?: string }>({})

  useEffect(() => {
    if (task) {
      setName(task.name ?? '')
      setDescription(task.description ?? '')
      setDueDate(task.dueDate ?? null)
      setPriority(task.priority ?? 'medium')
      setProjectId(task.projectId ?? null)
      setTagIds(task.tagIds ?? [])
      setEstimatedPomodoros(task.estimatedPomodoros)
      setEstimatedDurationMinutes(task.estimatedDurationMinutes ?? 25)
    } else {
      setName('')
      setDescription('')
      setDueDate(null)
      setPriority('medium')
      setProjectId(null)
      setTagIds([])
      setEstimatedPomodoros(undefined)
      setEstimatedDurationMinutes(25)
    }
  }, [task, open])

  const validate = () => {
    const e: typeof errors = {}
    if (!name.trim()) e.name = '名前は必須です'
    if (dueDate && Number.isNaN(Date.parse(dueDate))) e.dueDate = '期限日が不正です'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = () => {
    if (!validate()) return
    if (isEdit && task) {
      updateTask(task.id, {
        name,
        description: description || null,
        dueDate,
        priority,
        projectId,
        tagIds,
        estimatedPomodoros,
        estimatedDurationMinutes,
      })
    } else {
      createTask({
        name,
        description: description || null,
        dueDate,
        priority,
        projectId,
        tagIds,
        estimatedPomodoros,
        estimatedDurationMinutes,
      })
    }
    onClose()
  }
  const addSubTaskLocal = () => {
    const t = task
    const title = subTaskName.trim()
    if (!t || !title) return
    addSubTask(t.id, title)
    setSubTaskName('')
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{isEdit ? 'タスクを編集' : 'タスクを作成'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            error={Boolean(errors.name)}
            helperText={errors.name}
            fullWidth
          />
          <TextField
            label="詳細"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="期限"
              type="date"
              value={dueDate ?? ''}
              onChange={(e) => setDueDate(e.target.value || null)}
              InputLabelProps={{ shrink: true }}
              error={Boolean(errors.dueDate)}
              helperText={errors.dueDate}
              sx={{ flex: 1 }}
            />
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel id="priority-label">優先度</InputLabel>
              <Select
                labelId="priority-label"
                label="優先度"
                value={priority ?? ''}
                onChange={(e) => setPriority((e.target.value || 'medium') as TaskPriority)}
              >
                <MenuItem value="low">低</MenuItem>
                <MenuItem value="medium">中</MenuItem>
                <MenuItem value="high">高</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel id="project-label">プロジェクト</InputLabel>
              <Select
                labelId="project-label"
                label="プロジェクト"
                value={projectId ?? ''}
                onChange={(e) => setProjectId((e.target.value as string) || null)}
              >
                <MenuItem value=""><em>なし</em></MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel id="tags-label">タグ</InputLabel>
              <Select
                labelId="tags-label"
                label="タグ"
                multiple
                value={tagIds}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {selected.map((id) => (
                      <Chip key={id} label={tags.find((t) => t.id === id)?.name ?? id} size="small" />
                    ))}
                  </Box>
                )}
                onChange={(e) => setTagIds(typeof e.target.value === 'string' ? e.target.value.split(',') : (e.target.value as string[]))}
              >
                {tags.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    <Checkbox checked={tagIds.includes(t.id)} />
                    <ListItemText primary={t.name} />
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>複数選択できます</FormHelperText>
            </FormControl>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="予定ポモドーロ数"
              type="number"
              inputProps={{ min: 0 }}
              value={estimatedPomodoros ?? ''}
              onChange={(e) => setEstimatedPomodoros(e.target.value === '' ? undefined : Number(e.target.value))}
              sx={{ flex: 1 }}
            />
            <TextField
              label="予定時間(分)"
              type="number"
              inputProps={{ min: 1 }}
              value={estimatedDurationMinutes}
              onChange={(e) => setEstimatedDurationMinutes(Math.max(1, Number(e.target.value)))}
              sx={{ flex: 1 }}
            />
          </Stack>

          {isEdit && task && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                サブタスク
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    placeholder="サブタスクを追加"
                    value={subTaskName}
                    onChange={(e) => setSubTaskName(e.target.value)}
                    fullWidth
                  />
                  <Button variant="outlined" onClick={addSubTaskLocal} disabled={!subTaskName.trim()}>
                    追加
                  </Button>
                </Stack>
                <Stack spacing={0.5}>
                  {(task.subTasks ?? []).map((st) => (
                    <Stack key={st.id} direction="row" alignItems="center" spacing={1}>
                      <IconButton size="small" color={st.completed ? 'success' : 'default'} onClick={() => toggleSubTaskCompletion(task.id, st.id)}>
                        <CheckIcon fontSize="small" />
                      </IconButton>
                      <Typography sx={{ flex: 1, textDecoration: st.completed ? 'line-through' : undefined }}>{st.title}</Typography>
                      <IconButton size="small" onClick={() => deleteSubTask(task.id, st.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button variant="contained" onClick={onSubmit} disabled={!name.trim()}>
          {isEdit ? '保存' : '作成'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}




