import { NextRequest, NextResponse } from 'next/server'
import { channelHistory, usersList, conversationsList } from '@/lib/slack'
import { getCached, setCache } from '@/lib/api-cache'

const WEEKLY_REPORTS_CHANNEL = 'C08K6KM53FV'
const FULL_TEAM = ['Rob Holmes', 'Alex Veytsel', 'Josh Bykowski', 'Kim', 'Chase', 'Daniel Baez', 'Ben Sheppard', 'Tony']

const SLACK_MATCH: Record<string, string[]> = {
  'Rob Holmes':    ['rob holmes', 'rob'],
  'Alex Veytsel':  ['alex veytsel', 'alex'],
  'Josh Bykowski': ['josh bykowski', 'josh'],
  'Kim':           ['kimberly dofredo', 'kimberly', 'kim'],
  'Chase':         ['chase adrian', 'chase'],
  'Daniel Baez':   ['daniel baez', 'daniel'],
  'Ben Sheppard':  ['ben sheppard', 'ben'],
  'Tony':          ['tony greenberg', 'rampratetony', 'tonyg', 'tony'],
}

function weekLabel() {
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[mon.getMonth()]} ${mon.getDate()}–${sun.getDate()}`
}

export async function buildSlackSnapshot() {
  const oldest = String(Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000))

  const [historyData, membersData, channelsData] = await Promise.all([
    channelHistory(WEEKLY_REPORTS_CHANNEL, oldest),
    usersList(),
    conversationsList(),
  ])

  const allUsers: Array<{ id: string; real_name?: string; name?: string; deleted?: boolean; is_bot?: boolean }> =
    (membersData as { members?: typeof allUsers }).members ?? []

  const userMap: Record<string, string> = {}
  const handleMap: Record<string, string> = {}
  for (const u of allUsers) {
    if (u.id) {
      userMap[u.id] = u.real_name ?? u.name ?? ''
      handleMap[u.id] = u.name ?? ''
    }
  }

  const messages: Array<{ user?: string }> = (historyData as { messages?: typeof messages }).messages ?? []
  const posters = Array.from(new Set(messages.map(m => m.user ? userMap[m.user] : '').filter(Boolean)))
  const posterHandles = Array.from(new Set(messages.map(m => m.user ? handleMap[m.user] : '').filter(Boolean)))

  const filed: string[] = []
  const missing: string[] = []
  for (const member of FULL_TEAM) {
    const aliases = SLACK_MATCH[member] ?? [member.split(' ')[0].toLowerCase()]
    const didFile =
      posters.some(p => aliases.some(a => p.toLowerCase().includes(a))) ||
      posterHandles.some(h => aliases.some(a => h.toLowerCase().includes(a)))
    if (didFile) filed.push(member)
    else missing.push(member)
  }

  return {
    weeklyReports: { filed, missing, week: weekLabel() },
    slackStats: {
      totalMessages: messages.length,
      activeMembers: allUsers.filter(m => !m.deleted && !m.is_bot).length,
      channels: ((channelsData as { channels?: unknown[] }).channels ?? []).length,
    },
  }
}

// GET — read from Supabase cache
export async function GET(req: NextRequest) {
  const role = req.headers.get('x-role')
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cached = await getCached('slack')
  if (!cached) {
    return NextResponse.json({
      weeklyReports: { filed: [], missing: FULL_TEAM, week: weekLabel() },
      slackStats: { totalMessages: 0, activeMembers: 0, channels: 0 },
      error: 'No Slack data cached yet. Click ↻ to load.',
    })
  }
  return NextResponse.json({ ...cached.data, cachedAt: cached.fetched_at })
}

// POST — fetch live from Slack, store in cache
export async function POST(req: NextRequest) {
  const role = req.headers.get('x-role')
  const secret = req.headers.get('x-cron-secret')
  const isScheduled = secret === process.env.CRON_SECRET

  if (!isScheduled && !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.SLACK_BOT_TOKEN) return NextResponse.json({ error: 'SLACK_BOT_TOKEN not configured' }, { status: 500 })

  try {
    const snapshot = await buildSlackSnapshot()
    await setCache('slack', snapshot)
    return NextResponse.json({ ok: true, ...snapshot })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
