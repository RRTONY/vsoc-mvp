import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { postMessage } from '@/lib/slack'
import { getSupabase } from '@/lib/supabase'

import { SLACK_CHANNEL_WEEKLY_REPORTS } from '@/lib/constants'
const SLACK_CHANNEL = process.env.SLACK_CHANNEL_WEEKLY_REPORTS ?? SLACK_CHANNEL_WEEKLY_REPORTS

interface ReportBody {
  name: string
  week: string
  outcomes?: string
  goals_met?: string
  deliverables?: string
  automations?: string
  processes?: string
  automation_roi?: string
  deals_relationships?: string
  blockers?: string
  interesting?: string
  priorities?: string
  win?: string
  kudos?: string
  friction?: string
  whats_new?: string
}

interface AiAnalysis {
  summary: string
  insights: string[]
  actions: string[]
}

async function analyzeReport(report: ReportBody): Promise<AiAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const client = new Anthropic({ apiKey })

  const prompt = `You are analyzing a weekly report from ${report.name} for the week of ${report.week}. Provide a concise executive analysis.

Report:
1. Business Outcomes: ${report.outcomes || '—'}
2. Goals from Last Week: ${report.goals_met || '—'}
3. Deliverables: ${report.deliverables || '—'}
4. Automations Built: ${report.automations || '—'}
5. Processes Executed: ${report.processes || '—'}
6. Automation ROI: ${report.automation_roi || '—'}
7. Deals & Relationships: ${report.deals_relationships || '—'}
8. Blockers: ${report.blockers || '—'}
9. Interesting Insight: ${report.interesting || '—'}
10. Priorities Next Week: ${report.priorities || '—'}
11. Win of the Week: ${report.win || '—'}

Respond with valid JSON only:
{
  "summary": "2-3 sentence executive summary of this person's week",
  "insights": ["2-4 key observations about performance, patterns, or growth areas"],
  "actions": ["2-3 specific recommended actions for management to consider"]
}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0]) as AiAnalysis
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let body: ReportBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, week } = body
  if (!name || !week) {
    return NextResponse.json({ error: 'name and week are required' }, { status: 400 })
  }

  const lines: string[] = [
    '#myweeklyreport',
    '',
    `*Weekly Report — ${name} — ${week}*`,
    '',
    `1. What business outcomes did you drive this week?\n${body.outcomes || '—'}`,
    '',
    `2. Did you accomplish your top goals from last week? If not, why not?\n${body.goals_met || '—'}`,
    '',
    `3. Deliverables Authored or Significantly Edited\n${body.deliverables || '—'}`,
    '',
    `4. Automations built or improved\n${body.automations || '—'}`,
    '',
    `5. Processes Executed\n${body.processes || '—'}`,
    '',
    `6. Automation ROI this week\n${body.automation_roi || '—'}`,
    '',
    `7. Key deals & relationships nurtured\n${body.deals_relationships || '—'}`,
    '',
    `8. Help Needed / Dependencies / Blockers\n${body.blockers || '—'}`,
    '',
    `9. Most Interesting Thing You Heard / Read This Week\n${body.interesting || '—'}`,
    '',
    `10. Top 3-5 Priorities for Next Week\n${body.priorities || '—'}`,
    '',
    `11. Win of the Week\n${body.win || '—'}`,
  ]
  if (body.kudos) lines.push('', `12. Kudos\n${body.kudos}`)
  if (body.friction) lines.push('', `13. Friction\n${body.friction}`)
  if (body.whats_new) lines.push('', `14. What\'s new with you?\n${body.whats_new}`)

  const slackMsg = lines.join('\n')

  const [analysisResult, slackResult] = await Promise.allSettled([
    analyzeReport(body),
    postMessage(SLACK_CHANNEL, slackMsg),
  ])

  const aiAnalysis = analysisResult.status === 'fulfilled' ? analysisResult.value : null
  const slackTs = slackResult.status === 'fulfilled'
    ? (slackResult.value as { ts?: string })?.ts ?? null
    : null

  const sb = getSupabase()
  const { data, error } = await sb.from('weekly_reports').insert({
    submitted_by: name,
    week_label: week,
    outcomes: body.outcomes ?? null,
    goals_met: body.goals_met ?? null,
    deliverables: body.deliverables ?? null,
    automations: body.automations ?? null,
    processes: body.processes ?? null,
    automation_roi: body.automation_roi ?? null,
    deals_relationships: body.deals_relationships ?? null,
    blockers: body.blockers ?? null,
    interesting: body.interesting ?? null,
    priorities: body.priorities ?? null,
    win: body.win ?? null,
    kudos: body.kudos ?? null,
    friction: body.friction ?? null,
    whats_new: body.whats_new ?? null,
    ai_analysis: aiAnalysis,
    slack_ts: slackTs,
  }).select('id').single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id, analysis: aiAnalysis })
}

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-role')
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = getSupabase()
  const { data } = await sb
    .from('weekly_reports')
    .select('id, submitted_by, week_label, outcomes, goals_met, deliverables, deals_relationships, interesting, priorities, blockers, win, kudos, ai_analysis, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json(data ?? [])
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
