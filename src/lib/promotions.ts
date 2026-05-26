import type { Promotion } from '@/types/database'
import type { AppliedPromotion } from '@/types/index'
import { formatPrice } from '@/lib/utils'

export function isPromotionCurrentlyActive(promo: Promotion, now = Date.now()): boolean {
  if (!promo.is_active) return false
  if (promo.starts_at && new Date(promo.starts_at).getTime() > now) return false
  if (promo.expires_at && new Date(promo.expires_at).getTime() <= now) return false
  if (promo.max_uses != null && promo.uses_count >= promo.max_uses) return false
  return true
}

export function pickActivePromotion(rows: Promotion[]): Promotion | null {
  const now = Date.now()
  const active = rows.filter((p) => isPromotionCurrentlyActive(p, now))
  if (!active.length) return null
  return active.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]
}

export function calculatePromotionDiscount(
  promo: Promotion,
  cartSubtotal: number
): number {
  if (cartSubtotal < Number(promo.min_order_amount)) return 0

  if (promo.discount_type === 'percentage') {
    return Math.floor((cartSubtotal * Number(promo.discount_value)) / 100)
  }

  return Math.min(Number(promo.discount_value), cartSubtotal)
}

export function toAppliedPromotion(
  promo: Promotion,
  cartSubtotal: number
): AppliedPromotion {
  const discountAmount = calculatePromotionDiscount(promo, cartSubtotal)
  return {
    id: promo.id,
    title: promo.title,
    code: promo.code,
    discount_type: promo.discount_type,
    discount_value: Number(promo.discount_value),
    discountAmount,
  }
}

export function formatDiscountBadge(promo: Pick<Promotion, 'discount_type' | 'discount_value'>): string {
  if (promo.discount_type === 'percentage') {
    return `${Number(promo.discount_value)}% OFF`
  }
  return `${formatPrice(Number(promo.discount_value))} OFF`
}

export function formatPromotionBannerMessage(promo: Promotion): string {
  const badge = formatDiscountBadge(promo)
  const parts = [`🎉 ${badge}`, promo.title]
  if (promo.description?.trim()) parts.push(promo.description.trim())
  if (promo.code?.trim()) parts.push(`Use code ${promo.code.trim().toUpperCase()}`)
  else parts.push('Applied automatically at checkout')
  return parts.join(' · ')
}
