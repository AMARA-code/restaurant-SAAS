import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/admin-auth'

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  code: z.string().max(40).optional().nullable(),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_value: z.number().positive().optional(),
  min_order_amount: z.number().min(0).optional(),
  max_uses: z.number().int().positive().optional().nullable(),
  starts_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdminSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }
    if (parsed.data.code !== undefined) {
      updates.code = parsed.data.code?.trim().toUpperCase() || null
    }
    if (parsed.data.title) updates.title = parsed.data.title.trim()
    if (parsed.data.description !== undefined) {
      updates.description = parsed.data.description?.trim() || null
    }

    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Admin promotion PATCH:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const admin = await requireAdminSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('promotions').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin promotion DELETE:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
