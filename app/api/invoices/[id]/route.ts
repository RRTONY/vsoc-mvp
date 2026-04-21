// PATCH /api/invoices/[id] — update invoice status (role-gated)
// admin: pending → audit_done
// owner: audit_done → approved, approved → paid
import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, verifySession } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

const ALLOWED_TRANSITIONS: Record<string, { from: string; roles: string[] }> = {
  audit_done: { from: 'pending',    roles: ['admin', 'owner'] },
  approved:   { from: 'audit_done', roles: ['owner'] },
  paid:       { from: 'approved',   roles: ['owner'] },
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  const session = token ? await verifySession(token) : null
  if (!session || !['admin', 'owner'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  let body: { status: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { status: newStatus } = body
  const transition = ALLOWED_TRANSITIONS[newStatus]
  if (!transition) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  if (!transition.roles.includes(session.role)) {
    return NextResponse.json({ error: 'Insufficient role for this transition' }, { status: 403 })
  }

  const sb = getSupabase()
  const { data: inv, error: fetchErr } = await sb.from('invoices').select('status').eq('id', id).single()
  if (fetchErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (inv.status !== transition.from) {
    return NextResponse.json({ error: `Cannot move to ${newStatus} from ${inv.status}` }, { status: 409 })
  }

  const { error: updateErr } = await sb
    .from('invoices')
    .update({ status: newStatus, [`${newStatus}_by`]: session.username, [`${newStatus}_at`]: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, status: newStatus })
}
