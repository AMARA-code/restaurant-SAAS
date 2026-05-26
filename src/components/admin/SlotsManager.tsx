'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, Pencil, X, Loader2 } from 'lucide-react'
import type { ReservationSlotRow, SlotAvailability, SlotAvailabilityState } from '@/types/index'
import {
  upsertAdminSlot,
  removeAdminSlot,
  patchAdminSlot,
} from '@/app/(admin)/admin/reservations/slots/actions'
import { createClient } from '@/lib/supabase/client'
import { normalizeTimeSlot } from '@/lib/reservations'
import {
  toDateString,
  formatTime,
  formatDate,
  getSlotAvailabilityLabel,
} from '@/lib/utils'
import { CrimsonButton } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const emptyForm = {
  time_slot: '',
  label: '',
  max_covers: 24,
  sort_order: 0,
  is_active: true,
}

type RowDraft = {
  label: string
  max_covers: number
  sort_order: number
}

export default function SlotsManager({ slots }: { slots: ReservationSlotRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState(emptyForm)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [rowDraft, setRowDraft] = useState<RowDraft | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => toDateString(new Date()))
  const [availability, setAvailability] = useState<SlotAvailability[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(true)

  const availabilityByTime = new Map(
    availability.map((s) => [normalizeTimeSlot(s.time_slot), s])
  )

  const fetchAvailability = useCallback(async (date: string) => {
    setLoadingAvailability(true)
    try {
      const res = await fetch(`/api/reservations/slots?date=${date}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load availability')
      setAvailability(json.data ?? [])
    } catch {
      setAvailability([])
    } finally {
      setLoadingAvailability(false)
    }
  }, [])

  useEffect(() => {
    fetchAvailability(selectedDate)
  }, [selectedDate, fetchAvailability])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`admin-slots-${selectedDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `date=eq.${selectedDate}`,
        },
        () => fetchAvailability(selectedDate)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_slots',
        },
        () => fetchAvailability(selectedDate)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDate, fetchAvailability])

  function afterSlotChange() {
    router.refresh()
    fetchAvailability(selectedDate)
  }

  function startRowEdit(slot: ReservationSlotRow) {
    setEditingRowId(slot.id)
    setRowDraft({
      label: slot.label ?? slot.time_slot,
      max_covers: slot.max_covers,
      sort_order: slot.sort_order,
    })
  }

  function cancelRowEdit() {
    setEditingRowId(null)
    setRowDraft(null)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await upsertAdminSlot(form)
      if (result.success) {
        toast.success('Slot added')
        setForm({ ...emptyForm, sort_order: slots.length + 1 })
        afterSlotChange()
      } else {
        toast.error(result.error ?? 'Save failed')
      }
    })
  }

  function handleRowSave(slot: ReservationSlotRow) {
    if (!rowDraft) return
    startTransition(async () => {
      const result = await patchAdminSlot(slot.id, {
        label: rowDraft.label,
        max_covers: rowDraft.max_covers,
        sort_order: rowDraft.sort_order,
      })
      if (result.success) {
        toast.success('Slot updated')
        cancelRowEdit()
        afterSlotChange()
      } else {
        toast.error(result.error ?? 'Update failed')
      }
    })
  }

  function handleRemove(slot: ReservationSlotRow) {
    if (
      !confirm(
        `Remove "${slot.label ?? slot.time_slot}"? It will no longer appear on the public booking page.`
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await removeAdminSlot(slot.id)
      if (result.success) {
        toast.success('Time slot removed')
        if (editingRowId === slot.id) cancelRowEdit()
        afterSlotChange()
      } else {
        toast.error(result.error ?? 'Failed to remove')
      }
    })
  }

  const sortedSlots = [...slots].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleAdd}
        className="card-eclat p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end"
      >
        <div>
          <label className="text-label block mb-2">Time (24h)</label>
          <input
            className="input-eclat w-full"
            placeholder="19:00"
            value={form.time_slot}
            onChange={(e) => setForm((f) => ({ ...f, time_slot: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="text-label block mb-2">Label</label>
          <input
            className="input-eclat w-full"
            placeholder="Dinner — 7:00 PM"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="text-label block mb-2">Max covers</label>
          <input
            type="number"
            min={1}
            max={100}
            className="input-eclat w-full"
            value={form.max_covers}
            onChange={(e) =>
              setForm((f) => ({ ...f, max_covers: Number(e.target.value) }))
            }
            required
          />
        </div>
        <div>
          <label className="text-label block mb-2">Sort order</label>
          <input
            type="number"
            className="input-eclat w-full"
            value={form.sort_order}
            onChange={(e) =>
              setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))
            }
          />
        </div>
        <CrimsonButton type="submit" disabled={pending} className="!py-3">
          <Plus size={14} className="inline mr-1" />
          Add slot
        </CrimsonButton>
      </form>

      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid rgba(201,168,76,0.12)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-label" style={{ color: 'var(--accent-gold)', fontSize: '11px' }}>
              Slots by date
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              Pick a date to see reserved covers vs capacity. Edit or delete slots below — the
              public reservations page updates immediately.
            </p>
          </div>
          <div>
            <label className="text-label block mb-2">Date</label>
            <input
              type="date"
              className="input-eclat"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <p
              className="mt-1 text-[10px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {formatDate(selectedDate)}
            </p>
          </div>
        </div>

        <div
          className="overflow-x-auto rounded-sm"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  background: 'var(--bg-elevated)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                {[
                  'Time',
                  'Label',
                  'Max',
                  'Reserved',
                  'Remaining',
                  'Status',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-label"
                    style={{ color: 'var(--text-muted)', fontSize: '10px' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingAvailability ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <span
                      className="inline-flex items-center gap-2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Loader2 size={18} className="animate-spin" />
                      Loading availability…
                    </span>
                  </td>
                </tr>
              ) : sortedSlots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    No slots — run the Supabase migration or add one above.
                  </td>
                </tr>
              ) : (
                sortedSlots.map((slot) => {
                  const isEditing = editingRowId === slot.id && rowDraft
                  const avail = availabilityByTime.get(normalizeTimeSlot(slot.time_slot))
                  const maxCovers = isEditing ? rowDraft.max_covers : (avail?.max_covers ?? slot.max_covers)
                  const booked = slot.is_active ? (avail?.booked_covers ?? 0) : null
                  const remaining = slot.is_active
                    ? (avail?.remaining_covers ?? maxCovers)
                    : null
                  const status = avail?.availability as SlotAvailabilityState | undefined

                  return (
                    <tr
                      key={slot.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        opacity: slot.is_active ? 1 : 0.45,
                      }}
                    >
                      <td className="px-4 py-3" style={{ color: 'var(--accent-gold)' }}>
                        {formatTime(slot.time_slot)}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="input-eclat w-full min-w-[140px]"
                            value={rowDraft.label}
                            onChange={(e) =>
                              setRowDraft((d) => d && { ...d, label: e.target.value })
                            }
                          />
                        ) : (
                          slot.label
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            max={100}
                            className="input-eclat w-20"
                            value={rowDraft.max_covers}
                            onChange={(e) =>
                              setRowDraft((d) => d && {
                                ...d,
                                max_covers: Number(e.target.value),
                              })
                            }
                          />
                        ) : (
                          maxCovers
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {booked === null ? (
                          '—'
                        ) : (
                          <>
                            <span style={{ color: 'var(--text-primary)' }}>{booked}</span>
                            <span style={{ color: 'var(--text-muted)' }}> / {maxCovers}</span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {remaining === null ? '—' : remaining}
                      </td>
                      <td className="px-4 py-3">
                        {!slot.is_active ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            Inactive
                          </span>
                        ) : status ? (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {getSlotAvailabilityLabel(status, remaining ?? 0)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-center">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRowSave(slot)}
                                disabled={pending}
                                className="p-1.5 rounded-sm hover:bg-[rgba(201,168,76,0.15)]"
                                title="Save"
                                style={{ color: 'var(--accent-gold)' }}
                              >
                                <Save size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={cancelRowEdit}
                                disabled={pending}
                                className="p-1.5 rounded-sm"
                                title="Cancel"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startRowEdit(slot)}
                                disabled={pending || !slot.is_active}
                                className="p-1.5 rounded-sm hover:bg-[rgba(201,168,76,0.15)]"
                                title="Edit"
                                style={{ color: 'var(--accent-gold)' }}
                              >
                                <Pencil size={16} />
                              </button>
                              {slot.is_active && (
                                <button
                                  type="button"
                                  onClick={() => handleRemove(slot)}
                                  disabled={pending}
                                  className="p-1.5 rounded-sm hover:bg-[rgba(192,57,43,0.15)]"
                                  title="Delete"
                                  style={{ color: 'var(--accent-crimson-light)' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </>
                          )}
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
    </div>
  )
}
