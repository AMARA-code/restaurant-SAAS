'use client'

import { useMemo, useState } from 'react'
import { Loader2, Download, Send, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import type { Subscriber, Promotion } from '@/types/database'
import { CrimsonButton, OutlineButton } from '@/components/ui/Button'

function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const paragraphs = escaped.split(/\n\n+/).map((p) => `<p style="margin:0 0 16px;line-height:1.7;color:#a8a8a0;font-family:sans-serif;font-size:14px;">${p.replace(/\n/g, '<br/>')}</p>`)
  return `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0a0a0a;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#161616;border:1px solid rgba(201,168,76,0.2);">
<tr><td style="padding:32px 28px;border-bottom:1px solid rgba(201,168,76,0.15);">
<p style="margin:0;font-size:28px;letter-spacing:0.15em;color:#c9a84c;font-family:Georgia,serif;">Éclat</p>
</td></tr>
<tr><td style="padding:28px;">${paragraphs.join('')}</td></tr>
</table>
</body></html>`
}

export default function AdminNewsletterClient({
  subscribers,
  promotions,
}: {
  subscribers: Subscriber[]
  promotions: Promotion[]
}) {
  const [rows, setRows] = useState(subscribers)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [promotionId, setPromotionId] = useState('')
  const [sending, setSending] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const activeCount = useMemo(() => rows.filter((s) => s.is_active).length, [])

  const previewHtml = useMemo(() => plainTextToHtml(body || 'Your message will appear here.'), [body])

  async function toggleSubscriber(id: string, is_active: boolean) {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/admin/newsletter/subscribers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !is_active }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      setRows((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !is_active } : s))
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setTogglingId(null)
    }
  }

  function exportCsv() {
    const active = rows.filter((s) => s.is_active)
    const header = 'email,name,subscribed_at'
    const lines = active.map((s) =>
      [
        `"${s.email.replace(/"/g, '""')}"`,
        `"${(s.name ?? '').replace(/"/g, '""')}"`,
        s.subscribed_at,
      ].join(',')
    )
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eclat-newsletter-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  }

  async function sendBlast() {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message are required')
      return
    }
    if (!confirm(`Send newsletter to ${activeCount} active subscribers?`)) return

    setSending(true)
    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          html: previewHtml,
          promotionId: promotionId || undefined,
        }),
      })
      const json = await res.json()

      if (res.status === 503) {
        toast.error(
          'Email service not configured. Add RESEND_API_KEY to .env.local — get a key at resend.com',
          { duration: 6000 }
        )
        return
      }

      if (!res.ok) throw new Error(json.error ?? 'Send failed')

      toast.success(`Sent to ${json.sent ?? 0} subscribers`)
      setSubject('')
      setBody('')
      setPromotionId('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-10 max-w-[1100px]">
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '2rem',
            color: 'var(--text-primary)',
          }}
        >
          Newsletter
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
          Manage subscribers and send email blasts via Resend.
        </p>
      </div>

      {/* Section A — Subscribers */}
      <section>
        <h2 className="text-label mb-4" style={{ color: 'var(--accent-gold)' }}>
          Subscribers
        </h2>
        <div
          className="grid gap-4 mb-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
        >
          <div className="card-eclat p-5">
            <p className="text-label text-[var(--text-muted)] mb-1">Total</p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--text-primary)' }}>
              {rows.length}
            </p>
          </div>
          <div className="card-eclat p-5">
            <p className="text-label text-[var(--text-muted)] mb-1">Active</p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--accent-gold)' }}>
              {activeCount}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <OutlineButton type="button" onClick={exportCsv}>
            <Download size={14} className="inline mr-1" />
            Export CSV
          </OutlineButton>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(201,168,76,0.12)', background: 'var(--bg-card)' }}
        >
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: 'var(--bg-elevated)' }}>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Email', 'Name', 'Subscribed', 'Active', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-label">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                      No subscribers yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                        {s.email}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {s.name ?? '—'}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(s.subscribed_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: s.is_active
                              ? 'rgba(34,197,94,0.12)'
                              : 'var(--bg-elevated)',
                            color: s.is_active ? '#22c55e' : 'var(--text-muted)',
                          }}
                        >
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={togglingId === s.id}
                          onClick={() => toggleSubscriber(s.id, s.is_active)}
                          className="text-xs"
                          style={{ color: 'var(--accent-gold)' }}
                        >
                          {togglingId === s.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : s.is_active ? (
                            'Deactivate'
                          ) : (
                            'Activate'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section B — Blast */}
      <section>
        <h2 className="text-label mb-4 flex items-center gap-2" style={{ color: 'var(--accent-gold)' }}>
          <Mail size={16} />
          Send Newsletter Blast
        </h2>

        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
        >
          <div className="card-eclat p-6 space-y-4">
            <div>
              <label className="text-label block mb-2">Subject</label>
              <input
                className="input-eclat w-full"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="This week at Éclat…"
              />
            </div>

            <div>
              <label className="text-label block mb-2">Link to promotion (optional)</label>
              <select
                className="input-eclat w-full"
                value={promotionId}
                onChange={(e) => setPromotionId(e.target.value)}
              >
                <option value="">None</option>
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.code ? ` (${p.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-label block mb-2">Message</label>
              <textarea
                className="input-eclat w-full min-h-[140px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your newsletter message…"
              />
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Will be sent to <strong style={{ color: 'var(--accent-gold)' }}>{activeCount}</strong>{' '}
              active subscribers
            </p>

            <CrimsonButton type="button" onClick={sendBlast} disabled={sending || activeCount === 0}>
              {sending ? (
                <Loader2 size={16} className="animate-spin inline mr-1" />
              ) : (
                <Send size={16} className="inline mr-1" />
              )}
              Send to all active subscribers
            </CrimsonButton>

            <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Requires{' '}
              <a
                href="https://resend.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-gold)' }}
              >
                resend.com
              </a>{' '}
              — add RESEND_API_KEY to your environment variables.
            </p>
          </div>

          <div className="card-eclat p-6">
            <p className="text-label mb-3" style={{ color: 'var(--accent-gold)' }}>
              Preview
            </p>
            <div
              className="rounded-sm overflow-hidden border"
              style={{ borderColor: 'var(--border-subtle)', maxHeight: 400, overflow: 'auto' }}
            >
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                className="w-full min-h-[320px] bg-[var(--bg-primary)]"
                sandbox=""
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
