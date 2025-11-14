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
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTaskStore } from './store'
import type { Task } from '../../shared/types'

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

function TaskCard({ task, onClick, viewKey }: { task: Task; onClick: () => void; viewKey: string }) {
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
          borderLeft: overdue ? '4px solid #f44336' : within24h ? '4px solid #ff9800' : '4px solid transparent',
          opacity: task.completed && viewKey !== 'completed' ? 0.5 : 1,
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
              </Box>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    </Fade>
  )
}

function SortableItem({ task, onClick, viewKey }: { task: Task; onClick: () => void; viewKey: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} viewKey={viewKey} />
    </div>
  )
}

export function TaskList({ viewKey, onEdit }: { viewKey: string; onEdit: (task: Task) => void }) {
  const getFilteredTasks = useTaskStore((s) => s.getFilteredTasks)
  const reorderTasks = useTaskStore((s) => s.reorderTasks)

  const tasks = getFilteredTasks(viewKey as any)
  const [items, setItems] = useState(tasks.map((t) => t.id))

  // keep ids in sync on filter/view changes
  const visibleTasks = useMemo(() => getFilteredTasks(viewKey as any), [getFilteredTasks, viewKey])

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor))

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
            <SortableItem key={t.id} task={t} viewKey={viewKey} onClick={() => onEdit(t)} />
          ))}
          {visibleTasks.length === 0 && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              タスクはありません
            </Typography>
          )}
        </Stack>
      </SortableContext>
    </DndContext>
  )
}

