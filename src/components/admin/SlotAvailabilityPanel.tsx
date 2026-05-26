'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { toDateString, formatTime, getSlotAvailabilityLabel } from '@/lib/utils'
import type { SlotAvailability, SlotAvailabilityState } from '@/types/index'

export default function SlotAvailabilityPanel() {
  const [date, setDate] = useState(() => toDateString(new Date()))
  const [slots, setSlots] = useState<SlotAvailability[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSlots = useCallback(async (dateStr: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reservations/slots?date=${dateStr}`)
      const json = await res.json()
      setSlots(json.data ?? [])
    } catch {
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSlots(date)
  }, [date, fetchSlots])

  return (
    <div
      className="rounded-xl p-6 mb-8"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(201,168,76,0.12)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-label" style={{ color: 'var(--accent-gold)', fontSize: '11px' }}>
            Live availability
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Covers booked vs capacity (pending + confirmed hold a slot).
          </p>
        </div>
        <input
          type="date"
          className="input-eclat"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={18} className="animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: 'var(--text-secondary)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="text-left py-2 px-3 text-label">Time</th>
                <th className="text-right py-2 px-3 text-label">Max</th>
                <th className="text-right py-2 px-3 text-label">Booked</th>
                <th className="text-right py-2 px-3 text-label">Left</th>
                <th className="text-left py-2 px-3 text-label">Status</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.time_slot} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="py-2 px-3">{formatTime(slot.time_slot)}</td>
                  <td className="py-2 px-3 text-right">{slot.max_covers}</td>
                  <td className="py-2 px-3 text-right">{slot.booked_covers}</td>
                  <td className="py-2 px-3 text-right">{slot.remaining_covers}</td>
                  <td className="py-2 px-3">
                    {getSlotAvailabilityLabel(
                      slot.availability as SlotAvailabilityState,
                      slot.remaining_covers
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
