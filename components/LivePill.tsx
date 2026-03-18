'use client'

export default function LivePill() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 border border-white/30 text-xs font-bold font-mono">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      Live
    </div>
  )
}
