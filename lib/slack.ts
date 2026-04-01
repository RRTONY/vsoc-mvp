const BASE = 'https://slack.com/api'

function headers() {
  return {
    Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  }
}

export async function slackGet(method: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}/${method}${qs ? '?' + qs : ''}`, {
    headers: headers(),
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Slack ${method} ${res.status}`)
  return res.json()
}

export async function postMessage(channel: string, text: string) {
  const res = await fetch(`${BASE}/chat.postMessage`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ channel, text }),
  })
  if (!res.ok) throw new Error(`Slack postMessage ${res.status}`)
  return res.json()
}

export async function authTest() {
  return slackGet('auth.test')
}

export async function channelHistory(channel: string, oldest: string, limit = '100') {
  return slackGet('conversations.history', { channel, oldest, limit })
}

export async function userInfo(user: string) {
  return slackGet('users.info', { user })
}

export async function usersList() {
  return slackGet('users.list')
}

export async function conversationsList() {
  // channels:read scope — public channels only
  return slackGet('conversations.list', {
    types: 'public_channel',
    limit: '200',
  })
}

import { TEAM_NAMES, SLACK_MATCH } from '@/lib/team'
import { SLACK_CHANNEL_WEEKLY_REPORTS } from '@/lib/constants'

function weekLabel() {
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[mon.getMonth()]} ${mon.getDate()}–${sun.getDate()}`
}

export { weekLabel }

export async function buildSlackSnapshot() {
  // Reports are filed Fri–Tue/Wed. Look back to most recent Friday to catch all submissions.
  const now = new Date()
  const daysSinceFriday = (now.getDay() + 2) % 7  // Fri=0, Sat=1, Sun=2, Mon=3, Tue=4, Wed=5, Thu=6
  const friday = new Date(now)
  friday.setDate(now.getDate() - daysSinceFriday)
  friday.setHours(0, 0, 0, 0)
  const oldest = String(Math.floor(friday.getTime() / 1000))

  const [historyData, membersData, channelsData] = await Promise.all([
    channelHistory(SLACK_CHANNEL_WEEKLY_REPORTS, oldest),
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

  const messages: Array<{ user?: string; username?: string; subtype?: string; ts?: string }> = (historyData as { messages?: typeof messages }).messages ?? []

  // Reports posted via Slack Workflow have subtype='bot_message' and username='Rob's Weekly Report'
  // Regular user posts have a user ID resolved via userMap
  const posters = Array.from(new Set([
    ...messages.map(m => m.user ? userMap[m.user] : '').filter(Boolean),
    ...messages.filter(m => m.subtype === 'bot_message' && m.username).map(m => m.username!),
  ]))
  const posterHandles = Array.from(new Set(
    messages.map(m => m.user ? handleMap[m.user] : '').filter(Boolean)
  ))

  // Group messages by day (YYYY-MM-DD)
  const dayCounts: Record<string, number> = {}
  for (const msg of messages) {
    if (msg.ts) {
      const d = new Date(parseFloat(msg.ts) * 1000).toISOString().slice(0, 10)
      dayCounts[d] = (dayCounts[d] ?? 0) + 1
    }
  }
  const messagesByDay = Object.entries(dayCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  const filed: string[] = []
  const missing: string[] = []
  for (const member of TEAM_NAMES) {
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
      messagesByDay,
    },
  }
}
