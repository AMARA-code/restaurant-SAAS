'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { CrimsonButton, OutlineButton } from '@/components/ui/Button'
import type { Promotion } from '@/types/database'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  description: z.string().max(500).optional(),
  code: z.string().max(40).optional(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive('Enter a valid discount'),
  min_order_amount: z.number().min(0),
  max_uses: z.number().int().positive().optional(),
  starts_at: z.string().optional(),
  expires_at: z.string().optional(),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function toLocalDatetime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60_000)
  return local.toISOString().slice(0, 16)
}

function fromLocalDatetime(value: string): string | null {
  if (!value?.trim()) return null
  return new Date(value).toISOString()
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: Promotion | null
}

export default function CreatePromotionModal({ open, onClose, onSaved, editing }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      code: '',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_amount: 0,
      max_uses: undefined,
      starts_at: '',
      expires_at: '',
      is_active: true,
    },
  })

  const discountType = watch('discount_type')

  useEffect(() => {
    if (!open) return
    if (editing) {
      reset({
        title: editing.title,
        description: editing.description ?? '',
        code: editing.code ?? '',
        discount_type: editing.discount_type,
        discount_value: Number(editing.discount_value),
        min_order_amount: Number(editing.min_order_amount),
        max_uses: editing.max_uses ?? undefined,
        starts_at: toLocalDatetime(editing.starts_at),
        expires_at: toLocalDatetime(editing.expires_at),
        is_active: editing.is_active,
      })
    } else {
      reset({
        title: '',
        description: '',
        code: '',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_amount: 0,
        max_uses: undefined,
        starts_at: '',
        expires_at: '',
        is_active: true,
      })
    }
  }, [open, editing, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      title: values.title,
      description: values.description || null,
      code: values.code?.trim() || null,
      discount_type: values.discount_type,
      discount_value: values.discount_value,
      min_order_amount: values.min_order_amount,
      max_uses: values.max_uses ?? null,
      starts_at: fromLocalDatetime(values.starts_at ?? ''),
      expires_at: fromLocalDatetime(values.expires_at ?? ''),
      is_active: values.is_active,
    }

    try {
      const url = editing
        ? `/api/admin/promotions/${editing.id}`
        : '/api/admin/promotions'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      toast.success(editing ? 'Promotion updated' : 'Promotion created')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={editing ? 'Edit Promotion' : 'New Promotion'}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end w-full">
          <OutlineButton type="button" onClick={onClose}>
            Cancel
          </OutlineButton>
          <CrimsonButton type="submit" form="promotion-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
          </CrimsonButton>
        </div>
      }
    >
      <form id="promotion-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-label block mb-2">Title *</label>
          <input className="input-eclat w-full" {...register('title')} />
          {errors.title && (
            <p className="text-xs mt-1" style={{ color: 'var(--accent-crimson-light)' }}>
              {errors.title.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-label block mb-2">Description</label>
          <textarea className="input-eclat w-full min-h-[72px]" {...register('description')} />
        </div>

        <div>
          <label className="text-label block mb-2">Promo code (optional)</label>
          <input
            className="input-eclat w-full font-mono"
            placeholder="Leave empty for auto-apply at checkout"
            {...register('code')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-label block mb-2">Discount type *</label>
            <select className="input-eclat w-full" {...register('discount_type')}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </div>
          <div>
            <label className="text-label block mb-2">
              Value * {discountType === 'percentage' ? '(%)' : '($)'}
            </label>
            <input
              type="number"
              step="any"
              min={0}
              className="input-eclat w-full"
              {...register('discount_value', { valueAsNumber: true })}
            />
            {errors.discount_value && (
              <p className="text-xs mt-1" style={{ color: 'var(--accent-crimson-light)' }}>
                {errors.discount_value.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-label block mb-2">Min order ($)</label>
            <input
              type="number"
              min={0}
              className="input-eclat w-full"
              {...register('min_order_amount', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="text-label block mb-2">Max uses (optional)</label>
            <input
              type="number"
              min={1}
              className="input-eclat w-full"
              {...register('max_uses', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-label block mb-2">Starts at</label>
            <input type="datetime-local" className="input-eclat w-full" {...register('starts_at')} />
          </div>
          <div>
            <label className="text-label block mb-2">Expires at</label>
            <input type="datetime-local" className="input-eclat w-full" {...register('expires_at')} />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4" {...register('is_active')} />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Active</span>
        </label>
      </form>
    </Modal>
  )
}
