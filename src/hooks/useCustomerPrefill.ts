'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export interface CustomerPrefill {
  name: string
  email: string
  phone: string
  address: string
}

const EMPTY: CustomerPrefill = {
  name: '',
  email: '',
  phone: '',
  address: '',
}

/**
 * Loads name, email, phone, and last delivery address for the signed-in user.
 */
export function useCustomerPrefill() {
  const { user, loading: authLoading } = useAuth()
  const [prefill, setPrefill] = useState<CustomerPrefill>(EMPTY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user?.email) {
      setPrefill(EMPTY)
      setReady(true)
      return
    }

    let cancelled = false

    async function load() {
      const metadata = user!.user_metadata ?? {}
      const fallback: CustomerPrefill = {
        name: typeof metadata.full_name === 'string' ? metadata.full_name : '',
        email: user!.email ?? '',
        phone: typeof metadata.phone === 'string' ? metadata.phone : '',
        address: '',
      }

      try {
        const res = await fetch('/api/me/profile', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          if (!cancelled && json.data) {
            setPrefill({
              name: json.data.name || fallback.name,
              email: json.data.email || fallback.email,
              phone: json.data.phone || fallback.phone,
              address: json.data.address || '',
            })
            setReady(true)
            return
          }
        }
      } catch {
        // fall through to auth metadata
      }

      if (!cancelled) {
        setPrefill(fallback)
        setReady(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  return { prefill, ready, isSignedIn: Boolean(user) }
}
