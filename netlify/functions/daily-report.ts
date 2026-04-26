import type { Config } from '@netlify/functions'

// Runs daily at 8 AM PDT (15:00 UTC) / 8 AM PST (16:00 UTC in winter)
export default async function handler() {
  const baseUrl = (process.env.NEXT_PUBLIC_URL ?? process.env.URL ?? '').replace(/\/$/, '')
  const secret = process.env.CRON_SECRET ?? ''

  if (!baseUrl || !secret) {
    console.error('[daily-report] Missing NEXT_PUBLIC_URL or CRON_SECRET')
    return new Response('Missing env vars', { status: 500 })
  }

  const res = await fetch(`${baseUrl}/api/reports/daily`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': secret,
    },
  })

  const data = await res.json()
  console.log('[daily-report]', new Date().toISOString(), JSON.stringify(data))
  return new Response(JSON.stringify(data), { status: res.status })
}

export const config: Config = {
  schedule: '0 14 * * *',  // 7 AM PDT (UTC-7). Change to 0 15 * * * in winter (PST)
}
