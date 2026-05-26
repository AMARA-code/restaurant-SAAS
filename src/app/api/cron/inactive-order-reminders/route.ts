import { NextResponse } from 'next/server'
import { sendInactiveOrderReminderEmail } from '@/lib/email'
import {
  getInactiveOrderReminderCandidates,
  markInactiveReminderSent,
  INACTIVE_ORDER_DAYS,
} from '@/lib/inactive-customers'

/**
 * Daily cron: email customers who have not placed an order in ${INACTIVE_ORDER_DAYS} days.
 * Secured with CRON_SECRET (Vercel Cron sends Authorization: Bearer <secret>).
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const candidates = await getInactiveOrderReminderCandidates()
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const customer of candidates) {
      if (customer.days_since_activity < INACTIVE_ORDER_DAYS) continue

      try {
        await sendInactiveOrderReminderEmail({
          name: customer.name,
          email: customer.email,
          days_since_activity: customer.days_since_activity,
        })
        await markInactiveReminderSent(customer.id)
        sent++
      } catch (e) {
        failed++
        const msg = e instanceof Error ? e.message : 'Send failed'
        errors.push(`${customer.email}: ${msg}`)
        console.error('Inactive reminder failed:', customer.id, e)
      }
    }

    return NextResponse.json({
      success: true,
      checked: candidates.length,
      sent,
      failed,
      inactive_days_threshold: INACTIVE_ORDER_DAYS,
      errors: errors.length ? errors.slice(0, 10) : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    console.error('Inactive order reminders cron:', err)

    if (message.includes('inactive_reminder_sent_at')) {
      return NextResponse.json(
        {
          error:
            'Run Supabase migration 006_inactive_order_reminder.sql to add inactive_reminder_sent_at on customers.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
