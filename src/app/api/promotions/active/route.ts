import { NextResponse } from 'next/server'
import { fetchActivePromotion } from '@/lib/promotions-server'

export const revalidate = 60

export async function GET() {
  try {
    const promotion = await fetchActivePromotion()
    return NextResponse.json(
      { data: promotion },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (err) {
    console.error('Active promotion GET:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
