import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/admin-auth'
import { incrementPromotionUses } from '@/lib/promotions-server'

const sendSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  html: z.string().min(1, 'Message body is required'),
  promotionId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email service not configured',
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const parsed = sendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: subscribers, error: subErr } = await db
      .from('newsletter_subscribers')
      .select('email')
      .eq('is_active', true)

    if (subErr) {
      return NextResponse.json({ error: 'Failed to load subscribers' }, { status: 500 })
    }

    const emails = (subscribers ?? [])
      .map((s: { email: string }) => s.email?.trim())
      .filter(Boolean) as string[]

    if (!emails.length) {
      return NextResponse.json({ success: true, sent: 0, message: 'No active subscribers' })
    }

    const resend = new Resend(apiKey)
    const from = process.env.RESEND_FROM_EMAIL ?? 'Eclat Restaurant <onboarding@resend.dev>'

    let sent = 0
    const errors: string[] = []

    for (const to of emails) {
      try {
        const { error } = await resend.emails.send({
          from,
          to,
          subject: parsed.data.subject,
          html: parsed.data.html,
        })
        if (error) {
          errors.push(`${to}: ${error.message}`)
        } else {
          sent++
        }
      } catch (e) {
        errors.push(`${to}: ${e instanceof Error ? e.message : 'Send failed'}`)
      }
    }

    if (parsed.data.promotionId) {
      try {
        await incrementPromotionUses(parsed.data.promotionId)
      } catch (e) {
        console.error('Increment promotion uses:', e)
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed: emails.length - sent,
      errors: errors.length ? errors.slice(0, 5) : undefined,
    })
  } catch (err) {
    console.error('Newsletter send:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
