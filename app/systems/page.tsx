'use client'

import { useEffect, useState } from 'react'
import SystemRow from '@/components/SystemRow'
import ProgressBar from '@/components/ProgressBar'
import { useRefresh } from '@/components/RefreshContext'

type Status = 'green' | 'amber' | 'red'

interface SystemStatus {
  system: string
  status: Status
  detail: string
}

const STATIC_SYSTEMS: SystemStatus[] = [
  { system: 'Slack', status: 'green', detail: '3,267 msgs · 31 members · #weeklyreports active' },
  { system: 'ClickUp', status: 'red', detail: '75 tasks · 76% overdue · CRM needs triage' },
  { system: 'Gmail', status: 'amber', detail: 'BILL.com to-do sent 8:28 AM · QuickBooks reports live' },
  { system: 'Fireflies', status: 'green', detail: 'Reeve meetings access granted Mar 16 by Kim' },
  { system: 'BILL.com', status: 'red', detail: '12 sync conflicts unresolved · Holographik pending' },
  { system: 'QuickBooks', status: 'amber', detail: 'Incoming payments + outstanding invoices sent this AM' },
  { system: 'Bitwarden', status: 'green', detail: 'Kim auditing logins · unlinking from Tony account' },
  { system: 'Netlify', status: 'green', detail: 'ramprate.com live · VCOS deploying' },
  { system: 'Braintrust', status: 'amber', detail: 'Ben Sheppard onboarded Mar 10 · template update pending' },
  { system: 'Email Meter', status: 'green', detail: 'KPI active · Chase posted Mar 16 9:13 AM' },
  { system: 'WebWork', status: 'amber', detail: 'Audit gate: hours must align within 0.5hr tolerance' },
  { system: 'Manus/AI', status: 'amber', detail: 'Daniel optimizing token usage · per-project key separation needed' },
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

export default function SystemsPage() {
  const [systems, setSystems] = useState<SystemStatus[]>(STATIC_SYSTEMS)
  const [lastChecked, setLastChecked] = useState('')
  const [slackKPIs, setSlackKPIs] = useState<SlackKPIs | null>(null)
  const { refreshKey } = useRefresh()

  useEffect(() => {
    Promise.all([
      fetch('/api/systems-status').then((r) => r.json()).catch(() => null),
      fetch('/api/slack-stats').then((r) => r.json()).catch(() => null),
    ]).then(([sysData, slackData]) => {
      if (sysData?.systems) {
        setSystems((prev) =>
          prev.map((s) => {
            const live = (sysData.systems as SystemStatus[]).find(
              (ls) => ls.system.toLowerCase() === s.system.toLowerCase()
            )
            return live ? { ...s, status: live.status, detail: live.detail } : s
          })
        )
      }
      if (slackData?.slackStats) setSlackKPIs(slackData.slackStats)
      setLastChecked(new Date().toLocaleTimeString())
    })
  }, [refreshKey])

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
