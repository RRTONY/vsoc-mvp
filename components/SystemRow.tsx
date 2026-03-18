'use client'

import { useState } from 'react'

type Status = 'green' | 'amber' | 'red'

interface SystemRowProps {
  icon: string
  name: string
  detail: string
  status: Status
  url?: string
  notes?: string[]
}

const statusConfig = {
  green: { dot: 'bg-black', text: 'text-black', label: '● Online' },
  amber: { dot: 'bg-amber-600', text: 'text-amber-700', label: '○ Degraded' },
  red: { dot: 'bg-red-600', text: 'text-red-600', label: '✕ Down' },
}

export default function SystemRow({ icon, name, detail, status, url, notes }: SystemRowProps) {
  const [open, setOpen] = useState(false)
  const cfg = statusConfig[status]

  return (
    <div className="border-b border-sand3 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-sand3/40 transition-colors px-1 -mx-1 rounded"
      >
        <div className="text-xl w-8 text-center flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">{name}</div>
          <div className="text-xs text-ink3">{detail}</div>
        </div>
        <div className={`text-xs font-bold font-mono ${cfg.text} flex items-center gap-1.5 flex-shrink-0`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>
        <span className="text-ink4 text-xs ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-11 pb-3 space-y-2">
          {notes && notes.length > 0 && (
            <ul className="space-y-1">
              {notes.map((n, i) => (
                <li key={i} className="text-xs text-ink2 flex gap-2">
                  <span className="text-ink4 flex-shrink-0">—</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-mono border border-black/30 px-2 py-0.5 hover:bg-black hover:text-white transition-colors mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              Open {name} ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}
