type Status = 'green' | 'amber' | 'red'

interface SystemRowProps {
  icon: string
  name: string
  detail: string
  status: Status
}

const statusConfig = {
  green: { dot: 'bg-black', text: 'text-black', label: '● Online' },
  amber: { dot: 'bg-ink3', text: 'text-ink3', label: '○ Degraded' },
  red: { dot: 'bg-ink4', text: 'text-ink4', label: '✕ Down' },
}

export default function SystemRow({ icon, name, detail, status }: SystemRowProps) {
  const cfg = statusConfig[status]
  return (
    <div className="flex items-center gap-3 py-3 border-b border-sand3 last:border-0">
      <div className="text-xl w-8 text-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{name}</div>
        <div className="text-xs text-ink3 truncate">{detail}</div>
      </div>
      <div className={`text-xs font-bold font-mono ${cfg.text} flex items-center gap-1.5`}>
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </div>
    </div>
  )
}
