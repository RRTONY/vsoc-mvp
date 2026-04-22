'use client'

import { useState, useRef, useEffect } from 'react'
import { useToast } from '@/components/Toast'

interface AiAnalysis {
  summary: string
  insights: string[]
  actions: string[]
}

function getCurrentWeekLabel(): string {
  const now = new Date()
  const jsDay = now.getDay()
  const daysSinceFriday = (jsDay + 2) % 7
  const thisFri = new Date(now)
  thisFri.setDate(now.getDate() - daysSinceFriday)
  thisFri.setHours(0, 0, 0, 0)
  const lastFri = new Date(thisFri)
  lastFri.setDate(thisFri.getDate() - 7)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(lastFri)}–${fmt(new Date(thisFri.getTime() - 86400000))}`
}

const SECTIONS = [
  {
    title: 'Last Week in Review',
    fields: [
      { name: 'outcomes', label: '1. What business outcomes did you drive this week?', rows: 4, placeholder: 'Deals advanced, deliverables shipped, revenue driven...' },
      { name: 'goals_met', label: '2. Did you accomplish your top goals from last week? If not, why not?', rows: 3, placeholder: 'Yes / Partially / No — with explanation...' },
      { name: 'deliverables', label: '3. Deliverables Authored or Significantly Edited', rows: 3, placeholder: 'Documents, decks, proposals, reports...' },
      { name: 'automations', label: '4. Automations Built or Improved', rows: 2, placeholder: 'New workflows, scripts, integrations built or updated...' },
      { name: 'processes', label: '5. Processes Executed', rows: 2, placeholder: 'Recurring processes run this week...' },
      { name: 'automation_roi', label: '6. Automation ROI This Week', rows: 2, placeholder: 'Time saved, errors prevented, revenue generated...' },
    ],
  },
  {
    title: 'Relationships & Intelligence',
    fields: [
      { name: 'deals_relationships', label: '7. Key Deals & Relationships Nurtured', rows: 3, placeholder: 'Prospects, clients, partners — names and context...' },
      { name: 'interesting', label: '9. Most Interesting Thing You Heard / Read This Week', rows: 2, placeholder: 'An insight, article, conversation, or idea worth sharing...' },
    ],
  },
  {
    title: 'Looking Ahead',
    fields: [
      { name: 'priorities', label: '10. Top 3–5 Priorities for Next Week', rows: 4, placeholder: '1.\n2.\n3.' },
      { name: 'blockers', label: '8. Help Needed / Dependencies / Blockers', rows: 3, placeholder: 'What do you need from Tony, Alex, or the team?' },
    ],
  },
  {
    title: 'Wins & Reflection',
    fields: [
      { name: 'win', label: '11. Win of the Week', rows: 2, placeholder: 'Your proudest moment or result this week...' },
      { name: 'kudos', label: '12. Kudos (Optional)', rows: 2, placeholder: 'Shout out a teammate who helped you...' },
      { name: 'friction', label: '13. Friction (Optional)', rows: 2, placeholder: 'What slowed you down? Process, tool, or situation...' },
      { name: 'whats_new', label: "14. What's New With You? (Optional)", rows: 2, placeholder: 'Personal update, milestone, or fun fact...' },
    ],
  },
]

export default function SubmitPage() {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)
  const [submittedName, setSubmittedName] = useState('')
  const [teamNames, setTeamNames] = useState<string[]>([])
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    fetch('/api/team', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: Array<{ full_name: string; active: boolean }>) =>
        setTeamNames((data ?? []).filter(m => m.active).map(m => m.full_name))
      )
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const name = fd.get('name') as string
    if (!name) { toast('Please select your name first'); return }

    const payload: Record<string, string> = {}
    for (const [k, v] of fd.entries()) {
      payload[k] = v as string
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/weekly-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        setSubmittedName(name)
        setAnalysis(data.analysis ?? null)
        toast(`✓ Report submitted for ${name}`)
        formRef.current?.reset()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        toast(`Submit failed: ${data.error ?? 'Unknown error'}`)
      }
    } catch {
      toast('Network error — check connection')
    } finally {
      setSubmitting(false)
    }
  }

  if (analysis || submittedName) {
    return (
      <div className="space-y-4">
        <div className="bg-green-950 border border-green-700 text-green-300 p-4 text-sm font-medium">
          ✓ Report submitted for <span className="font-bold">{submittedName}</span> — posted to #weeklyreports
        </div>

        {analysis && (
          <div className="card">
            <div className="card-hd">
              <div className="card-ti">AI Analysis</div>
              <div className="text-xs text-ink3">Generated by Claude</div>
            </div>
            <div className="card-body space-y-4">
              <p className="text-sm text-ink2 leading-relaxed">{analysis.summary}</p>

              {analysis.insights?.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-ink3 mb-2">Key Insights</div>
                  <ul className="space-y-1">
                    {analysis.insights.map((ins, i) => (
                      <li key={i} className="text-sm text-ink2 flex gap-2">
                        <span className="text-ink3 shrink-0">◆</span>
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.actions?.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-ink3 mb-2">Recommended Actions</div>
                  <ul className="space-y-1">
                    {analysis.actions.map((act, i) => (
                      <li key={i} className="text-sm text-ink2 flex gap-2">
                        <span className="text-amber-400 shrink-0">→</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => { setAnalysis(null); setSubmittedName('') }}
          className="btn-primary w-full sm:w-auto"
        >
          Submit Another Report
        </button>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="slbl mt-6">Weekly Report</div>
      <div className="alert alert-amber">
        Use this form to submit your weekly report. It will be stored in VCOS and posted to #weeklyreports automatically.
      </div>

      <div className="card">
        <div className="card-hd"><div className="card-ti">Your Information</div></div>
        <div className="card-body space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink3 block mb-1">Your Name <span className="text-red-400">*</span></label>
            <select name="name" className="field-input" required>
              <option value="">— Select —</option>
              {teamNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink3 block mb-1">Report Week <span className="text-red-400">*</span></label>
            <input
              name="week"
              className="field-input"
              type="text"
              defaultValue={getCurrentWeekLabel()}
              placeholder="e.g. Apr 14–20, 2026"
              required
            />
          </div>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="card">
          <div className="card-hd"><div className="card-ti">{section.title}</div></div>
          <div className="card-body space-y-4">
            {section.fields.map((f) => (
              <div key={f.name}>
                <label className="text-xs font-bold uppercase tracking-widest text-ink3 block mb-1">{f.label}</label>
                <textarea
                  name={f.name}
                  className="field-input resize-none"
                  rows={f.rows}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full sm:w-auto disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit Weekly Report'}
      </button>
    </form>
  )
}
