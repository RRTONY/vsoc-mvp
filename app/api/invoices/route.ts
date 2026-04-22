// GET /api/invoices — reads directly from Supabase invoices table
import { NextRequest, NextResponse } from 'next/server'
import { buildInvoicesSnapshot } from '@/lib/invoices'

export async function GET(req: NextRequest) {
  if (!req.headers.get('x-role')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const snapshot = await buildInvoicesSnapshot()
    return NextResponse.json(snapshot)
  } catch (err) {
    return NextResponse.json(
      { invoices: [], error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    )
  }
}
