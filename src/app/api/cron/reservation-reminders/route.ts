import { NextResponse } from 'next/server'

/**
 * Reminder emails are disabled — guests receive a single confirmation email
 * when admin confirms the reservation (nodemailer).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    disabled: true,
    message: 'Reservation reminder emails are disabled',
    sent: { reminder_24h: 0, reminder_1h: 0 },
  })
}
