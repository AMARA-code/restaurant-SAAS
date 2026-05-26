'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrice, formatDate } from '@/lib/utils'
import { isPromotionCurrentlyActive } from '@/lib/promotions'
import type { Promotion } from '@/types/database'
import { CrimsonButton } from '@/components/ui/Button'
import CreatePromotionModal from '@/components/admin/promotions/CreatePromotionModal'

function statusBadge(promo: Promotion) {
  const now = Date.now()
  if (!promo.is_active) {
    return { label: 'Inactive', color: 'var(--text-muted)', bg: 'var(--bg-elevated)' }
  }
  if (promo.expires_at && new Date(promo.expires_at).getTime() <= now) {
    return { label: 'Expired', color: '#f87171', bg: 'rgba(248,113,113,0.12)' }
  }
  if (isPromotionCurrentlyActive(promo, now)) {
    return { label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' }
  }
  return { label: 'Scheduled', color: 'var(--accent-gold)', bg: 'var(--accent-gold-muted)' }
}

export default function AdminPromotionsClient({
  initialPromotions,
}: {
  initialPromotions: Promotion[]
}) {
  const [promotions, setPromotions] = useState(initialPromotions)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function refresh() {
    const res = await fetch('/api/admin/promotions')
    const json = await res.json()
    if (res.ok) setPromotions(json.data ?? [])
  }

  async function toggleActive(promo: Promotion) {
    setTogglingId(promo.id)
    try {
      const res = await fetch(`/api/admin/promotions/${promo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !promo.is_active }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: !p.is_active } : p))
      )
      toast.success(promo.is_active ? 'Promotion deactivated' : 'Promotion activated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setTogglingId(null)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this promotion?')) return
    try {
      const res = await fetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      setPromotions((prev) => prev.filter((p) => p.id !== id))
      toast.success('Promotion deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2rem',
              color: 'var(--text-primary)',
            }}
          >
            Promotions
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
            Manage offers shown on the site banner and checkout.
          </p>
        </div>
        <CrimsonButton
          type="button"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus size={16} className="inline mr-1" />
          New Promotion
        </CrimsonButton>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(201,168,76,0.12)', background: 'var(--bg-card)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: 'var(--text-secondary)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Title', 'Type', 'Value', 'Uses', 'Status', 'Expires', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-label">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No promotions yet.
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => {
                  const badge = statusBadge(promo)
                  return (
                    <tr key={promo.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-3">
                        <p style={{ color: 'var(--text-primary)' }}>{promo.title}</p>
                        {promo.code && (
                          <p className="text-xs font-mono mt-1" style={{ color: 'var(--accent-gold)' }}>
                            {promo.code}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize">{promo.discount_type}</td>
                      <td className="px-4 py-3">
                        {promo.discount_type === 'percentage'
                          ? `${promo.discount_value}%`
                          : formatPrice(Number(promo.discount_value))}
                      </td>
                      <td className="px-4 py-3">
                        {promo.uses_count}
                        {promo.max_uses != null ? ` / ${promo.max_uses}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{ color: badge.color, background: badge.bg }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {promo.expires_at ? formatDate(promo.expires_at) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={togglingId === promo.id}
                            onClick={() => toggleActive(promo)}
                            className="relative w-10 h-5 rounded-full transition-colors"
                            style={{
                              background: promo.is_active
                                ? 'var(--accent-gold)'
                                : 'rgba(255,255,255,0.1)',
                            }}
                            aria-label="Toggle active"
                          >
                            <span
                              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                              style={{ left: promo.is_active ? '22px' : '2px' }}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(promo)
                              setModalOpen(true)
                            }}
                            style={{ color: 'var(--accent-gold)' }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(promo.id)}
                            style={{ color: 'var(--accent-crimson-light)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreatePromotionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSaved={refresh}
        editing={editing}
      />
    </div>
  )
}
