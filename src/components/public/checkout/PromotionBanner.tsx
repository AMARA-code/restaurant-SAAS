'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Promotion } from '@/types/database'
import type { AppliedPromotion } from '@/types/index'
import { formatDiscountBadge } from '@/lib/promotions'
import { formatPrice } from '@/lib/utils'

interface Props {
  cartSubtotal: number
  onPromoApplied: (promo: AppliedPromotion | null) => void
}

export default function PromotionBanner({ cartSubtotal, onPromoApplied }: Props) {
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const onAppliedRef = useRef(onPromoApplied)
  onAppliedRef.current = onPromoApplied

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/promotions/active')
        const json = await res.json()
        if (!cancelled) setPromotion(json.data ?? null)
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

  useEffect(() => {
    if (loading) return

    if (!promotion) {
      onAppliedRef.current(null)
      return
    }

    const min = Number(promotion.min_order_amount)
    if (cartSubtotal < min) {
      onAppliedRef.current(null)
      return
    }

    let discountAmount = 0
    if (promotion.discount_type === 'percentage') {
      discountAmount = Math.floor((cartSubtotal * Number(promotion.discount_value)) / 100)
    } else {
      discountAmount = Math.min(Number(promotion.discount_value), cartSubtotal)
    }

    if (discountAmount <= 0) {
      onAppliedRef.current(null)
      return
    }

    onAppliedRef.current({
      id: promotion.id,
      title: promotion.title,
      code: promotion.code,
      discount_type: promotion.discount_type,
      discount_value: Number(promotion.discount_value),
      discountAmount,
    })
  }, [promotion, cartSubtotal, loading])

  async function copyCode() {
    if (!promotion?.code) return
    try {
      await navigator.clipboard.writeText(promotion.code)
      setCopied(true)
      toast.success('Code copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy code')
    }
  }

  if (loading || !promotion) return null

  const min = Number(promotion.min_order_amount)
  const meetsMin = cartSubtotal >= min

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-eclat p-4 md:p-5 mb-6"
      style={{ borderLeft: '3px solid var(--accent-gold)' }}
    >
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="flex gap-3 min-w-0">
          <div
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-sm"
            style={{ background: 'var(--accent-gold-muted)' }}
          >
            <Tag size={18} style={{ color: 'var(--accent-gold)' }} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="badge-gold">{formatDiscountBadge(promotion)}</span>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.1rem',
                  color: 'var(--text-primary)',
                }}
              >
                {promotion.title}
              </h3>
            </div>
            {promotion.description && (
              <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}
              >
                {promotion.description}
              </p>
            )}
            {!meetsMin && min > 0 && (
              <p className="text-xs mt-2" style={{ color: 'var(--accent-gold)' }}>
                Add {formatPrice(min - cartSubtotal)} more to unlock this offer
              </p>
            )}
            {meetsMin && !promotion.code && (
              <p className="text-xs mt-2 text-label" style={{ color: 'var(--accent-gold)' }}>
                Applied automatically
              </p>
            )}
          </div>
        </div>

        {promotion.code && meetsMin && (
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-2 px-3 py-2 rounded-sm transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: 'var(--accent-gold)',
            }}
          >
            {promotion.code}
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </motion.div>
  )
}
