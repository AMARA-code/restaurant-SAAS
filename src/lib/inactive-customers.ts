import { createAdminClient } from '@/lib/supabase/server'

export const INACTIVE_ORDER_DAYS = 15

export interface InactiveCustomerCandidate {
  id: string
  name: string
  email: string
  last_order_at: string | null
  days_since_activity: number
}

function daysBetween(past: Date, now: Date): number {
  return Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Customers eligible for a one-time win-back email:
 * - Has email
 * - No order in the last 15 days (or never ordered, account 15+ days old)
 * - Reminder not already sent for this inactive period (column null)
 */
export async function getInactiveOrderReminderCandidates(): Promise<
  InactiveCustomerCandidate[]
> {
  const supabase = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - INACTIVE_ORDER_DAYS)

  const { data: customers, error: custErr } = await db
    .from('customers')
    .select('id, name, email, created_at, inactive_reminder_sent_at')
    .not('email', 'is', null)
    .is('inactive_reminder_sent_at', null)

  if (custErr) {
    throw new Error(custErr.message)
  }

  const { data: orders, error: ordErr } = await db
    .from('orders')
    .select('customer_id, customer_email, created_at')
    .order('created_at', { ascending: false })

  if (ordErr) {
    throw new Error(ordErr.message)
  }

  const lastOrderByCustomerId = new Map<string, string>()
  const lastOrderByEmail = new Map<string, string>()

  for (const o of orders ?? []) {
    const at = o.created_at as string
    if (o.customer_id && !lastOrderByCustomerId.has(o.customer_id)) {
      lastOrderByCustomerId.set(o.customer_id, at)
    }
    const email = (o.customer_email as string | null)?.trim().toLowerCase()
    if (email && !lastOrderByEmail.has(email)) {
      lastOrderByEmail.set(email, at)
    }
  }

  const candidates: InactiveCustomerCandidate[] = []

  for (const c of customers ?? []) {
    const email = (c.email as string).trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue

    const lastFromId = lastOrderByCustomerId.get(c.id) ?? null
    const lastFromEmail = lastOrderByEmail.get(email) ?? null
    const lastOrderAt =
      lastFromId && lastFromEmail
        ? lastFromId > lastFromEmail
          ? lastFromId
          : lastFromEmail
        : lastFromId ?? lastFromEmail

    if (lastOrderAt) {
      const lastOrderDate = new Date(lastOrderAt)
      if (lastOrderDate > cutoff) continue
      candidates.push({
        id: c.id,
        name: c.name as string,
        email,
        last_order_at: lastOrderAt,
        days_since_activity: daysBetween(lastOrderDate, now),
      })
    } else {
      const created = new Date(c.created_at as string)
      if (created > cutoff) continue
      candidates.push({
        id: c.id,
        name: c.name as string,
        email,
        last_order_at: null,
        days_since_activity: daysBetween(created, now),
      })
    }
  }

  return candidates
}

export async function markInactiveReminderSent(customerId: string) {
  const supabase = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db
    .from('customers')
    .update({ inactive_reminder_sent_at: new Date().toISOString() })
    .eq('id', customerId)
}

export async function clearInactiveReminderSent(customerId: string | null) {
  if (!customerId) return
  const supabase = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db
    .from('customers')
    .update({ inactive_reminder_sent_at: null })
    .eq('id', customerId)
}
