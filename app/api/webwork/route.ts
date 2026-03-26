import { NextRequest, NextResponse } from 'next/server'
import { MEMBER_IDS, getWeekHours, getCurrentWeekDates } from '@/lib/webwork'
import { getCached, setCache } from '@/lib/api-cache'

export async function buildWebWorkSnapshot() {
  const weekDates = getCurrentWeekDates()
  const results = await Promise.all(
    Object.entries(MEMBER_IDS).map(async ([username, userId]) => {
      try {
        const { totalMinutes, byDay } = await getWeekHours(userId, weekDates)
        return {
          username,
          totalMinutes,
          totalHours: Math.round(totalMinutes / 60 * 10) / 10,
          byDay: byDay.map(d => ({ date: d.date, minutes: d.minutes, hours: Math.round(d.minutes / 60 * 10) / 10 })),
        }
      } catch {
        return { username, totalMinutes: 0, totalHours: 0, byDay: [] }
      }
    })
  )
  return { week: weekDates, members: results }
}

// GET — read from Supabase cache
export async function GET(req: NextRequest) {
  const role = req.headers.get('x-role')
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cached = await getCached('webwork')
  if (!cached) {
    return NextResponse.json({ error: 'No WebWork data cached yet. Click ↻ to load.', week: [], members: [] })
  }
  return NextResponse.json({ ...cached.data, cachedAt: cached.fetched_at })
}

// POST — fetch live from WebWork, store in cache
export async function POST(req: NextRequest) {
  const role = req.headers.get('x-role')
  const secret = req.headers.get('x-cron-secret')
  const isScheduled = secret === process.env.CRON_SECRET

  if (!isScheduled && !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.WEBWORK_API_KEY) return NextResponse.json({ error: 'WEBWORK_API_KEY not configured' }, { status: 500 })

  try {
    const snapshot = await buildWebWorkSnapshot()
    await setCache('webwork', snapshot)
    return NextResponse.json({ ok: true, ...snapshot })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
