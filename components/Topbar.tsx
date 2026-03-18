'use client'

import { useEffect, useState } from 'react'
import LivePill from './LivePill'

interface TopbarProps {
  onRefresh?: () => void
  lastUpdated?: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Topbar({ onRefresh, lastUpdated }: TopbarProps) {
  const [clock, setClock] = useState('--:--:--')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    function tick() {
      const n = new Date()
      setClock(
        `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}:${String(n.getSeconds()).padStart(2, '0')}`
      )
      setDateStr(`${DAYS[n.getDay()]} · ${MONTHS[n.getMonth()]} ${n.getDate()}, ${n.getFullYear()}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="bg-ink text-sand px-5 h-14 flex items-center justify-between sticky top-0 z-40">
      <div className="font-display text-xl tracking-wider">
        RAMPRATE · <span className="font-sans font-medium text-base normal-case tracking-normal opacity-80">Visual Chief of Staff</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-white/60 hidden sm:block">{dateStr}</span>
        <span className="font-mono font-medium">{clock}</span>
        {lastUpdated && (
          <span className="text-white/50 hidden md:block">Updated {lastUpdated}</span>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="border border-white/30 px-2 py-1 font-mono text-xs hover:bg-white/10 transition-colors"
          >
            ↻ Refresh
          </button>
        )}
        <LivePill />
      </div>
    </div>
  )
}
