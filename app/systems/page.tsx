'use client'

import { useEffect, useState } from 'react'
import SystemRow from '@/components/SystemRow'
import ProgressBar from '@/components/ProgressBar'
import { useRefresh } from '@/components/RefreshContext'
import { useMe } from '@/hooks/useMe'
import type { HealthRow } from '@/app/api/cache-health/route'

type Status = 'green' | 'amber' | 'red'

interface SystemStatus {
  system: string
  status: Status
  detail: string
  url?: string
  notes?: string[]
  manual?: boolean
  updatedBy?: string
  updatedAt?: string
}

const STATIC_SYSTEMS: SystemStatus[] = [
  {
    system: 'Slack', status: 'green',
    detail: '3,267 msgs · 31 members · #weeklyreports active',
    url: 'https://app.slack.com',
    notes: [
      '#weeklyreports: all 5 members filed this week',
      '31 active members, 3 bots excluded',
      'Primary comms channel for RampRate team',
    ],
  },
  {
    system: 'ClickUp', status: 'red',
    detail: '75 tasks · 76% overdue · CRM needs triage',
    url: 'https://app.clickup.com/10643959',
    notes: [
      '76% of open tasks are past due date',
      'CRM list needs immediate triage — 40+ stale items',
      'Workspace ID: 10643959',
    ],
  },
  {
    system: 'Gmail', status: 'amber',
    detail: 'BILL.com to-do sent 8:28 AM · QuickBooks reports live',
    url: 'https://mail.google.com',
    notes: [
      'BILL.com payment action item sent to team this morning',
      'QuickBooks monthly report email sent to Tony',
      'No critical unread threads as of last check',
    ],
  },
  {
    system: 'Fireflies', status: 'green',
    detail: 'Reeve meetings access granted Mar 16 by Kim',
    url: 'https://app.fireflies.ai',
    notes: [
      'Reeve Opsahl given access to meeting transcripts Mar 16',
      'Auto-join enabled for all Tony calendar invites',
      'Transcripts synced to ClickUp weekly',
    ],
  },
  {
    system: 'BILL.com', status: 'red',
    detail: '12 sync conflicts unresolved · Holographik pending',
    url: 'https://app.bill.com',
    notes: [
      '12 QuickBooks sync conflicts need manual resolution',
      'Holographik vendor payment pending approval',
      'Action: Kim to resolve conflicts before end of week',
    ],
  },
  {
    system: 'QuickBooks', status: 'amber',
    detail: 'Incoming payments + outstanding invoices sent this AM',
    url: 'https://qbo.intuit.com',
    notes: [
      'Outstanding invoices report sent to Tony 8:30 AM',
      'Incoming payments reconciled through Mar 15',
      'BILL.com sync lag causing 12 unmatched transactions',
    ],
  },
  {
    system: 'Bitwarden', status: 'green',
    detail: 'Kim auditing logins · unlinking from Tony account',
    url: 'https://vault.bitwarden.com',
    notes: [
      'Kim performing login audit — removing stale shared credentials',
      'Unlinking personal Tony accounts from team vault',
      'All critical API keys migrated to team vault',
    ],
  },
  {
    system: 'Netlify', status: 'green',
    detail: 'ramprate.com live · VCOS deploying',
    url: 'https://app.netlify.com',
    notes: [
      'ramprate.com deployed and live',
      'vsoc.netlify.app — this app — active',
      'impactsoul.is live · tonygreenberg.com in progress',
    ],
  },
  {
    system: 'Braintrust', status: 'amber',
    detail: 'Ben Sheppard onboarded Mar 10 · template update pending',
    url: 'https://app.usebraintrust.com',
    notes: [
      'Ben Sheppard onboarded as contractor Mar 10',
      'Weekly report template needs update for new format',
      'Action: Chase to update template by Mar 21',
    ],
  },
  {
    system: 'Email Meter', status: 'green',
    detail: 'KPI active · Chase posted Mar 16 9:13 AM',
    url: 'https://emailmeter.com',
    notes: [
      'Email volume KPIs active and tracking',
      'Chase posted weekly email stats Mar 16',
      'Response time avg: 2.4 hours (on target)',
    ],
  },
  {
    system: 'WebWork', status: 'amber',
    detail: 'Audit gate: hours must align within 0.5hr tolerance',
    url: 'https://webworktracker.com',
    notes: [
      'Time tracking audit gate: reported hours vs WebWork must match within 0.5hr',
      '2 team members have pending hour discrepancies this week',
      'Action: Resolve before weekly report submission',
    ],
  },
  {
    system: 'Manus/AI', status: 'amber',
    detail: 'Daniel optimizing token usage · per-project key separation needed',
    url: 'https://manus.im',
    notes: [
      'Daniel reducing token burn on large research tasks',
      'API keys need to be separated per-project to track costs',
      'Action: Set up project-level keys in Netlify env vars',
    ],
  },
]

const ICONS: Record<string, string> = {
  Slack: '📬', ClickUp: '✅', Gmail: '📧', Fireflies: '🎙', 'BILL.com': '💳',
  QuickBooks: '📊', Bitwarden: '🔐', Netlify: '🌐', Braintrust: '📝',
  'Email Meter': '📈', WebWork: '⏱', 'Manus/AI': '🧠',
}

const MIGRATION = [
  { site: 'ramprate.com', pct: 100, deadline: 'Done ✓', owner: 'Daniel Baez' },
  { site: 'tonygreenberg.com', pct: 10, deadline: '~3 days', owner: 'Daniel Baez' },
  { site: 'tonygreenberg.co', pct: 5, deadline: 'Mar 21', owner: 'Webmaster/Chase' },
  { site: 'impactsoul.is', pct: 100, deadline: 'Live', owner: 'Kim/Chase' },
  { site: 'findmyme.com', pct: 0, deadline: 'Q2 2026', owner: 'Chase' },
]

interface SlackKPIs {
  totalMessages: number
  activeMembers: number
  channels: number
}

const HEALTH_COLOR: Record<HealthRow['health'], string> = {
  ok:           'bg-green-500',
  stale:        'bg-amber-400',
  dead:         'bg-red-500',
  never:        'bg-sand3',
  circuit_open: 'bg-red-500',
}

const HEALTH_TEXT: Record<HealthRow['health'], string> = {
  ok:           'text-green-700',
  stale:        'text-amber-600',
  dead:         'text-red-600',
  never:        'text-ink4',
  circuit_open: 'text-red-600',
}

const HEALTH_LABEL: Record<HealthRow['health'], string> = {
  ok:           'Fresh',
  stale:        'Stale',
  dead:         'Expired',
  never:        'Never fetched',
  circuit_open: 'Circuit open',
}

export default function SystemsPage() {
  const [systems, setSystems] = useState<SystemStatus[]>(STATIC_SYSTEMS)
  const [lastChecked, setLastChecked] = useState('')
  const [slackKPIs, setSlackKPIs] = useState<SlackKPIs | null>(null)
  const [cacheHealth, setCacheHealth] = useState<HealthRow[]>([])
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const { refreshKey } = useRefresh()
  const { isAdmin } = useMe()

  async function fetchCacheHealth() {
    const data = await fetch('/api/cache-health', { cache: 'no-store' }).then(r => r.json()).catch(() => null)
    if (data?.health) setCacheHealth(data.health)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/systems-status', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetch('/api/slack-stats', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetch('/api/cache-health', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    ]).then(([sysData, slackData, healthData]) => {
      if (sysData?.systems) {
        setSystems((prev) =>
          prev.map((s) => {
            const live = (sysData.systems as SystemStatus[]).find(
              (ls) => ls.system.toLowerCase() === s.system.toLowerCase()
            )
            if (!live) return s
            return { ...s, status: live.status, detail: live.detail, manual: live.manual, updatedBy: live.updatedBy, updatedAt: live.updatedAt }
          })
        )
      }
      if (slackData?.slackStats) setSlackKPIs(slackData.slackStats)
      if (healthData?.health) setCacheHealth(healthData.health)
      setLastChecked(new Date().toLocaleTimeString())
    })
  }, [refreshKey])

  async function handleSystemEdit(systemName: string, newStatus: 'green' | 'amber' | 'red', newDetail: string) {
    const res = await fetch('/api/systems-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: systemName, status: newStatus, detail: newDetail }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error ?? 'Save failed')
    }
    setSystems(prev => prev.map(s =>
      s.system === systemName
        ? { ...s, status: newStatus, detail: newDetail, updatedBy: 'you', updatedAt: new Date().toISOString() }
        : s
    ))
  }

  async function handleRefresh(source: string) {
    setRefreshing(source)
    try {
      await fetch('/api/cache-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      await fetchCacheHealth()
    } finally {
      setRefreshing(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mt-6 mb-1">
        <div className="slbl mb-0">Digital Systems Status</div>
        {lastChecked && <span className="text-xs text-ink4">Checked {lastChecked}</span>}
      </div>

      <div className="card">
        <div className="card-body divide-y divide-sand3 p-0 px-4">
          {systems.map((s) => (
            <SystemRow
              key={s.system}
              icon={ICONS[s.system] ?? '⚙️'}
              name={s.system}
              detail={s.detail}
              status={s.status}
              url={s.url}
              notes={s.notes}
              manual={s.manual}
              updatedBy={s.updatedBy}
              updatedAt={s.updatedAt}
              onSave={isAdmin && s.manual ? (st, det) => handleSystemEdit(s.system, st, det) : undefined}
            />
          ))}
        </div>
      </div>

      <div className="slbl">Website Migration Tracker</div>
      <div className="card">
        <div className="card-body">
          {MIGRATION.map((m) => (
            <ProgressBar
              key={m.site}
              label={m.site}
              sublabel={`${m.deadline} · ${m.owner}`}
              pct={m.pct}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 mb-1">
        <div className="slbl mb-0">API Cache Health</div>
        {isAdmin && (
          <button
            onClick={() => handleRefresh('all')}
            disabled={refreshing !== null}
            className="btn-secondary text-xs py-1 px-3 disabled:opacity-50"
          >
            {refreshing === 'all' ? 'Refreshing…' : '↻ Refresh All'}
          </button>
        )}
      </div>
      <div className="card mb-6">
        <div className="card-body p-0 px-4 divide-y divide-sand3">
          {cacheHealth.length === 0 ? (
            <div className="py-3 text-sm text-ink4 animate-pulse">Loading cache health…</div>
          ) : cacheHealth.map((row) => {
            const isProblematic = row.health !== 'ok'
            const fetchedTime = row.fetched_at
              ? new Date(row.fetched_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : null
            return (
              <div key={row.source} className="flex items-center gap-3 py-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${HEALTH_COLOR[row.health]}`} />
                <span className="text-sm font-bold w-32">{row.label}</span>
                <span className={`text-xs font-bold w-24 ${HEALTH_TEXT[row.health]}`}>
                  {HEALTH_LABEL[row.health]}
                </span>
                <span className="text-xs text-ink4">
                  {row.age_minutes !== null ? `${row.age_minutes}m ago` : '—'}
                  {fetchedTime ? ` · ${fetchedTime}` : ''}
                  {row.consecutive_failures > 0 && (
                    <span className="text-red-500 ml-1">· {row.consecutive_failures} fail{row.consecutive_failures > 1 ? 's' : ''}</span>
                  )}
                </span>
                {row.last_error && (
                  <span className="text-xs text-red-500 truncate max-w-xs hidden sm:block" title={row.last_error}>
                    {row.last_error.slice(0, 60)}{row.last_error.length > 60 ? '…' : ''}
                  </span>
                )}
                {isAdmin && isProblematic && row.source !== 'systems-status' && (
                  <button
                    onClick={() => handleRefresh(row.source)}
                    disabled={refreshing !== null}
                    className="ml-auto text-xs border border-sand3 px-2 py-0.5 hover:border-ink3 hover:text-ink transition-colors disabled:opacity-40"
                  >
                    {refreshing === row.source ? '…' : '↻'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="slbl">Communication KPIs</div>
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: slackKPIs ? slackKPIs.totalMessages.toLocaleString() : '—', label: 'Slack Messages', sub: 'This week' },
              { value: slackKPIs ? slackKPIs.activeMembers : '—', label: 'Active Members', sub: 'Non-bot accounts' },
              { value: slackKPIs ? slackKPIs.channels : '—', label: 'Channels', sub: 'Public channels' },
              { value: '13%', label: 'Public Traffic', sub: '87% DM/private' },
            ].map((stat) => (
              <div key={stat.label} className={`border border-sand3 p-3 ${!slackKPIs && stat.value === '—' ? 'animate-pulse' : ''}`}>
                <div className="font-serif font-black text-2xl">{stat.value}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-ink3 mt-0.5">{stat.label}</div>
                <div className="text-xs text-ink4 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
