import { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
  IconButton,
  Fade,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTaskStore } from './store'
import type { Task } from '../../shared/types'
import { usePomodoro } from '../pomodoro'

function SubtaskProgress({ task }: { task: Task }) {
  const subs = task.subTasks ?? []
  const total = subs.length
  const done = subs.filter((s) => s.completed).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ flex: 1 }}>
        <LinearProgress variant="determinate" value={pct} />
      </Box>
      <Typography variant="caption" color="text.secondary">
        {done}/{total}
      </Typography>
    </Stack>
  )
}

function PomodoroProgress({ task }: { task: Task }) {
  if (typeof task.estimatedPomodoros !== 'number' || task.estimatedPomodoros <= 0) return null
  const completed = task.completedPomodoros ?? 0
  const pct = Math.min(100, Math.max(0, (completed / task.estimatedPomodoros) * 100))
  return (
    <Stack spacing={0.5} sx={{ mt: 1 }}>
      <LinearProgress variant="determinate" value={pct} />
      <Typography variant="caption" color="text.secondary">
        🍅 {completed}/{task.estimatedPomodoros} ポモドーロ
      </Typography>
    </Stack>
  )
}

function TaskCard({
  task,
  onClick,
  viewKey,
  onStart,
  isActive,
  isTimerRunning,
}: {
  task: Task
  onClick: () => void
  viewKey: string
  onStart: () => void
  isActive: boolean
  isTimerRunning: boolean
}) {
  const toggleTaskCompletion = useTaskStore((s) => s.toggleTaskCompletion)
  const due = task.dueDate ? new Date(task.dueDate) : null
  const now = new Date()
  const within24h = due ? due.getTime() - now.getTime() <= 24 * 3600 * 1000 && due.getTime() >= now.getTime() : false
  const overdue = due ? due.getTime() < now.getTime() && !task.completed : false

  const [visible, setVisible] = useState(true)

  const onToggle = () => {
    const wasCompleted = task.completed
    toggleTaskCompletion(task.id)
    if (!wasCompleted) {
      setVisible(false) // Fade out on complete
      setTimeout(() => setVisible(true), 300) // reset local visibility for potential future toggles
    }
  }

  return (
    <Fade in={visible || viewKey === 'completed'} timeout={300}>
      <Card
        variant="outlined"
        sx={{
          borderLeft: isActive
            ? '4px solid #1976d2'
            : overdue
              ? '4px solid #f44336'
              : within24h
                ? '4px solid #ff9800'
                : '4px solid transparent',
          opacity: task.completed && viewKey !== 'completed' ? 0.5 : 1,
          boxShadow: isActive ? 4 : undefined,
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          transform: isActive ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        <CardActionArea onClick={onClick}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggle() }} aria-label="toggle complete">
                {task.completed ? <CheckCircleIcon color="success" /> : <RadioButtonUncheckedIcon />}
              </IconButton>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ textDecoration: task.completed ? 'line-through' : undefined }}>
                  {task.name}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                  {task.priority && <Chip size="small" label={`P: ${task.priority}`} />}
                  {task.dueDate && (
                    <Chip size="small" color={overdue ? 'error' : within24h ? 'warning' : 'default'} label={new Date(task.dueDate).toLocaleDateString()} />
                  )}
                  {typeof task.estimatedPomodoros === 'number' && (
                    <Chip size="small" label={`🍅 ${task.completedPomodoros ?? 0}/${task.estimatedPomodoros}`} />
                  )}
                  {typeof task.estimatedDurationMinutes === 'number' && (
                    <Chip size="small" label={`⏱️ ${task.estimatedDurationMinutes}m`} />
                  )}
                </Stack>
                <Box sx={{ mt: 1 }}>
                  <SubtaskProgress task={task} />
                </Box>
                <PomodoroProgress task={task} />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant={isActive ? 'contained' : 'outlined'}
                    color={isActive ? 'primary' : 'inherit'}
                    startIcon={<PlayArrowIcon fontSize="small" />}
                    disabled={isActive && isTimerRunning}
                    onClick={(e) => {
                      e.stopPropagation()
                      onStart()
                    }}
                  >
                    {isActive ? (isTimerRunning ? '実行中' : '再開') : '開始'}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    </Fade>
  )
}

function SortableItem({
  task,
  onClick,
  viewKey,
  onStart,
  isActive,
  isTimerRunning,
}: {
  task: Task
  onClick: () => void
  viewKey: string
  onStart: () => void
  isActive: boolean
  isTimerRunning: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} viewKey={viewKey} onStart={onStart} isActive={isActive} isTimerRunning={isTimerRunning} />
    </div>
  )
}

export function TaskList({ viewKey, onEdit }: { viewKey: string; onEdit: (task: Task) => void }) {
  const getFilteredTasks = useTaskStore((s) => s.getFilteredTasks)
  const reorderTasks = useTaskStore((s) => s.reorderTasks)
  const { startPomodoro, currentTaskId, isRunning } = usePomodoro()

  const tasks = getFilteredTasks(viewKey as any)
  const [items, setItems] = useState(tasks.map((t) => t.id))
  const [pendingTask, setPendingTask] = useState<Task | null>(null)

  // keep ids in sync on filter/view changes
  const visibleTasks = useMemo(() => getFilteredTasks(viewKey as any), [getFilteredTasks, viewKey])

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor))

  const handleStart = (task: Task) => {
    if (isRunning && currentTaskId && currentTaskId !== task.id) {
      setPendingTask(task)
      return
    }
    startPomodoro(task.id)
  }

  const confirmSwitch = () => {
    if (!pendingTask) return
    startPomodoro(pendingTask.id)
    setPendingTask(null)
  }

  const onDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.indexOf(active.id)
    const newIndex = items.indexOf(over.id)
    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)
    reorderTasks(next)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <SortableContext items={visibleTasks.map((t) => t.id)}>
        <Stack spacing={1.5}>
          {visibleTasks.map((t) => (
            <SortableItem
              key={t.id}
              task={t}
              viewKey={viewKey}
              onClick={() => onEdit(t)}
              onStart={() => handleStart(t)}
              isActive={currentTaskId === t.id}
              isTimerRunning={isRunning}
            />
          ))}
          {visibleTasks.length === 0 && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              タスクはありません
            </Typography>
          )}
        </Stack>
      </SortableContext>
      <Dialog open={Boolean(pendingTask)} onClose={() => setPendingTask(null)}>
        <DialogTitle>タイマーを中断しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            現在別のタスクでタイマーが実行中です。{pendingTask?.name}に切り替えると現在のセッションが停止します。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingTask(null)}>キャンセル</Button>
          <Button onClick={confirmSwitch} color="primary" variant="contained">
            切り替える
          </Button>
        </DialogActions>
      </Dialog>
    </DndContext>
  )
}

