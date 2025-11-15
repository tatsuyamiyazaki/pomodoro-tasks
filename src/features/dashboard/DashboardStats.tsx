import { useMemo } from 'react'
import { Box, LinearProgress, Paper, Stack, Typography, useTheme } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from 'recharts'
import { useTaskStore } from '../tasks'
import { useProjectStore } from '../projects/store'
import { calculateDashboardStats } from '../../services/dashboard'

function MetricCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h4" sx={{ mt: 1 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  )
}

export function DashboardStats() {
  const tasks = useTaskStore((s) => s.tasks)
  const projects = useProjectStore((s) => s.projects)
  const theme = useTheme()
  const stats = useMemo(() => calculateDashboardStats(tasks, projects), [tasks, projects])

  return (
    <Stack spacing={3} sx={{ pb: 4 }}>
      <Box>
        <Typography variant="h5" gutterBottom>
          概要ダッシュボード
        </Typography>
        <Typography variant="body2" color="text.secondary">
          タスク全体の進捗と予定時間、週間統計を俯瞰できます。
        </Typography>
      </Box>

      <Grid container spacing={2} columns={{ xs: 1, sm: 8, md: 12 }}>
        <Grid size={{ xs: 1, sm: 4, md: 3 }}>
          <MetricCard title="予定時間" value={`${stats.totalPlannedMinutes} 分`} subtitle="タスクのestimatedDuration合計" />
        </Grid>
        <Grid size={{ xs: 1, sm: 4, md: 3 }}>
          <MetricCard title="未完了タスク" value={stats.incompleteCount} />
        </Grid>
        <Grid size={{ xs: 1, sm: 4, md: 3 }}>
          <MetricCard title="完了済みタスク" value={stats.completedCount} />
        </Grid>
        <Grid size={{ xs: 1, sm: 4, md: 3 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary">
              本日の完了率
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
              {Math.round(stats.todayCompletionRate)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stats.todayCompletedTasks}/{stats.todayTotalTasks} タスク
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, stats.todayCompletionRate)}
              sx={{ mt: 2 }}
            />
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} columns={{ xs: 1, md: 12 }}>
        <Grid size={{ xs: 1, md: 7 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1">週間完了タスク</Typography>
            <Typography variant="body2" color="text.secondary">
              過去7日間の完了数 (TaskStore変更時に自動更新)
            </Typography>
            <Box sx={{ height: 280, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyCompleted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" stroke={theme.palette.text.secondary} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke={theme.palette.text.secondary} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: theme.palette.action.hover }}
                    contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: 8 }}
                  />
                  <Bar dataKey="count" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 1, md: 5 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1">プロジェクト別の進捗</Typography>
            <Typography variant="body2" color="text.secondary">
              各プロジェクトの完了タスク数
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {stats.projectSummaries.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  プロジェクトがまだありません。
                </Typography>
              )}
              {stats.projectSummaries.map((project) => {
                const completionRate = project.totalTasks === 0 ? 0 : (project.completedTasks / project.totalTasks) * 100
                return (
                  <Box key={project.projectId}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1">{project.projectName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {project.completedTasks}/{project.totalTasks}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={completionRate}
                      sx={{ mt: 1 }}
                      color={completionRate > 80 ? 'success' : 'primary'}
                    />
                  </Box>
                )
              })}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  )
}
