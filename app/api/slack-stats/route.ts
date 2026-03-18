import { NextResponse } from 'next/server'
import { channelHistory, userInfo, usersList, conversationsList } from '@/lib/slack'

const WEEKLY_REPORTS_CHANNEL = 'C08K6KM53FV'
const FULL_TEAM = ['Rob Holmes', 'Alex Veytsel', 'Josh Bykowski', 'Kim / Chase', 'Daniel Baez', 'Ben Sheppard']

function weekLabel() {
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[mon.getMonth()]} ${mon.getDate()}–${sun.getDate()}`
}

export async function GET() {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    return NextResponse.json({
      weeklyReports: { filed: [], missing: FULL_TEAM, week: weekLabel() },
      slackStats: { totalMessages: 0, activeMembers: 0, channels: 0 },
      error: 'SLACK_BOT_TOKEN not configured',
    })
  }

  try {
    const oldest = String(Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000))
    const [historyData, membersData, channelsData] = await Promise.all([
      channelHistory(WEEKLY_REPORTS_CHANNEL, oldest),
      usersList(),
      conversationsList(),
    ])

    const messages: Array<{ user?: string }> = historyData.messages ?? []

    // Resolve user IDs to real names
    const uniqueIds = Array.from(new Set(messages.map((m) => m.user).filter(Boolean))) as string[]
    const userMap: Record<string, string> = {}
    await Promise.all(
      uniqueIds.map(async (uid) => {
        try {
          const d = await userInfo(uid)
          if (d.user) userMap[uid] = d.user.real_name ?? d.user.name ?? ''
        } catch { /* ignore */ }
      })
    )

    const posters = Array.from(new Set(Object.values(userMap)))

    const filed: string[] = []
    const missing: string[] = []
    for (const member of FULL_TEAM) {
      const firstName = member.split(' ')[0].toLowerCase()
      const kimAlias = member === 'Kim / Chase'
      const didFile = posters.some((p) => {
        const pl = p.toLowerCase()
        return kimAlias
          ? pl.includes('kim') || pl.includes('chase')
          : pl.includes(firstName)
      })
      if (didFile) filed.push(member)
      else missing.push(member)
    }

    const activeMembers = (membersData.members ?? []).filter(
      (m: { deleted?: boolean; is_bot?: boolean }) => !m.deleted && !m.is_bot
    ).length

    return NextResponse.json({
      weeklyReports: { filed, missing, week: weekLabel() },
      slackStats: {
        totalMessages: messages.length,
        activeMembers,
        channels: (channelsData.channels ?? []).length,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
