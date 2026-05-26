import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/admin-auth'

const promotionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  description: z.string().max(500).optional().nullable(),
  code: z.string().max(40).optional().nullable(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive('Discount must be greater than 0'),
  min_order_amount: z.number().min(0).default(0),
  max_uses: z.number().int().positive().optional().nullable(),
  starts_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

export async function GET() {
  try {
    const admin = await requireAdminSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (err) {
    console.error('Admin promotions GET:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = promotionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const p = parsed.data
    const payload = {
      title: p.title.trim(),
      description: p.description?.trim() || null,
      code: p.code?.trim().toUpperCase() || null,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      min_order_amount: p.min_order_amount,
      max_uses: p.max_uses ?? null,
      is_active: p.is_active,
      starts_at: p.starts_at || null,
      expires_at: p.expires_at || null,
      updated_at: new Date().toISOString(),
    }

    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('promotions')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Admin promotions POST:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
