import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  mapRowsToSiteSettings,
  rowsToSettingsMap,
} from '@/lib/site-settings-mapper'

/** Public read-only site settings for the storefront. */
export async function GET() {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('site_settings')
      .select('key, value')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const map = rowsToSettingsMap((data ?? []) as { key: string; value: unknown }[])
    const settings = mapRowsToSiteSettings(map)

    return NextResponse.json(
      { success: true, data: settings },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('Public settings GET:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
