import type { SiteSettings } from '@/lib/site-settings-types'
import { SETTINGS_FALLBACK } from '@/lib/site-settings-types'
import type { SiteConfig } from '@/types/index'
import { DEFAULT_SITE_CONFIG } from '@/lib/constants'

export type SettingsRow = { key: string; value: unknown }

export function rowsToSettingsMap(rows: SettingsRow[]): Record<string, unknown> {
  return Object.fromEntries(rows.map((row) => [row.key, row.value]))
}

/** Admin CMS shape (nested keys: hours, contact, social, …). */
export function mapRowsToSiteSettings(
  map: Record<string, unknown>
): SiteSettings {
  return {
    hours: (map.hours as SiteSettings['hours']) ?? SETTINGS_FALLBACK.hours,
    contact: (map.contact as SiteSettings['contact']) ?? SETTINGS_FALLBACK.contact,
    social: (map.social as SiteSettings['social']) ?? SETTINGS_FALLBACK.social,
    announcement:
      (map.announcement as SiteSettings['announcement']) ?? SETTINGS_FALLBACK.announcement,
    delivery: (map.delivery as SiteSettings['delivery']) ?? SETTINGS_FALLBACK.delivery,
  }
}

export function mapRowsToSiteConfig(map: Record<string, unknown>): SiteConfig {
  const nested = mapRowsToSiteSettings(map)
  const config: SiteConfig = { ...DEFAULT_SITE_CONFIG }

  if (nested.contact.phone) config.phone = nested.contact.phone
  if (nested.contact.email) config.email = nested.contact.email
  if (nested.contact.address) config.address = nested.contact.address

  if (nested.delivery.fee != null) {
    config.delivery_fee = Number(nested.delivery.fee) || DEFAULT_SITE_CONFIG.delivery_fee
  }
  if (nested.delivery.min_order != null) {
    config.min_order = Number(nested.delivery.min_order) || DEFAULT_SITE_CONFIG.min_order
  }

  if (nested.announcement.enabled && nested.announcement.text.trim()) {
    config.announcement = nested.announcement.text.trim()
  } else {
    config.announcement = null
  }

  if (nested.social.instagram) {
    config.social_links = {
      ...config.social_links,
      instagram: nested.social.instagram,
    }
  }
  if (nested.social.facebook) {
    config.social_links = {
      ...config.social_links,
      facebook: nested.social.facebook,
    }
  }

  // Legacy flat keys (older saves / manual DB rows)
  if (map.delivery_fee != null) {
    config.delivery_fee = Number(map.delivery_fee) || config.delivery_fee
  }
  if (map.min_order != null) {
    config.min_order = Number(map.min_order) || config.min_order
  }
  if (map.phone != null) config.phone = String(map.phone)
  if (map.email != null) config.email = String(map.email)
  if (map.address != null) config.address = String(map.address)
  if (map.easypaisa_number != null) {
    config.easypaisa_number = String(map.easypaisa_number)
  }
  if (map.jazzcash_number != null) {
    config.jazzcash_number = String(map.jazzcash_number)
  }
  if (map.restaurant_name != null) {
    config.restaurant_name = String(map.restaurant_name)
  }
  if (map.opening_hours != null) {
    config.opening_hours = map.opening_hours as SiteConfig['opening_hours']
  }
  if (map.social_links != null) {
    config.social_links = {
      ...config.social_links,
      ...(map.social_links as SiteConfig['social_links']),
    }
  }
  if (map.announcement != null && typeof map.announcement === 'string') {
    config.announcement = map.announcement
  }

  return config
}
