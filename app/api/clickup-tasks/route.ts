import { NextRequest, NextResponse } from 'next/server'
import { getTeamTasks } from '@/lib/clickup'
import { getCached, setCache } from '@/lib/api-cache'

interface CUTask {
  id: string
  name: string
  due_date?: string
  url?: string
  status?: { status?: string; type?: string }
  priority?: { id?: string; priority?: string }
  list?: { id: string; name: string }
  folder?: { name: string }
  assignees?: Array<{ username?: string; email?: string; id?: string }>
}

function taskDetail(t: CUTask) {
  return {
    id: t.id,
    name: t.name,
    list: t.list?.name ?? t.folder?.name ?? 'Unknown list',
    dueDate: t.due_date ? new Date(parseInt(t.due_date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    priority: t.priority?.priority ?? '',
    url: t.url ?? `https://app.clickup.com/t/${t.id}`,
    assignees: (t.assignees ?? []).map((a) => a.username ?? a.email ?? '').filter(Boolean),
  }
}

export async function buildClickUpSnapshot() {
  const teamId = process.env.CLICKUP_WORKSPACE_ID ?? '10643959'
  const data = await getTeamTasks(teamId)
  const tasks: CUTask[] = data.tasks ?? []
  const now = Date.now()

  const overdueTasks = tasks.filter(t => t.due_date && parseInt(t.due_date) < now && t.status?.type !== 'closed')
  const urgentTasks  = tasks.filter(t => t.priority?.id === '1' && t.status?.type !== 'closed')
  const highTasks    = tasks.filter(t => t.priority?.id === '2' && t.status?.type !== 'closed')
  const completedTasks = tasks.filter(t => t.status?.type === 'closed')
  const totalActive  = tasks.length

  const assigneeStats: Record<string, { total: number; overdue: number; urgent: number }> = {}
  for (const t of tasks) {
    if (t.status?.type === 'closed') continue
    for (const a of (t.assignees ?? [])) {
      const name = (a.username ?? a.email ?? '').toLowerCase()
      if (!name) continue
      if (!assigneeStats[name]) assigneeStats[name] = { total: 0, overdue: 0, urgent: 0 }
      assigneeStats[name].total++
      if (t.due_date && parseInt(t.due_date) < now) assigneeStats[name].overdue++
      if (t.priority?.id === '1') assigneeStats[name].urgent++
    }
  }

  const tasksByAssignee: Record<string, ReturnType<typeof taskDetail>[]> = {}
  for (const t of tasks) {
    if (t.status?.type === 'closed') continue
    for (const a of (t.assignees ?? [])) {
      const name = (a.username ?? a.email ?? '').toLowerCase()
      if (!name) continue
      if (!tasksByAssignee[name]) tasksByAssignee[name] = []
      tasksByAssignee[name].push(taskDetail(t))
    }
  }
  for (const name of Object.keys(tasksByAssignee)) {
    tasksByAssignee[name].sort((a, b) => {
      const ap = a.priority === 'urgent' ? 0 : a.priority === 'high' ? 1 : 2
      const bp = b.priority === 'urgent' ? 0 : b.priority === 'high' ? 1 : 2
      if (ap !== bp) return ap - bp
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && b.dueDate) return 1
      return 0
    })
  }

  return {
    totalTasks: totalActive,
    overdue: overdueTasks.length,
    overduePercent: totalActive > 0 ? Math.round((overdueTasks.length / totalActive) * 100) : 0,
    urgent: urgentTasks.length,
    completed: completedTasks.length,
    overdueDetails: overdueTasks.slice(0, 25).map(taskDetail),
    urgentDetails:  urgentTasks.slice(0, 25).map(taskDetail),
    highDetails:    highTasks.slice(0, 25).map(taskDetail),
    assigneeStats,
    tasksByAssignee,
  }
}

// GET — read from Supabase cache (no ClickUp API call)
export async function GET(req: NextRequest) {
  const role = req.headers.get('x-role')
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cached = await getCached('clickup')
  if (!cached) {
    return NextResponse.json({
      error: 'No ClickUp data cached yet. Click ↻ to load.',
      totalTasks: 0, overdue: 0, overduePercent: 0, urgent: 0, completed: 0,
      overdueDetails: [], urgentDetails: [], highDetails: [],
      assigneeStats: {}, tasksByAssignee: {},
    })
  }
  return NextResponse.json({ ...cached.data, cachedAt: cached.fetched_at })
}

// POST — fetch live from ClickUp, store in Supabase
// Called by: refresh button (all logged-in users), daily cron, Generate Now button
export async function POST(req: NextRequest) {
  const role = req.headers.get('x-role')
  const secret = req.headers.get('x-cron-secret')
  const isScheduled = secret === process.env.CRON_SECRET

  if (!isScheduled && !role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.CLICKUP_API_KEY) {
    return NextResponse.json({ error: 'CLICKUP_API_KEY not configured' }, { status: 500 })
  }

  try {
    const snapshot = await buildClickUpSnapshot()
    await setCache('clickup', snapshot)
    return NextResponse.json({ ok: true, ...snapshot })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
