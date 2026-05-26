'use client'

import { useState, useEffect } from 'react'
import type { SiteSettings } from '@/lib/site-settings-types'
import { SETTINGS_FALLBACK } from '@/lib/site-settings-types'

export type { SiteSettings } from '@/lib/site-settings-types'
export { SETTINGS_FALLBACK } from '@/lib/site-settings-types'

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(SETTINGS_FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/site-settings', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch settings')
        const json = await res.json()

        if (!cancelled && json.data) {
          setSettings(json.data as SiteSettings)
        }
      } catch {
        // Keep fallback defaults
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { settings, loading }
}
