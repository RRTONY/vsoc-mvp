'use client'

import { useState, useRef } from 'react'
import { useToast } from '@/components/Toast'
import { TEAM_NAMES } from '@/lib/team'

export default function SubmitPage() {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const name = fd.get('name') as string
    if (!name) { toast('Please select your name first'); return }

    const payload = {
      name,
      week: fd.get('week') as string,
      outcomes: fd.get('outcomes') as string,
      goals: fd.get('goals') as string,
      deals: fd.get('deals') as string,
      relationships: fd.get('relationships') as string,
      priorities: fd.get('priorities') as string,
      blockers: fd.get('blockers') as string,
      win: fd.get('win') as string,
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
        setSubmitted(true)
        toast(`✓ Report submitted for ${name}`)
        setTimeout(() => {
          formRef.current?.reset()
          setSubmitted(false)
        }, 3000)
      } else {
        toast(`Submit failed: ${data.error ?? 'Unknown error'}`)
      }
    } catch {
      toast('Network error — check connection')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div className="slbl mt-6">Weekly Report Submission</div>
      <div className="alert alert-amber">All fields required for payroll to process. No dollar amounts — hours only.</div>

      <div className="card">
        <div className="card-hd"><div className="card-ti">Your Information</div></div>
        <div className="card-body space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink3 block mb-1">Your Name</label>
            <select name="name" className="field-input">
              <option value="">— Select —</option>
              {TEAM_NAMES.map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink3 block mb-1">Report Week</label>
            <input name="week" className="field-input" type="text" defaultValue="Mar 9–16, 2026" placeholder="e.g. Mar 9–16, 2026" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd"><div className="card-ti">Business Outcomes</div></div>
        <div className="card-body space-y-4">
          {[
            { name: 'outcomes', label: '1. What business outcomes did you drive this week?', rows: 4, placeholder: 'Deals advanced, deliverables shipped, relationships nurtured...' },
            { name: 'goals', label: '2. Did you accomplish your top goals from last week? If not, why not?', rows: 3, placeholder: 'Yes / No — with explanation...' },
            { name: 'deals', label: '3. Deals Closed / Verbaled / Accomplished', rows: 2, placeholder: 'Any signed agreements, verbal commitments, milestones...' },
            { name: 'relationships', label: '4. Key Relationships Nurtured', rows: 2, placeholder: 'Names and context...' },
            { name: 'priorities', label: '5. Top 3–5 Priorities for Next Week', rows: 3, placeholder: 'Be specific and measurable...' },
            { name: 'blockers', label: '6. Help Needed / Blockers', rows: 2, placeholder: 'What do you need from Tony, Alex, Kim?' },
          ].map((f) => (
            <div key={f.name}>
              <label className="text-xs font-bold uppercase tracking-widest text-ink3 block mb-1">{f.label}</label>
              <textarea name={f.name} className="field-input resize-none" rows={f.rows} placeholder={f.placeholder} />
            </div>
          ))}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink3 block mb-1">7. Win of the Week</label>
            <input name="win" className="field-input" type="text" placeholder="One sentence..." />
          </div>
        </div>
      </div>

      {submitted && (
        <div className="bg-ink text-sand p-4 text-sm font-bold mb-4">
          ✓ Report submitted successfully — Slack notified
        </div>
      )}

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
