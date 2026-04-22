import { getTeamMembers } from './team-db'

const BASE = 'https://api.webwork-tracker.com/api/v2'

function headers() {
  return { Authorization: `Bearer ${process.env.WEBWORK_API_KEY}` }
}

export interface DayHours {
  date: string
  minutes: number
  entries: { task: string; project: string; minutes: number; start: string; end: string }[]
}

export async function getMemberHours(userId: number, date: string): Promise<DayHours> {
  const res = await fetch(`${BASE}/time-entries?user_id=${userId}&date=${date}`, { headers: headers() })
  const data = await res.json()
  const entries = (data.data ?? []).map((e: {
    task_title: string; project_name: string; total_minutes: number; start_time: string; end_time: string
  }) => ({
    task: e.task_title,
    project: e.project_name,
    minutes: e.total_minutes,
    start: e.start_time,
    end: e.end_time,
  }))
  return {
    date,
    minutes: entries.reduce((s: number, e: { minutes: number }) => s + e.minutes, 0),
    entries,
  }
}

export async function getWeekHours(userId: number, weekDates: string[]): Promise<{ totalMinutes: number; byDay: DayHours[] }> {
  const byDay = await Promise.all(weekDates.map(d => getMemberHours(userId, d)))
  return {
    totalMinutes: byDay.reduce((s, d) => s + d.minutes, 0),
    byDay,
  }
}

export async function buildWebWorkSnapshot() {
  const weekDates = getCurrentWeekDates()
  const lastWeekDates = getLastWeekDates()

  const teamMembers = await getTeamMembers()
  const trackable = teamMembers.filter(m => m.webwork_user_id)

  const results = await Promise.all(
    trackable.map(async (member) => {
      const userId = parseInt(member.webwork_user_id!, 10)
      const username = member.vcos_username ?? member.full_name.split(' ')[0].toLowerCase()
      try {
        const [{ totalMinutes, byDay }, { totalMinutes: lastMinutes }] = await Promise.all([
          getWeekHours(userId, weekDates),
          getWeekHours(userId, lastWeekDates),
        ])
        return {
          username,
          totalMinutes,
          totalHours: Math.round(totalMinutes / 60 * 10) / 10,
          lastWeekHours: Math.round(lastMinutes / 60 * 10) / 10,
          byDay: byDay.map(d => ({ date: d.date, minutes: d.minutes, hours: Math.round(d.minutes / 60 * 10) / 10 })),
        }
      } catch {
        return { username, totalMinutes: 0, totalHours: 0, lastWeekHours: 0, byDay: [] }
      }
    })
  )
  return { week: weekDates, lastWeek: lastWeekDates, members: results }
}

// Returns Mon–Sun dates for the current week
export function getCurrentWeekDates(): string[] {
  const today = new Date()
  const day = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

// Returns Mon–Sun dates for the previous week
export function getLastWeekDates(): string[] {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) - 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}
