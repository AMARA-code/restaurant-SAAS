import AdminNewsletterClient from '@/components/admin/newsletter/AdminNewsletterClient'
import { createAdminClient } from '@/lib/supabase/server'
import type { Subscriber, Promotion } from '@/types/database'

export default async function AdminNewsletterPage() {
  const supabase = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: subscribers }, { data: promotions }] = await Promise.all([
    db.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false }),
    db.from('promotions').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <AdminNewsletterClient
      subscribers={(subscribers ?? []) as Subscriber[]}
      promotions={(promotions ?? []) as Promotion[]}
    />
  )
}
