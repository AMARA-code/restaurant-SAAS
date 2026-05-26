import { createAdminClient, createClient } from '@/lib/supabase/server'
import { pickActivePromotion } from '@/lib/promotions'
import type { Promotion } from '@/types/database'
import type { SiteSettings } from '@/lib/site-settings-types'
import { SETTINGS_FALLBACK } from '@/lib/site-settings-types'

export async function fetchActivePromotion(): Promise<Promotion | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('fetchActivePromotion:', error.message)
    return null
  }

  return pickActivePromotion((data ?? []) as Promotion[])
}

export async function fetchAnnouncementSetting(): Promise<SiteSettings['announcement'] | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('site_settings')
    .select('value')
    .eq('key', 'announcement')
    .maybeSingle()

  const value = data?.value as SiteSettings['announcement'] | undefined
  if (!value?.enabled || !value.text?.trim()) return null
  return value
}

export async function fetchAllPromotionsAdmin(): Promise<Promotion[]> {
  const supabase = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Promotion[]
}

export async function incrementPromotionUses(promotionId: string) {
  const supabase = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: row } = await db.from('promotions').select('uses_count').eq('id', promotionId).single()
  if (!row) return
  await db
    .from('promotions')
    .update({
      uses_count: (row.uses_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', promotionId)
}

export { SETTINGS_FALLBACK }
