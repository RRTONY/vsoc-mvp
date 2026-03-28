'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { WebWorkMember } from '@/lib/types'

interface Props {
  members: WebWorkMember[]
}

const MEMBER_COLORS: Record<string, string> = {
  kim:    '#4F46E5',
  chase:  '#7C3AED',
  alex:   '#0891B2',
  daniel: '#059669',
  josh:   '#D97706',
  rob:    '#DC2626',
  tony:   '#6B7280',
  ben:    '#BE185D',
}

function fallbackColor(i: number) {
  const palette = ['#4F46E5','#7C3AED','#0891B2','#059669','#D97706','#DC2626','#6B7280','#BE185D']
  return palette[i % palette.length]
}

function dayLabel(dateStr: string) {
  // "YYYY-MM-DD" → "Mon", "Tue" etc.
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

export default function DayStackedBar({ members }: Props) {
  if (!members.length) return null

  // Build data array: one entry per day
  const allDates = members[0]?.byDay?.map(d => d.date) ?? []
  if (!allDates.length) return null

  const data = allDates.map((date) => {
    const entry: Record<string, string | number> = { day: dayLabel(date) }
    members.forEach((m) => {
      const dayData = m.byDay.find(d => d.date === date)
      entry[m.username] = dayData?.hours ?? 0
    })
    return entry
  })

  const activeMembers = members.filter(m => m.totalHours > 0)

  return (
    <div className="card px-4 pt-4 pb-2">
      <div className="slbl mb-0 text-xs">Hours by Day</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}h`}
          />
          <Tooltip
            formatter={(v, name) => [`${v}h`, String(name)]}
            contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 6 }}
            cursor={{ fill: '#F9FAFB' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => <span style={{ color: '#6B7280', textTransform: 'capitalize' }}>{value}</span>}
          />
          {activeMembers.map((m, i) => (
            <Bar
              key={m.username}
              dataKey={m.username}
              stackId="a"
              fill={MEMBER_COLORS[m.username] ?? fallbackColor(i)}
              radius={i === activeMembers.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
