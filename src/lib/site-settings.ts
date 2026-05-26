import { createClient } from '@/lib/supabase/server'
import { DEFAULT_SITE_CONFIG } from '@/lib/constants'
import type { SiteConfig } from '@/types/index'
import {
  mapRowsToSiteConfig,
  rowsToSettingsMap,
} from '@/lib/site-settings-mapper'

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('site_settings').select('key, value')

    if (error || !data?.length) {
      return DEFAULT_SITE_CONFIG
    }

    const map = rowsToSettingsMap(data as { key: string; value: unknown }[])
    return mapRowsToSiteConfig(map)
  } catch {
    return DEFAULT_SITE_CONFIG
  }
}
