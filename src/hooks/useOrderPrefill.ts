'use client'

import { useCustomerPrefill } from '@/hooks/useCustomerPrefill'

/**
 * @deprecated Prefer useCustomerPrefill — kept for CheckoutCustomerStep.
 */
export function useOrderPrefill() {
  const { prefill, ready } = useCustomerPrefill()
  return {
    prefill: {
      name: prefill.name,
      email: prefill.email,
      phone: prefill.phone,
    },
    ready,
  }
}
