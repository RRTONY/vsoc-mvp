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

import { SLACK_CHANNEL_WEEKLY_REPORTS } from '@/lib/constants'
import { getTeamMembers } from '@/lib/team-db'

function weekLabel() {
  const now = new Date()
  // Reporting week = last Friday → most recent Friday (the period reports cover)
  const thisFri = getMostRecentFriday(now)
  const lastFri = new Date(thisFri)
  lastFri.setDate(thisFri.getDate() - 7)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(lastFri)}–${fmt(new Date(thisFri.getTime() - 86400000))}` // last Fri → Thu before this Fri
}

export { weekLabel }

// Returns most recent Friday (start of current week window)
function getMostRecentFriday(from: Date): Date {
  const d = new Date(from)
  const jsDay = d.getDay() // Sun=0 Mon=1 ... Sat=6
  const daysSinceFriday = (jsDay + 2) % 7 // Fri=0 Sat=1 Sun=2 Mon=3 Tue=4 Wed=5 Thu=6
  d.setDate(d.getDate() - daysSinceFriday)
  d.setHours(0, 0, 0, 0)
  return d
}

function getPostersFromMessages(
  messages: Array<{ user?: string; username?: string; subtype?: string; ts?: string; text?: string }>,
  userMap: Record<string, string>,
  handleMap: Record<string, string>,
  fromTs: number,
  toTs: number
) {
  const window = messages.filter(m => {
    const ts = parseFloat(m.ts ?? '0') * 1000
    return ts >= fromTs && ts < toTs && (m.text ?? '').toLowerCase().includes('#myweeklyreport')
  })
  return {
    names: Array.from(new Set([
      ...window.map(m => m.user ? userMap[m.user] : '').filter(Boolean),
      ...window.filter(m => m.subtype === 'bot_message' && m.username).map(m => m.username!),
    ])),
    handles: Array.from(new Set(window.map(m => m.user ? handleMap[m.user] : '').filter(Boolean))),
  }
}

function matchesAlias(text: string, alias: string): boolean {
  const t = text.toLowerCase()
  const a = alias.toLowerCase()
  // Exact match, or alias appears as a whole word at start/end of the name
  return t === a || t.startsWith(a + ' ') || t.endsWith(' ' + a) || t.includes(' ' + a + ' ')
}

function whoFiled(
  names: string[],
  handles: string[],
  reportMembers: Array<{ full_name: string; slack_aliases: string[] }>
): string[] {
  const filed: string[] = []
  for (const member of reportMembers) {
    const aliases = member.slack_aliases.length
      ? member.slack_aliases
      : [member.full_name.split(' ')[0].toLowerCase()]
    const didFile =
      names.some(p => aliases.some(a => matchesAlias(p, a))) ||
      handles.some(h => aliases.some(a => matchesAlias(h, a)))
    if (didFile) filed.push(member.full_name)
  }
  return filed
}

export async function buildSlackSnapshot() {
  const now = new Date()

  // Week 1 window: Friday two weeks ago → Friday last week
  // Week 2 window: Friday last week → now
  const week2Start = getMostRecentFriday(now)
  const week1Start = new Date(week2Start)
  week1Start.setDate(week2Start.getDate() - 7)

  const oldest = String(Math.floor(week1Start.getTime() / 1000))

  const [historyData, membersData, channelsData, teamMembers] = await Promise.all([
    channelHistory(SLACK_CHANNEL_WEEKLY_REPORTS, oldest),
    usersList(),
    conversationsList(),
    getTeamMembers(),
  ])

  const reportMembers = teamMembers.filter(m => m.files_report)
  const allMemberNames = teamMembers.map(m => m.full_name)

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

  const messages: Array<{ user?: string; username?: string; subtype?: string; ts?: string; text?: string }> = (historyData as { messages?: typeof messages }).messages ?? []

  // Week 1 and Week 2 filing detection
  const week1 = getPostersFromMessages(messages, userMap, handleMap, week1Start.getTime(), week2Start.getTime())
  const week2 = getPostersFromMessages(messages, userMap, handleMap, week2Start.getTime(), now.getTime() + 1)

  const filedWeek1 = whoFiled(week1.names, week1.handles, reportMembers)
  const filedWeek2 = whoFiled(week2.names, week2.handles, reportMembers)

  const filed = Array.from(new Set([...filedWeek1, ...filedWeek2]))
  const missing = allMemberNames.filter(n => reportMembers.some(m => m.full_name === n) && !filed.includes(n))

  // Group tagged reports by day (YYYY-MM-DD)
  const dayCounts: Record<string, number> = {}
  for (const msg of messages) {
    if (msg.ts && (msg.text ?? '').toLowerCase().includes('#myweeklyreport')) {
      const d = new Date(parseFloat(msg.ts) * 1000).toISOString().slice(0, 10)
      dayCounts[d] = (dayCounts[d] ?? 0) + 1
    }
  }
  const messagesByDay = Object.entries(dayCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  // Week labels e.g. "Mar 27" and "Apr 3"
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const week1Label = `${fmtDate(week1Start)}–${fmtDate(new Date(week2Start.getTime() - 86400000))}`
  const week2Label = `${fmtDate(week2Start)}–${fmtDate(now)}`

  return {
    weeklyReports: { filed, missing, week: weekLabel(), filedWeek1, filedWeek2, week1Label, week2Label },
    slackStats: {
      totalMessages: messages.length,
      activeMembers: allUsers.filter(m => !m.deleted && !m.is_bot).length,
      channels: ((channelsData as { channels?: unknown[] }).channels ?? []).length,
      messagesByDay,
    },
  }
}
