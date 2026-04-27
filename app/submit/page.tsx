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
  const daysSinceMonday = (jsDay + 6) % 7
  const mon = new Date(now)
  mon.setDate(now.getDate() - daysSinceMonday)
  mon.setHours(0, 0, 0, 0)
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(mon)}–${fmt(fri)}`
}

const SECTIONS = [
  {
    title: 'Flags & Blockers',
    fields: [
      {
        name: 'blockers',
        label: '1. What is blocked, stuck, or at risk right now?',
        rows: 4,
        placeholder: 'List each blocker separately.\nFormat: Blocker → Impact if unresolved → What\'s needed → From whom',
      },
      {
        name: 'escalations',
        label: '2. Is anything broken, behind, or needs to be escalated?',
        rows: 3,
        placeholder: 'Client issues, missed commitments, process failures, team conflicts.\nFormat: Issue → Current status → Recommended action',
      },
    ],
  },
  {
    title: 'Next Week',
    fields: [
      {
        name: 'priorities',
        label: '3. What are your top 3–5 priorities for next week, in order?',
        rows: 5,
        placeholder: 'Include what "done" looks like for each.\nFormat: Priority → Definition of done → Owner if team\n1.\n2.\n3.',
      },
    ],
  },
  {
    title: 'Last Week in Review',
    fields: [
      {
        name: 'goals_met',
        label: '4. Which of last week\'s priorities did you complete — and what didn\'t get done, and why?',
        rows: 4,
        placeholder: 'Format: Priority → Done / Not done → Reason if not done',
      },
      {
        name: 'win',
        label: '5. What\'s the most important thing you accomplished this week, and what was the business impact?',
        rows: 3,
        placeholder: 'One key win and its business significance...',
      },
      {
        name: 'accomplishments',
        label: '6. Full list of accomplishments by area',
        rows: 6,
        placeholder: 'Sales:\nClient delivery:\nInternal operations:\nOther:',
      },
    ],
  },
  {
    title: 'Reflection',
    fields: [
      {
        name: 'friction',
        label: '7. What didn\'t go well — and what should change because of it?',
        rows: 3,
        placeholder: 'Be specific about the root cause and proposed fix...',
      },
      {
        name: 'went_well',
        label: '8. What went well that\'s worth repeating or recognizing?',
        rows: 3,
        placeholder: 'A process, decision, collaboration, or outcome worth doubling down on...',
      },
    ],
  },
  {
    title: 'Support & Personal',
    fields: [
      {
        name: 'support_needed',
        label: '9. What you need from others to support you',
        rows: 3,
        placeholder: 'Decisions, introductions, resources, unblocking — and from whom...',
      },
      {
        name: 'whats_new',
        label: '10. Personal notes (Optional) — interesting reads, personal milestones, family life',
        rows: 2,
        placeholder: 'Anything you\'d like to share...',
      },
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
