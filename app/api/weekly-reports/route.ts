import { NextRequest, NextResponse } from 'next/server'
import { createTask } from '@/lib/clickup'
import { postMessage } from '@/lib/slack'

const CLICKUP_LIST_ID = '901102575315'
const SLACK_CHANNEL = 'C08K6KM53FV'

interface Braintrust {
  invoiceSubmitted?: boolean
  invoiceLink?: string
  webworkConfirmed?: boolean
  webworkLink?: string
  emailMeterConfirmed?: boolean
  emailMeterLink?: string
  slackReportConfirmed?: boolean
  slackReportLink?: string
}

interface ReportBody {
  name: string
  week: string
  outcomes?: string
  goals?: string
  deals?: string
  relationships?: string
  priorities?: string
  blockers?: string
  win?: string
  braintrust?: Braintrust
  hours?: Record<string, number>
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.CLICKUP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'CLICKUP_API_KEY not configured' }, { status: 500 })
  }

  let body: ReportBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, week, outcomes, goals, deals, relationships, priorities, blockers, win, braintrust = {}, hours = {} } = body
  if (!name || !week) {
    return NextResponse.json({ error: 'name and week are required' }, { status: 400 })
  }

  const btCount = [
    braintrust.invoiceSubmitted,
    braintrust.webworkConfirmed,
    braintrust.emailMeterConfirmed,
    braintrust.slackReportConfirmed,
  ].filter(Boolean).length

  const hoursText = Object.entries(hours)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}: ${v}h`)
    .join(' · ')

  const description = [
    `**Week:** ${week}`,
    `**Submitted by:** ${name}`,
    '',
    `**Outcomes:** ${outcomes ?? '—'}`,
    `**Goals:** ${goals ?? '—'}`,
    `**Deals:** ${deals ?? '—'}`,
    `**Relationships:** ${relationships ?? '—'}`,
    `**Priorities:** ${priorities ?? '—'}`,
    `**Blockers:** ${blockers ?? '—'}`,
    `**Win of the Week:** ${win ?? '—'}`,
    '',
    `**Braintrust Compliance (${btCount}/4):**`,
    `- Invoice: ${braintrust.invoiceSubmitted ? '✓' : '✗'} ${braintrust.invoiceLink ?? ''}`,
    `- WebWork: ${braintrust.webworkConfirmed ? '✓' : '✗'} ${braintrust.webworkLink ?? ''}`,
    `- Email Meter: ${braintrust.emailMeterConfirmed ? '✓' : '✗'} ${braintrust.emailMeterLink ?? ''}`,
    `- Slack Report: ${braintrust.slackReportConfirmed ? '✓' : '✗'} ${braintrust.slackReportLink ?? ''}`,
    '',
    `**Hours:** ${hoursText || '—'}`,
  ].join('\n')

  try {
    const task = await createTask(CLICKUP_LIST_ID, {
      name: `Weekly Report — ${name} — ${week}`,
      description,
      status: 'open',
      tags: ['weekly-report'],
    })

    // Post Slack confirmation if token is set
    const slackToken = process.env.SLACK_BOT_TOKEN
    if (slackToken && task.id) {
      const missing = []
      if (!braintrust.invoiceSubmitted) missing.push('Invoice')
      if (!braintrust.webworkConfirmed) missing.push('WebWork')
      if (!braintrust.emailMeterConfirmed) missing.push('Email Meter')
      if (!braintrust.slackReportConfirmed) missing.push('Slack Report')

      const btStatus = btCount === 4 ? '4/4 complete ✅' : `${btCount}/4 — missing: ${missing.join(', ')}`
      const hoursLine = Object.entries(hours)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k.split(' ')[0]} ${v}`)
        .join(' · ')

      const slackMsg = [
        `✅ Weekly report submitted by *${name}* for ${week}`,
        `Braintrust: ${btStatus}`,
        hoursLine ? `Hours: ${hoursLine}` : null,
        `View in ClickUp: https://app.clickup.com/t/${task.id}`,
      ]
        .filter(Boolean)
        .join('\n')

      await postMessage(SLACK_CHANNEL, slackMsg)
    }

    return NextResponse.json({ success: true, taskId: task.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
