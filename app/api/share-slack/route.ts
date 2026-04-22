import { NextRequest, NextResponse } from 'next/server'
import { postMessage } from '@/lib/slack'

import { SLACK_CHANNEL_WEEKLY_REPORTS } from '@/lib/constants'
const DEFAULT_CHANNEL = process.env.SLACK_CHANNEL_WEEKLY_REPORTS ?? SLACK_CHANNEL_WEEKLY_REPORTS

export async function POST(req: NextRequest) {
  if (!process.env.SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: 'SLACK_BOT_TOKEN not configured' }, { status: 500 })
  }
  const { message, channel } = await req.json()
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })

  try {
    const result = await postMessage(channel ?? DEFAULT_CHANNEL, message)
    return NextResponse.json({ success: result.ok, ts: result.ts })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
