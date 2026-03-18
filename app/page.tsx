'use client'

import { useEffect, useState, useCallback } from 'react'
import StatBox from '@/components/StatBox'
import ProgressBar from '@/components/ProgressBar'
import Topbar from '@/components/Topbar'

interface SlackData {
  weeklyReports?: { filed: string[]; missing: string[]; week: string }
  slackStats?: { totalMessages: number; activeMembers: number; channels: number }
  error?: string
}

interface ClickUpData {
  totalTasks?: number
  overdue?: number
  overduePercent?: number
  urgent?: number
  error?: string
}

const FLOW = [
  { name: 'Tony', pct: 88, note: 'Vision engine · Protect mornings' },
  { name: 'Kim', pct: 65, note: 'Finance chaos resolved → flow improving' },
  { name: 'Josh', pct: 72, note: 'Batch legal days Mon/Wed' },
  { name: 'Rob', pct: 55, note: 'Needs 4hr grant blocks' },
  { name: 'Alex', pct: 60, note: 'Scope clarity = flow' },
  { name: 'Daniel', pct: 75, note: 'Migration complete · on track' },
]

const OKRS = [
  { id: 'OKR01', label: '$5M Revenue', pct: 1, note: '$31K YTD · need $95K/wk' },
  { id: 'OKR02', label: 'Pipeline', pct: 38, note: '30 active deals' },
  { id: 'OKR03', label: 'Action Close Rate', pct: 11, note: '8/75 · target 90%' },
  { id: 'OKR04', label: 'STBL Gatekeepers', pct: 10, note: 'From 23K LinkedIn DB' },
  { id: 'OKR05', label: 'Accounting Fix', pct: 40, note: 'Hiline fired · new search' },
  { id: 'OKR06', label: 'Website Migration', pct: 100, note: 'ramprate.com DONE ✓' },
]

const REFRESH_INTERVAL = 5 * 60 * 1000

export default function DashboardPage() {
  const [slack, setSlack] = useState<SlackData | null>(null)
  const [clickup, setClickUp] = useState<ClickUpData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    const [s, c] = await Promise.all([
      fetch('/api/slack-stats').then((r) => r.json()).catch(() => null),
      fetch('/api/clickup-tasks').then((r) => r.json()).catch(() => null),
    ])
    setSlack(s)
    setClickUp(c)
    setLastUpdated(new Date().toLocaleTimeString())
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [refresh])

  const wr = slack?.weeklyReports
  const filed = wr?.filed ?? []
  const missing = wr?.missing ?? []
  const week = wr?.week ?? 'This week'

  return (
    <>
      <Topbar onRefresh={refresh} lastUpdated={lastUpdated} />

      <div className="slbl mt-6">Command Overview — Week of {week}</div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatBox
          value={loading ? '—' : filed.length}
          label="Reports Filed"
          sub={filed.length ? filed.map((n) => n.split(' ')[0]).join(' · ') : 'None yet'}
          shade="black"
          loading={loading}
        />
        <StatBox
          value={loading ? '—' : missing.length}
          label="Missing"
          sub={missing.length ? missing.map((n) => n.split(' ')[0]).join(' · ') : 'All filed ✓'}
          shade="gray"
          loading={loading}
        />
        <StatBox
          value="12"
          label="BILL.com"
          sub="Sync conflicts"
          shade="gray"
        />
        <StatBox
          value={loading ? '—' : `${clickup?.overduePercent ?? '—'}%`}
          label="CRM Overdue"
          sub={clickup ? `${clickup.overdue}/${clickup.totalTasks} tasks` : '—'}
          shade="gray"
          loading={loading}
        />
        <StatBox
          value="$50K"
          label="STBL Monthly"
          sub="Target Apr 30"
          shade="black"
        />
        <StatBox
          value="100%"
          label="ramprate.com"
          sub="Migration done"
          shade="black"
        />
      </div>

      <div className="slbl">Today&apos;s Critical Items</div>

      {missing.length > 0 && (
        <div className="alert alert-red">
          <strong>{missing.map((n) => n.split(' ')[0]).join(' + ')}:</strong>{' '}
          Weekly reports not filed as of today.
        </div>
      )}
      <div className="alert alert-red">
        <strong>BILL.com:</strong> 12 sync conflicts + Holographik invoice pending. Kim to resolve today.
      </div>
      <div className="alert alert-amber">
        <strong>Braintrust template:</strong> 4-point checklist not integrated. Kim due Mar 18.{' '}
        <a href="https://app.clickup.com/t/868hwv6u4" target="_blank" className="underline">
          Task 868hwv6u4
        </a>
      </div>
      <div className="alert alert-blue">
        <strong>Reeve — 2 PM today:</strong> Flipped ownership model review. Alex Bolt package needed before call.
      </div>

      <div className="slbl">Team Flow This Week</div>
      <div className="card">
        <div className="card-body">
          {FLOW.map((f) => (
            <ProgressBar key={f.name} label={f.name} pct={f.pct} note={f.note} />
          ))}
        </div>
      </div>

      <div className="slbl">OKR Pulse</div>
      <div className="card">
        <div className="card-body">
          {OKRS.map((o) => (
            <ProgressBar key={o.id} id={o.id} label={o.label} pct={o.pct} note={o.note} />
          ))}
        </div>
      </div>
    </>
  )
}
