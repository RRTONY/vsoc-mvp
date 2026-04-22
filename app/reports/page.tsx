'use client'

import { useEffect, useState, useRef } from 'react'
import { useRefresh } from '@/components/RefreshContext'
import { ShareSlackButton } from '@/components/ShareButtons'
import type { Task, ClickUpData, SlackData, WebWorkMember, Meeting } from '@/lib/types'
interface TeamMember { name: string; cuKey: string; role: string; filesReport: boolean }
interface OKR { id: string; label: string; pct: number; note: string }
import { useMe } from '@/hooks/useMe'
import { CLICKUP_WORKSPACE_URL } from '@/lib/constants'
import StaleBadge from '@/components/StaleBadge'
import MeetingTimeline from '@/components/MeetingTimeline'
import dynamic from 'next/dynamic'
const HoursBar = dynamic(() => import('@/components/charts/HoursBar'), { ssr: false })
const OkrRings = dynamic(() => import('@/components/charts/OkrRing'), { ssr: false })
const TrendCards = dynamic(() => import('@/components/charts/TrendCards'), { ssr: false })
const DayStackedBar = dynamic(() => import('@/components/charts/DayStackedBar'), { ssr: false })
const SlackHeatMap = dynamic(() => import('@/components/charts/SlackHeatMap'), { ssr: false })

// ─── Types ──────────────────────────────────────────────────────────────────

interface DailyReport {
  report_date: string
  reports_filed: string[]
  reports_missing: string[]
  overdue_count: number
  urgent_count: number
  total_tasks: number
  team_hours: Record<string, number>
  slack_message_ts: string | null
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="slbl">{title}</div>
      {children}
    </div>
  )
}

function MemberRollup({ name, stats, tasks, didFile, flow, loading }: {
  name: string
  stats: { total: number; overdue: number; urgent: number } | null
  tasks: Task[]; didFile: boolean; flow: number | null; loading: boolean
}) {
  const [open, setOpen] = useState(false)
  const hasIssues = (stats?.overdue ?? 0) > 0 || (stats?.urgent ?? 0) > 0 || !didFile
  return (
    <div className={`border ${hasIssues ? 'border-ink/30' : 'border-sand3'}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sand3/40 transition-colors"
      >
        <div className={`w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0 ${hasIssues ? 'bg-black text-white' : 'bg-sand2 text-ink'}`}>
          {name[0]}
        </div>
        <span className="text-sm font-bold flex-1">{name}</span>
        {loading ? (
          <span className="text-xs text-ink4 animate-pulse">Loading…</span>
        ) : stats ? (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-ink3">{stats.total} tasks</span>
            {stats.overdue > 0 && <span className="font-bold text-red-600">{stats.overdue} overdue</span>}
            {stats.urgent > 0 && <span className="font-bold text-amber-600">{stats.urgent} urgent</span>}
            {flow !== null && (
              <div className="flex items-center gap-1.5">
                <div className="w-12 h-1 bg-sand3"><div className="h-full bg-black" style={{ width: `${flow}%` }} /></div>
                <span className="font-mono text-ink3">{flow}%</span>
              </div>
            )}
          </div>
        ) : null}
        <span className={`text-[10px] font-bold ml-2 ${didFile ? 'text-green-700' : 'text-red-600'}`}>
          {didFile ? '● Filed' : '✕ Missing'}
        </span>
        <span className="text-ink4 text-xs ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-sand3 px-4 py-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-ink3 py-2">No active tasks in ClickUp.</p>
          ) : (
            <>
              {tasks.slice(0, 20).map((t) => (
                <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-2 py-2 border-b border-sand3 last:border-0 hover:bg-sand3/30 -mx-4 px-4 transition-colors group">
                  {t.priority && (
                    <span className={`text-[10px] font-bold px-1 py-0.5 flex-shrink-0 mt-0.5 ${t.priority === 'urgent' ? 'bg-black text-white' : t.priority === 'high' ? 'bg-sand2 text-ink3' : 'text-ink4'}`}>
                      {t.priority === 'urgent' ? 'URG' : t.priority === 'high' ? 'HI' : ''}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium group-hover:underline">{t.name}</div>
                    <div className="text-[11px] text-ink4">{t.list}{t.dueDate ? ` · Due ${t.dueDate}` : ''}</div>
                  </div>
                  <span className="text-ink4 text-xs">↗</span>
                </a>
              ))}
              {tasks.length > 20 && (
                <a href="{`${CLICKUP_WORKSPACE_URL}/home`}" target="_blank" rel="noopener noreferrer"
                  className="block text-xs text-ink4 hover:underline py-2">
                  +{tasks.length - 20} more in ClickUp ↗
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MeetingCard({ m }: { m: Meeting }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-sand3 mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-sand3/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{m.title}</div>
          <div className="text-xs text-ink3 mt-0.5">
            {m.date}{m.duration ? ` · ${m.duration}` : ''}
            {m.participants.length ? ` · ${m.participants.length} attendee${m.participants.length !== 1 ? 's' : ''}` : ''}
          </div>
          {m.teamParticipants && m.teamParticipants.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {m.teamParticipants.map(name => (
                <span key={name} className="text-[10px] font-bold bg-accent-light text-accent px-1.5 py-0.5">{name.split(' ')[0]}</span>
              ))}
            </div>
          )}
        </div>
        <span className="text-ink4 text-xs mt-0.5 flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-sand3 px-4 py-3 space-y-3">
          {m.overview && (
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-ink3 mb-1">Overview</div>
              <p className="text-sm leading-relaxed">{m.overview}</p>
            </div>
          )}
          {m.actionItems && (
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-ink3 mb-1">Action Items</div>
              <p className="text-sm leading-relaxed whitespace-pre-line">{m.actionItems}</p>
            </div>
          )}
          {m.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {m.keywords.slice(0, 8).map((k) => (
                <span key={k} className="text-xs border border-sand3 px-1.5 py-0.5 text-ink3">{k}</span>
              ))}
            </div>
          )}
          <a
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-mono border border-black/30 px-2 py-0.5 hover:bg-black hover:text-white transition-colors"
          >
            Full transcript ↗
          </a>
        </div>
      )}
    </div>
  )
}

interface SubmittedReport {
  id: string
  submitted_by: string
  week_label: string
  outcomes: string | null
  goals_met: string | null
  deliverables: string | null
  deals_relationships: string | null
  interesting: string | null
  priorities: string | null
  blockers: string | null
  win: string | null
  kudos: string | null
  created_at: string
  ai_analysis: { summary: string; insights: string[]; actions: string[] } | null
}

function ReportField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-ink3 mb-1">{label}</div>
      <p className="text-sm text-ink2 whitespace-pre-line leading-relaxed">{value}</p>
    </div>
  )
}

function SubmittedReportCard({ r, isMine }: { r: SubmittedReport; isMine: boolean }) {
  const [open, setOpen] = useState(false)
  const date = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <div className={`border ${isMine ? 'border-accent/40' : 'border-sand3'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sand3/40 transition-colors"
      >
        <div className={`w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0 ${isMine ? 'bg-accent text-white' : 'bg-sand2 text-ink'}`}>
          {r.submitted_by[0]}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold">{r.submitted_by}</span>
          {isMine && <span className="text-[10px] font-bold text-accent ml-2">YOU</span>}
          <span className="text-xs text-ink3 ml-2">{r.week_label}</span>
        </div>
        {r.win && (
          <span className="text-xs text-ink3 truncate hidden sm:block max-w-xs italic">"{r.win}"</span>
        )}
        {r.ai_analysis && (
          <span className="text-[10px] font-bold text-accent border border-accent px-1.5 py-0.5 flex-shrink-0">AI</span>
        )}
        <span className="text-xs text-ink4 flex-shrink-0">{date}</span>
        <span className="text-ink4 text-xs ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-sand3 px-4 py-4 space-y-4">
          {r.ai_analysis && (
            <div className="bg-sand2 p-3 space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-ink3">AI Summary</div>
              <p className="text-sm text-ink2 leading-relaxed">{r.ai_analysis.summary}</p>
              {r.ai_analysis.insights?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-ink3 mb-1">Insights</div>
                  <ul className="space-y-1">
                    {r.ai_analysis.insights.map((ins, i) => (
                      <li key={i} className="text-xs text-ink2 flex gap-2">
                        <span className="text-ink4 shrink-0">◆</span><span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {r.ai_analysis.actions?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-ink3 mb-1">Recommended Actions</div>
                  <ul className="space-y-1">
                    {r.ai_analysis.actions.map((act, i) => (
                      <li key={i} className="text-xs text-ink2 flex gap-2">
                        <span className="text-amber-500 shrink-0">→</span><span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <ReportField label="Business Outcomes" value={r.outcomes} />
          <ReportField label="Goals from Last Week" value={r.goals_met} />
          <ReportField label="Deliverables" value={r.deliverables} />
          <ReportField label="Deals & Relationships" value={r.deals_relationships} />
          <ReportField label="Win of the Week" value={r.win} />
          <ReportField label="Priorities Next Week" value={r.priorities} />
          <ReportField label="Blockers" value={r.blockers} />
          <ReportField label="Most Interesting This Week" value={r.interesting} />
          <ReportField label="Kudos" value={r.kudos} />
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'weekly' | 'submitted' | 'daily' | 'hours'>('weekly')
  const [reportMembers, setReportMembers] = useState<string[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [okrs, setOkrs] = useState<OKR[]>([])
  const [slack, setSlack] = useState<SlackData | null>(null)
  const [clickup, setClickUp] = useState<ClickUpData | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFetched, setLastFetched] = useState('')
  const { isAdmin, me } = useMe()
  const [dailyHistory, setDailyHistory] = useState<DailyReport[]>([])
  const [dailyLoading, setDailyLoading] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [submittedReports, setSubmittedReports] = useState<SubmittedReport[]>([])
  const [submittedLoading, setSubmittedLoading] = useState(false)
  const [filterMember, setFilterMember] = useState('')
  const [filterWeek, setFilterWeek] = useState('')
  const [webworkData, setWebworkData] = useState<{ week: string[]; lastWeek?: string[]; members: WebWorkMember[]; error?: string } | null>(null)
  const [webworkLoading, setWebworkLoading] = useState(false)
  const { refreshKey } = useRefresh()
  const prevKey = useRef(refreshKey)

  useEffect(() => {
    fetch('/api/team', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: Array<{ full_name: string; clickup_key: string | null; role_description: string | null; files_report: boolean; active: boolean }>) => {
        const active = (data ?? []).filter(m => m.active)
        setReportMembers(active.filter(m => m.files_report).map(m => m.full_name))
        setTeam(active.map(m => ({
          name: m.full_name,
          cuKey: m.clickup_key ?? m.full_name.split(' ')[0].toLowerCase(),
          role: m.role_description ?? '',
          filesReport: m.files_report,
        })))
      })
      .catch(() => {})
    fetch('/api/okrs', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: OKR[]) => { if (Array.isArray(data)) setOkrs(data) })
      .catch(() => {})
  }, [])

  async function fetchAll(signal?: AbortSignal) {
    setLoading(true)
    const [s, c, f] = await Promise.all([
      fetch('/api/slack-stats', { signal, cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetch('/api/clickup-tasks', { signal, cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetch('/api/fireflies-meetings', { signal, cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    ])
    setSlack(s)
    setClickUp(c)
    setMeetings(f?.meetings ?? [])
    setLoading(false)
    setLastFetched(new Date().toLocaleTimeString())
  }

  async function fetchDailyHistory() {
    setDailyLoading(true)
    const res = await fetch('/api/reports/daily').then(r => r.json()).catch(() => [])
    setDailyHistory(res ?? [])
    setDailyLoading(false)
  }

  async function fetchWebwork() {
    setWebworkLoading(true)
    const res = await fetch('/api/webwork').then(r => r.json()).catch(() => null)
    setWebworkData(res)
    setWebworkLoading(false)
  }

  async function fetchSubmitted() {
    setSubmittedLoading(true)
    const res = await fetch('/api/weekly-reports', { cache: 'no-store' }).then(r => r.json()).catch(() => [])
    setSubmittedReports(Array.isArray(res) ? res : [])
    setSubmittedLoading(false)
  }

  async function generateNow() {
    setGeneratingReport(true)
    await fetch('/api/reports/daily', { method: 'POST' })
    await fetchDailyHistory()
    setGeneratingReport(false)
  }

  useEffect(() => {
    const ctrl = new AbortController()
    fetchAll(ctrl.signal)
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    if (tab === 'daily') fetchDailyHistory()
    if (tab === 'hours') fetchWebwork()
    if (tab === 'submitted') fetchSubmitted()
  }, [tab])

  useEffect(() => {
    if (refreshKey === prevKey.current) return
    prevKey.current = refreshKey
    const ctrl = new AbortController()
    fetchAll(ctrl.signal)
    return () => ctrl.abort()
  }, [refreshKey])

  const wr = slack?.weeklyReports
  const filed = wr?.filed ?? []
  const missing = wr?.missing ?? []
  const week = wr?.week ?? '—'
  const slackStats = slack?.slackStats

  // Build full Slack report message
  const fullReportMsg = [
    `📊 *Weekly Roll-Up Report — Week of ${week}*`,
    ``,
    `*TEAM REPORTS*`,
    `Filed: ${filed.length}/${reportMembers.length} — ${filed.map(n => n.split(' ')[0]).join(', ') || 'none'}`,
    missing.length ? `Missing: ${missing.map(n => n.split(' ')[0]).join(', ')}` : '✅ All filed',
    ``,
    `*CRM HEALTH*`,
    clickup ? `${clickup.overduePercent}% overdue (${clickup.overdue}/${clickup.totalTasks} tasks) · ${clickup.urgent} urgent` : 'Data unavailable',
    ``,
    `*OKRs*`,
    okrs.map(o => `${o.label} — ${o.pct}% (${o.note})`).join('\n'),
    ``,
    `_Posted from Visual Chief of Staff_`,
  ].join('\n')

  const TABS = [
    { id: 'weekly', label: 'Weekly Roll-Up' },
    { id: 'submitted', label: 'Submitted Reports' },
    { id: 'daily', label: 'Daily History' },
    { id: 'hours', label: 'Team Hours' },
  ] as const

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-sand3 mt-6 mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
              tab === t.id ? 'border-ink text-ink' : 'border-transparent text-ink4 hover:text-ink3'
            }`}
          >
            {t.label}
          </button>
        ))}
        {isAdmin && tab === 'daily' && (
          <button
            onClick={generateNow}
            disabled={generatingReport}
            className="ml-auto btn-primary text-xs py-1 px-3 mb-1"
          >
            {generatingReport ? 'Generating…' : 'Generate Now'}
          </button>
        )}
      </div>

      {/* ── SUBMITTED REPORTS TAB ───────────────────────────── */}
      {tab === 'submitted' && (() => {
        const weeks = Array.from(new Set(submittedReports.map(r => r.week_label))).slice(0, 12)
        const latestWeek = weeks[0] ?? ''
        const latestSubmitters = new Set(submittedReports.filter(r => r.week_label === latestWeek).map(r => r.submitted_by))
        const filtered = submittedReports.filter(r =>
          (!filterMember || r.submitted_by === filterMember) &&
          (!filterWeek || r.week_label === filterWeek)
        )
        return (
          <div className="space-y-4">
            {submittedLoading ? (
              <div className="text-ink4 text-sm animate-pulse">Loading reports…</div>
            ) : submittedReports.length === 0 ? (
              <div className="card p-6 text-center text-ink4 text-sm">
                No submitted reports yet. Team members can submit via the Submit Report tab.
              </div>
            ) : (
              <>
                {/* Summary grid — latest week */}
                {latestWeek && (
                  <div className="card">
                    <div className="card-hd">
                      <div className="card-ti">This Week — {latestWeek}</div>
                      <div className="text-xs text-ink3">{latestSubmitters.size} of {reportMembers.length} submitted</div>
                    </div>
                    <div className="card-body p-3">
                      <div className="flex flex-wrap gap-2">
                        {reportMembers.map(name => {
                          const filed = latestSubmitters.has(name)
                          return (
                            <button
                              key={name}
                              onClick={() => setFilterMember(filterMember === name ? '' : name)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border transition-colors ${
                                filterMember === name
                                  ? 'border-ink bg-ink text-white'
                                  : filed
                                  ? 'border-green-600 text-green-800 bg-green-50 hover:bg-green-100'
                                  : 'border-sand3 text-ink4 bg-sand2 hover:border-ink3'
                              }`}
                            >
                              <span>{filed ? '✓' : '✗'}</span>
                              <span>{name.split(' ')[0]}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter bar */}
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={filterMember}
                    onChange={e => setFilterMember(e.target.value)}
                    className="field-input text-xs py-1.5 w-auto"
                  >
                    <option value="">All members</option>
                    {reportMembers.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <select
                    value={filterWeek}
                    onChange={e => setFilterWeek(e.target.value)}
                    className="field-input text-xs py-1.5 w-auto"
                  >
                    <option value="">All weeks</option>
                    {weeks.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  {(filterMember || filterWeek) && (
                    <button
                      onClick={() => { setFilterMember(''); setFilterWeek('') }}
                      className="text-xs text-ink4 hover:text-ink underline"
                    >
                      Clear
                    </button>
                  )}
                  <span className="text-xs text-ink4 ml-auto">{filtered.length} report{filtered.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Report list */}
                {filtered.length === 0 ? (
                  <div className="text-sm text-ink4 py-4 text-center">No reports match the selected filters.</div>
                ) : (
                  filtered.map(r => <SubmittedReportCard key={r.id} r={r} isMine={me?.username === r.submitted_by} />)
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* ── DAILY HISTORY TAB ────────────────────────────────── */}
      {tab === 'daily' && (
        <div className="space-y-3">
          {dailyLoading ? (
            <div className="text-ink4 text-sm animate-pulse">Loading history…</div>
          ) : dailyHistory.length === 0 ? (
            <div className="card p-6 text-center text-ink4 text-sm">
              No daily reports yet.{isAdmin && ' Click "Generate Now" to create today\'s report.'}
            </div>
          ) : (
            dailyHistory.map(r => (
              <div key={r.report_date} className="card divide-y divide-sand3">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-bold text-sm">{new Date(r.report_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                  <div className="flex gap-4 text-xs text-ink3">
                    <span>✅ {r.reports_filed?.length ?? 0} filed</span>
                    {(r.reports_missing?.length ?? 0) > 0 && <span className="text-red-600">❌ {r.reports_missing.length} missing</span>}
                    <span>{r.overdue_count} overdue</span>
                    <span>{r.urgent_count} urgent</span>
                  </div>
                </div>
                {r.team_hours && Object.keys(r.team_hours).length > 0 && (
                  <div className="px-4 py-2 flex flex-wrap gap-3">
                    {Object.entries(r.team_hours).map(([name, hrs]) => (
                      <span key={name} className="text-xs text-ink3">
                        <span className="font-semibold capitalize">{name}</span> {hrs}h
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TEAM HOURS TAB ───────────────────────────────────── */}
      {tab === 'hours' && (
        <div className="space-y-4">
          {webworkLoading ? (
            <div className="text-ink4 text-sm animate-pulse">Loading WebWork hours…</div>
          ) : !webworkData || !webworkData.members ? (
            <div className="card p-6 text-center text-ink4 text-sm">
              {webworkData?.error ?? 'Failed to load WebWork data. Check WEBWORK_API_KEY.'}
            </div>
          ) : (
            <>
              <div className="text-xs text-ink3">
                Week of {webworkData.week?.[0]} – {webworkData.week?.[webworkData.week.length - 1]}
                <span className="ml-3 font-semibold text-ink">
                  {Math.round(webworkData.members.reduce((s, m) => s + m.totalHours, 0) * 10) / 10}h total
                </span>
              </div>

              {/* Trend cards */}
              <TrendCards
                members={webworkData.members}
                weekLabel={webworkData.week?.[0] ?? ''}
                lastWeekLabel={webworkData.lastWeek?.[0] ?? 'prior week'}
              />

              {/* Bar chart */}
              <div className="card px-4 pt-4 pb-2">
                <div className="slbl mb-0 text-xs">Hours This Week</div>
                <HoursBar members={webworkData.members} />
              </div>

              {/* Stacked by day */}
              <DayStackedBar members={webworkData.members} />

              {/* Detail rows */}
              <div className="card divide-y divide-sand3">
                {[...webworkData.members].sort((a, b) => b.totalHours - a.totalHours).map((m, i) => (
                  <div key={m.username} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                      style={{ background: i === 0 ? '#4F46E5' : i === 1 ? '#818CF8' : '#C7D2FE', color: i < 2 ? '#fff' : '#4F46E5' }}
                    >
                      {m.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold capitalize flex-1">{m.username}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-28 h-2 bg-sand3 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (m.totalHours / 40) * 100)}%`,
                            background: i === 0 ? '#4F46E5' : i === 1 ? '#818CF8' : '#C7D2FE',
                          }}
                        />
                      </div>
                      <span className="font-mono text-sm w-12 text-right tabular-nums">{m.totalHours}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── WEEKLY ROLL-UP TAB ───────────────────────────────── */}
      {tab === 'weekly' && <>
      <div className="flex items-center justify-between mb-1">
        <div className="slbl mb-0">Weekly Roll-Up — {week}</div>
        <div className="flex items-center gap-2">
          {lastFetched && <span className="text-xs text-ink4">Updated {lastFetched}</span>}
          <StaleBadge
            ageMinutes={(clickup as {_ageMinutes?: number})?._ageMinutes}
            circuitOpen={(clickup as {_circuitOpen?: boolean})?._circuitOpen}
          />
        </div>
      </div>

      {/* Executive summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            value: loading ? '…' : `${filed.length}/${reportMembers.length}`,
            label: 'Reports Filed',
            sub: loading ? '' : missing.length ? `Missing: ${missing.map(n => n.split(' ')[0]).join(', ')}` : 'All filed ✓',
            alert: !loading && missing.length > 0,
          },
          {
            value: loading ? '…' : `${clickup?.overduePercent ?? '—'}%`,
            label: 'CRM Overdue',
            sub: loading ? '' : clickup ? `${clickup.overdue} of ${clickup.totalTasks} tasks` : 'Error',
            alert: !loading && (clickup?.overduePercent ?? 0) > 50,
          },
          {
            value: loading ? '…' : clickup?.urgent ?? '—',
            label: 'Urgent Tasks',
            sub: loading ? '' : 'Need immediate action',
            alert: !loading && (clickup?.urgent ?? 0) > 0,
          },
          {
            value: loading ? '…' : meetings.length,
            label: 'Meetings',
            sub: loading ? '' : 'From Fireflies this period',
            alert: false,
          },
        ].map((s) => (
          <div key={s.label} className={`border p-3 ${s.alert ? 'border-red-300 bg-red-50' : 'border-sand3'} ${loading ? 'animate-pulse' : ''}`}>
            <div className="font-serif font-black text-3xl">{s.value}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-ink3 mt-0.5">{s.label}</div>
            {s.sub && <div className="text-xs text-ink4 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Team status roll-up */}
      <Section title="Team Assignment Roll-Up">
        <div className="space-y-2">
          {team.map((member) => {
            const stats = clickup?.assigneeStats
              ? Object.entries(clickup.assigneeStats).find(([k]) => k.includes(member.cuKey))?.[1]
              : null
            const tasks = clickup?.tasksByAssignee
              ? Object.entries(clickup.tasksByAssignee).find(([k]) => k.includes(member.cuKey))?.[1] ?? []
              : []
            const didFile = filed.includes(member.name)
            const flow = stats && stats.total > 0
              ? Math.max(5, Math.round(100 - (stats.overdue / stats.total) * 100))
              : null
            return (
              <MemberRollup
                key={member.name}
                name={member.name}
                stats={stats ?? null}
                tasks={tasks}
                didFile={didFile}
                flow={flow}
                loading={loading}
              />
            )
          })}
        </div>
      </Section>

      {/* Urgent + high priority tasks */}
      {!loading && ((clickup?.urgentDetails?.length ?? 0) > 0 || (clickup?.highDetails?.length ?? 0) > 0) && (
        <Section title="Priority Action Items">
          <div className="space-y-1.5">
            {[...(clickup?.urgentDetails ?? []), ...(clickup?.highDetails ?? [])].map((t) => (
              <a
                key={t.id}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 border border-sand3 hover:bg-sand3/30 transition-colors group"
              >
                <span className={`text-xs font-bold px-1.5 py-0.5 flex-shrink-0 ${t.priority === 'urgent' ? 'bg-black text-white' : 'bg-sand2 text-ink3'}`}>
                  {t.priority?.toUpperCase() || 'HIGH'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium group-hover:underline">{t.name}</div>
                  <div className="text-xs text-ink3 mt-0.5">
                    {t.list}{t.dueDate ? ` · Due ${t.dueDate}` : ''}{t.assignees.length ? ` · ${t.assignees.join(', ')}` : ''}
                  </div>
                </div>
                <span className="text-ink4 text-xs flex-shrink-0">↗</span>
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* OKR Roll-Up */}
      <Section title="OKR Roll-Up">
        <div className="card px-5">
          <OkrRings okrs={okrs} />
        </div>
      </Section>

      {/* Slack KPIs */}
      {!loading && slackStats && (
        <Section title="Slack Communication KPIs">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Messages This Week', value: slackStats.totalMessages.toLocaleString() },
              { label: 'Active Members', value: slackStats.activeMembers },
              { label: 'Public Channels', value: slackStats.channels },
            ].map((s) => (
              <div key={s.label} className="stat-tile">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          {slackStats.messagesByDay && slackStats.messagesByDay.length > 0 && (
            <div className="card px-4 py-4">
              <SlackHeatMap messagesByDay={slackStats.messagesByDay} />
            </div>
          )}
        </Section>
      )}

      {/* Fireflies meetings — timeline */}
      <Section title={`Meeting Intelligence${meetings.length ? ` (${meetings.length})` : ''}`}>
        {loading ? (
          <div className="card p-4 animate-pulse text-sm text-ink4">Loading meetings…</div>
        ) : (
          <MeetingTimeline meetings={meetings} />
        )}
      </Section>

      {/* Share bar */}
      {!loading && (
        <div className="flex flex-wrap gap-2 pb-8">
          <ShareSlackButton label="Post Full Report to Slack" message={fullReportMsg} />
          <a
            href="{`${CLICKUP_WORKSPACE_URL}/home`}"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-sand3 px-3 py-1.5 text-xs font-bold hover:bg-sand2 transition-colors"
          >
            Open ClickUp ↗
          </a>
          <a
            href="https://app.fireflies.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-sand3 px-3 py-1.5 text-xs font-bold hover:bg-sand2 transition-colors"
          >
            Open Fireflies ↗
          </a>
        </div>
      )}
      </>}
    </div>
  )
}
