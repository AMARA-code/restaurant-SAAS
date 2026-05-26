import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Returns customer profile + last delivery address for the signed-in user. */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ data: null })
    }

    const email = user.email.trim().toLowerCase()
    const metadata = user.user_metadata ?? {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: customer } = await (supabase as any)
      .from('customers')
      .select('name, phone, email')
      .eq('email', email)
      .maybeSingle()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lastOrder } = await (supabase as any)
      .from('orders')
      .select('customer_name, customer_phone, delivery_address')
      .eq('customer_email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      data: {
        name:
          customer?.name ??
          (typeof metadata.full_name === 'string' ? metadata.full_name : '') ??
          '',
        email,
        phone:
          customer?.phone ??
          (typeof metadata.phone === 'string' ? metadata.phone : '') ??
          lastOrder?.customer_phone ??
          '',
        address: lastOrder?.delivery_address ?? '',
      },
    })
  } catch (err) {
    console.error('Profile API error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
