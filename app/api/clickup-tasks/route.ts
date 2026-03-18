import { NextResponse } from 'next/server'
import { getTeamTasks } from '@/lib/clickup'

export async function GET() {
  const apiKey = process.env.CLICKUP_API_KEY
  const teamId = process.env.CLICKUP_WORKSPACE_ID ?? '10643959'

  if (!apiKey) {
    return NextResponse.json({ error: 'CLICKUP_API_KEY not configured' }, { status: 500 })
  }

  try {
    const data = await getTeamTasks(teamId)
    const tasks: Array<{
      due_date?: string
      status?: { status?: string; type?: string }
      priority?: { id?: string }
    }> = data.tasks ?? []

    const now = Date.now()
    const overdue = tasks.filter(
      (t) => t.due_date && parseInt(t.due_date) < now && t.status?.type !== 'closed'
    )
    const urgent = tasks.filter((t) => t.priority?.id === '1')
    const completed = tasks.filter((t) => t.status?.type === 'closed')
    const totalActive = tasks.length

    return NextResponse.json({
      totalTasks: totalActive,
      overdue: overdue.length,
      overduePercent: totalActive > 0 ? Math.round((overdue.length / totalActive) * 100) : 0,
      urgent: urgent.length,
      completed: completed.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
