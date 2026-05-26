import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  name: z.string().max(120).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = subscribeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const email = parsed.data.email.trim().toLowerCase()
    const name = parsed.data.name?.trim() || null

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('newsletter_subscribers').insert({
      email,
      name,
      is_active: true,
    })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: "You're already subscribed" },
          { status: 409 }
        )
      }
      console.error('Newsletter insert:', error)
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Subscribed successfully',
    })
  } catch (err) {
    console.error('Newsletter API:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
