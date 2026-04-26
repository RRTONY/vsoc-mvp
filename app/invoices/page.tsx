'use client'

import { useEffect, useState, useRef } from 'react'
import { useRefresh } from '@/components/RefreshContext'
import { useMe } from '@/hooks/useMe'

interface Invoice {
  id: string
  contractor: string
  invoiceNumber: string
  period: string
  hours: number
  rate: number      // owner-only
  amount: number    // admin-only
  status: string
  parsedAt: string
  clickupTaskId: string | null
  clickupUrl: string | null
  uploadedBy: string | null
  forUser: string | null
}

const STATUS_STYLE: Record<string, string> = {
  paid:       'bg-black text-white',
  approved:   'bg-green-800 text-white',
  audit_done: 'bg-blue-700 text-white',
  pending:    'bg-sand2 text-ink3 border border-sand3',
  unknown:    'bg-sand2 text-ink4 border border-sand3',
}

const STATUS_LABEL: Record<string, string> = {
  audit_done: 'Audit Done',
  approved:   'Approved',
  paid:       'Paid',
  pending:    'Pending',
  unknown:    'Unknown',
}

export default function InvoicesPage() {
  const { me, isAdmin, isOwner } = useMe()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([])
  const [pushing, setPushing] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { refreshKey } = useRefresh()

  useEffect(() => {
    setLoading(true)
    fetch('/api/invoices', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setInvoices(d.invoices ?? [])
        setLoadError(d.error ?? '')
        setLoading(false)
      })
      .catch((e) => { setLoadError(String(e)); setLoading(false) })
  }, [refreshKey])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    setUploadWarnings([])
    const form = new FormData()
    form.append('pdf', file)
    try {
      const res = await fetch('/api/invoices/upload', { method: 'POST', body: form })
      const d = await res.json()
      if (res.ok) {
        const warnings: string[] = d.clickupWarnings ?? []
        setUploadMsg(`✓ Imported ${d.count} invoice${d.count !== 1 ? 's' : ''}${warnings.length > 0 ? ' — ClickUp sync failed' : ' and sent to ClickUp'}`)
        setUploadWarnings(warnings)
        // Prepend newly imported invoices to the list directly — no second fetch needed
        setInvoices((prev) => [...(d.invoices ?? []), ...prev])
      } else {
        setUploadMsg(`Error: ${d.error}`)
      }
    } catch {
      setUploadMsg('Upload failed — try again')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSendToClickUp(id: string) {
    setPushing(id)
    try {
      const res = await fetch(`/api/invoices/${id}/clickup`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) {
        setInvoices(prev => prev.map(inv =>
          inv.id === id ? { ...inv, clickupTaskId: d.taskId, clickupUrl: d.url } : inv
        ))
      } else {
        alert(`ClickUp error: ${d.error}`)
      }
    } catch {
      alert('Failed to send to ClickUp')
    } finally {
      setPushing(null)
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setActioning(id)
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const d = await res.json()
      if (res.ok) {
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv))
      } else {
        alert(`Error: ${d.error}`)
      }
    } catch {
      alert('Request failed')
    } finally {
      setActioning(null)
    }
  }

  const [paidFilter, setPaidFilter] = useState('')   // 'YYYY-MM' or ''
  const active = invoices.filter(inv => inv.status !== 'paid')
  const paid   = invoices.filter(inv => inv.status === 'paid')
  const paidMonths = Array.from(new Set(
    paid.map(inv => inv.parsedAt?.slice(0, 7)).filter(Boolean)
  )).sort().reverse()
  const visiblePaid = paidFilter ? paid.filter(inv => inv.parsedAt?.startsWith(paidFilter)) : paid

  return (
    <div>
      <div className="flex items-center justify-between mt-6 mb-1">
        <div className="slbl mb-0">Pending Invoices</div>
        <div className="flex items-center gap-2">
          {uploadMsg && (
            <span className={`text-xs font-medium ${uploadMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>
              {uploadMsg}
            </span>
          )}
          <label className="btn-secondary cursor-pointer text-xs">
            {uploading ? 'Importing…' : '↑ Upload PDF'}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {loadError && (
        <div className="alert alert-amber mt-2 mb-2 text-xs">
          <span className="font-bold">Failed to load invoices:</span> {loadError}
        </div>
      )}

      {uploadWarnings.length > 0 && (
        <div className="alert alert-amber mt-2 text-xs space-y-1">
          <div className="font-bold">Invoice saved but ClickUp sync failed:</div>
          {uploadWarnings.map((w, i) => <div key={i}>• {w}</div>)}
          <div className="text-ink3 mt-1">Use the "+ ClickUp" button in the table to retry.</div>
        </div>
      )}


      {/* ── Active invoices ── */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 animate-pulse text-sm text-ink4">Loading invoices…</div>
          ) : active.length === 0 ? (
            <div className="p-4 text-sm text-ink4">No pending invoices. Upload a Braintrust PDF to get started.</div>
          ) : (
            <InvoiceTable
              invoices={active}
              isAdmin={isAdmin}
              isOwner={isOwner}
              actioning={actioning}
              pushing={pushing}
              onStatusChange={handleStatusChange}
              onSendToClickUp={handleSendToClickUp}
            />
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="text-xs text-ink4 mt-1 mb-6">
          Amounts visible to all admins. Rates visible to owners only.
        </div>
      )}

      {/* ── Past invoices (paid) ── */}
      <div className="flex items-center justify-between mt-6 mb-1">
        <div className="slbl mb-0">Past Invoices</div>
        {paidMonths.length > 1 && (
          <select
            value={paidFilter}
            onChange={e => setPaidFilter(e.target.value)}
            className="field-input text-xs py-1 w-full sm:w-auto"
          >
            <option value="">All time</option>
            {paidMonths.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 animate-pulse text-sm text-ink4">Loading…</div>
          ) : visiblePaid.length === 0 ? (
            <div className="p-4 text-sm text-ink4">No paid invoices{paidFilter ? ' for this period' : ' yet'}.</div>
          ) : (
            <InvoiceTable
              invoices={visiblePaid}
              isAdmin={isAdmin}
              isOwner={isOwner}
              actioning={actioning}
              pushing={pushing}
              onStatusChange={handleStatusChange}
              onSendToClickUp={handleSendToClickUp}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface InvoiceTableProps {
  invoices: Invoice[]
  isAdmin: boolean
  isOwner: boolean
  actioning: string | null
  pushing: string | null
  onStatusChange: (id: string, newStatus: string) => void
  onSendToClickUp: (id: string) => void
}

function InvoiceTable({ invoices, isAdmin, isOwner, actioning, pushing, onStatusChange, onSendToClickUp }: InvoiceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-sand3 text-left text-xs text-ink4 uppercase tracking-wide">
            <th className="px-4 py-2 font-medium">Contractor</th>
            <th className="px-4 py-2 font-medium">Invoice</th>
            <th className="px-4 py-2 font-medium">Period</th>
            <th className="px-4 py-2 font-medium text-right">Hours</th>
            {isOwner  && <th className="px-4 py-2 font-medium text-right">Rate</th>}
            {(isAdmin || isOwner) && <th className="px-4 py-2 font-medium text-right">Amount</th>}
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Uploaded by</th>
            {(isAdmin || isOwner) && <th className="px-4 py-2 font-medium text-center">ClickUp</th>}
            {(isAdmin || isOwner) && <th className="px-4 py-2 font-medium">Action</th>}
          </tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id} className="border-b border-sand2 hover:bg-sand1 transition-colors">
              <td className="px-4 py-2 font-medium">{inv.contractor}</td>
              <td className="px-4 py-2 text-ink3">{inv.invoiceNumber}</td>
              <td className="px-4 py-2 text-ink3">{inv.period}</td>
              <td className="px-4 py-2 text-right tabular-nums">{inv.hours}</td>
              {isOwner  && <td className="px-4 py-2 text-right tabular-nums">${inv.rate}/hr</td>}
              {(isAdmin || isOwner) && (
                <td className="px-4 py-2 text-right tabular-nums font-medium">
                  {inv.amount > 0 ? `$${inv.amount.toLocaleString()}` : '—'}
                </td>
              )}
              <td className="px-4 py-2">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[inv.status] ?? STATUS_STYLE.unknown}`}>
                  {STATUS_LABEL[inv.status] ?? inv.status}
                </span>
              </td>
              <td className="px-4 py-2 text-ink3 text-xs">{inv.uploadedBy ?? '—'}</td>

              {/* ClickUp column */}
              {(isAdmin || isOwner) && (
                <td className="px-4 py-2 text-center">
                  {inv.clickupUrl ? (
                    <a href={inv.clickupUrl} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-blue-600 hover:underline whitespace-nowrap">↗ View</a>
                  ) : (
                    <button
                      onClick={() => onSendToClickUp(inv.id)}
                      disabled={pushing === inv.id}
                      className="text-xs text-ink4 hover:text-ink1 underline disabled:opacity-40"
                    >
                      {pushing === inv.id ? '…' : '+ Add'}
                    </button>
                  )}
                </td>
              )}

              {/* Workflow action column — single next-step button */}
              {(isAdmin || isOwner) && (
                <td className="px-4 py-2 whitespace-nowrap">
                  {inv.status === 'pending' && (
                    <button
                      onClick={() => onStatusChange(inv.id, 'audit_done')}
                      disabled={actioning === inv.id}
                      className="btn-secondary text-xs py-0.5 px-2 disabled:opacity-50"
                    >
                      {actioning === inv.id ? '…' : 'Audit Done'}
                    </button>
                  )}
                  {inv.status === 'audit_done' && isOwner && (
                    <button
                      onClick={() => onStatusChange(inv.id, 'approved')}
                      disabled={actioning === inv.id}
                      className="btn-secondary text-xs py-0.5 px-2 disabled:opacity-50"
                    >
                      {actioning === inv.id ? '…' : 'Approve'}
                    </button>
                  )}
                  {inv.status === 'approved' && (
                    <button
                      onClick={() => onStatusChange(inv.id, 'paid')}
                      disabled={actioning === inv.id}
                      className="btn-primary text-xs py-0.5 px-2 disabled:opacity-50"
                    >
                      {actioning === inv.id ? '…' : 'Mark Paid'}
                    </button>
                  )}
                  {isOwner && (inv.status === 'pending' || inv.status === 'audit_done') && (
                    <button
                      onClick={() => onStatusChange(inv.id, 'paid')}
                      disabled={actioning === inv.id}
                      title="Skip workflow and mark as paid"
                      className="ml-2 text-xs text-ink4 hover:text-ink1 underline disabled:opacity-40"
                    >
                      {actioning === inv.id ? '' : 'Mark Paid'}
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
