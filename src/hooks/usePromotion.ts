'use client'

import { useEffect, useState, useMemo } from 'react'
import type { Promotion } from '@/types/database'
import type { AppliedPromotion } from '@/types/index'
import { calculatePromotionDiscount } from '@/lib/promotions'

export function usePromotion(cartSubtotal: number) {
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/promotions/active')
        const json = await res.json()
        if (!cancelled) {
          setPromotion(json.data ?? null)
        }
      } catch {
        if (!cancelled) setPromotion(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const discountAmount = useMemo(() => {
    if (!promotion) return 0
    return calculatePromotionDiscount(promotion, cartSubtotal)
  }, [promotion, cartSubtotal])

  const applied: AppliedPromotion | null = useMemo(() => {
    if (!promotion || discountAmount <= 0) return null
    return {
      id: promotion.id,
      title: promotion.title,
      code: promotion.code,
      discount_type: promotion.discount_type,
      discount_value: Number(promotion.discount_value),
      discountAmount,
    }
  }, [promotion, discountAmount])

  const finalTotal = Math.max(0, cartSubtotal - discountAmount)

  return {
    promotion,
    applied,
    discountAmount,
    finalTotal,
    loading,
  }
}
