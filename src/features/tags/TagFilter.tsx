import { useMemo, useState } from 'react'
import { Badge, Box, Button, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material'
import { useTagStore } from './store'
import { useTaskStore } from '../tasks/store'
import type { ViewType } from '../layout/Layout'

function isValidHexColor(value: string | undefined): boolean {
  if (!value) return true
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

export function TagFilter({ onSelectView }: { onSelectView: (v: ViewType) => void }) {
  const tags = useTagStore((s) => s.tags)
  const getCount = useTagStore((s) => s.getTagTaskCount)
  const getOrCreateTag = useTagStore((s) => s.getOrCreateTag)
  const selectedTagId = useTaskStore((s) => s.selectedTagId)
  const setSelectedTagId = useTaskStore((s) => s.setSelectedTagId)

  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sorted = useMemo(() => tags.slice().sort((a, b) => a.name.localeCompare(b.name)), [tags])

  const onClickTag = (id: string) => {
    const next = selectedTagId === id ? null : id
    setSelectedTagId(next)
    onSelectView('all')
  }

  const onAdd = () => {
    const n = name.trim()
    if (!n) return
    if (!isValidHexColor(color)) {
      setError('色は#fffまたは#ffffff形式で入力してください')
      return
    }
    try {
      getOrCreateTag(n, color || undefined)
      setName('')
      setColor('')
      setError(null)
    } catch (e: any) {
      setError(e?.message || '追加に失敗しました')
    }
  }

  return (
    <Box>
      <List>
        {sorted.map((t) => (
          <ListItemButton key={t.id} selected={selectedTagId === t.id} onClick={() => onClickTag(t.id)}>
            <ListItemText primary={t.name} />
            <Badge color="default" badgeContent={getCount(t.id)} />
          </ListItemButton>
        ))}
        {sorted.length === 0 && (
          <Typography color="text.secondary" sx={{ px: 2, py: 0.5 }}>
            タグはありません
          </Typography>
        )}
      </List>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ px: 2, pb: 2 }} alignItems="center">
        <TextField
          size="small"
          label="タグ名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ flex: 1 }}
          error={Boolean(error)}
          helperText={error || 'Enterで追加できます'}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAdd()
          }}
        />
        <TextField
          size="small"
          label="色(HEX)"
          placeholder="#9c27b0"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          sx={{ width: 160 }}
        />
        <Button onClick={onAdd} variant="outlined" disabled={!name.trim()}>
          追加
        </Button>
      </Stack>
    </Box>
  )
}

