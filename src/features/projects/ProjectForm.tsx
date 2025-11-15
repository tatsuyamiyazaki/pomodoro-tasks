import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import type { Project } from '../../shared/types'
import { useProjectStore } from './store'

function isValidHexColor(value: string | undefined): boolean {
  if (!value) return true
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

export function ProjectForm({
  open,
  onClose,
  project,
}: {
  open: boolean
  onClose: () => void
  project?: Project | null
}) {
  const isEdit = Boolean(project)
  const createProject = useProjectStore((s) => s.createProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const getProjectStats = useProjectStore((s) => s.getProjectStats)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string>('')
  const [errors, setErrors] = useState<{ name?: string; color?: string }>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const relatedCount = useMemo(() => (project ? getProjectStats(project.id).totalTasks : 0), [project, getProjectStats])

  useEffect(() => {
    if (project) {
      setName(project.name ?? '')
      setDescription(project.description ?? '')
      setColor(project.color ?? '')
    } else {
      setName('')
      setDescription('')
      setColor('')
    }
  }, [project, open])

  const validate = () => {
    const e: typeof errors = {}
    if (!name.trim()) e.name = '名前は必須です'
    if (!isValidHexColor(color)) e.color = '色は#fffまたは#ffffff形式で入力してください'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = () => {
    if (!validate()) return
    if (isEdit && project) {
      updateProject(project.id, { name, description: description || null, color: color || undefined })
    } else {
      createProject({ name, description: description || null, color: color || undefined })
    }
    onClose()
  }

  const onDelete = () => {
    if (!project) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteProject(project.id)
    setConfirmDelete(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'プロジェクトを編集' : 'プロジェクトを作成'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            error={Boolean(errors.name)}
            helperText={errors.name}
          />
          <TextField
            label="説明"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              label="色(HEX)"
              placeholder="#2196f3"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              error={Boolean(errors.color)}
              helperText={errors.color}
              sx={{ flex: 1 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                aria-label="色を選択"
                type="color"
                value={isValidHexColor(color) && color ? color : '#ffffff'}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 40, height: 40, border: 'none', background: 'transparent' }}
              />
              <Box sx={{ width: 24, height: 24, bgcolor: isValidHexColor(color) && color ? color : 'transparent', border: '1px solid #ccc', borderRadius: 0.5 }} />
            </Box>
          </Stack>

          {isEdit && project && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                関連タスク数: {relatedCount}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {isEdit && (
          <Button color={confirmDelete ? 'error' : 'inherit'} startIcon={<DeleteIcon />} onClick={onDelete}>
            {confirmDelete ? `本当に削除(${relatedCount}件)` : '削除'}
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>キャンセル</Button>
        <Button variant="contained" onClick={onSubmit} disabled={!name.trim()}>
          {isEdit ? '保存' : '作成'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

