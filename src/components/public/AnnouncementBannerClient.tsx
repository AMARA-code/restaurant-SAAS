'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Promotion } from '@/types/database'
import type { SiteSettings } from '@/lib/site-settings-types'
import { formatPromotionBannerMessage } from '@/lib/promotions'

type BannerMode = 'promotion' | 'announcement'

interface Props {
  promotion: Promotion | null
  announcement: SiteSettings['announcement'] | null
}

export default function AnnouncementBannerClient({ promotion, announcement }: Props) {
  const [dismissed, setDismissed] = useState(true)
  const [mounted, setMounted] = useState(false)

  const mode: BannerMode | null = promotion
    ? 'promotion'
    : announcement
      ? 'announcement'
      : null

  const bannerId = promotion?.id ?? (announcement ? 'site-announcement' : '')
  const message = promotion
    ? formatPromotionBannerMessage(promotion)
    : announcement?.text ?? ''

  useEffect(() => {
    setMounted(true)
    if (!bannerId) {
      setDismissed(true)
      return
    }
    const key = `eclat-banner-dismissed-${bannerId}`
    setDismissed(localStorage.getItem(key) === '1')
  }, [bannerId])

  function dismiss() {
    if (!bannerId) return
    localStorage.setItem(`eclat-banner-dismissed-${bannerId}`, '1')
    setDismissed(true)
  }

  if (!mounted || !mode || !message.trim() || dismissed) {
    return null
  }

  const isPromo = mode === 'promotion'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-[60] overflow-hidden"
        style={{
          background: isPromo ? 'var(--accent-gold)' : 'var(--accent-crimson)',
          borderBottom: isPromo
            ? '1px solid rgba(10,10,10,0.12)'
            : '1px solid rgba(0,0,0,0.2)',
        }}
        role="status"
      >
        <div className="container-eclat flex items-center justify-center gap-3 py-2.5 px-10">
          <p
            className="text-center text-xs sm:text-sm font-medium tracking-wide"
            style={{
              color: isPromo ? 'var(--bg-primary)' : 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-sm transition-opacity hover:opacity-70"
            style={{
              color: isPromo ? 'var(--bg-primary)' : 'var(--text-primary)',
            }}
            aria-label="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
