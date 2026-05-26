import AdminPromotionsClient from '@/components/admin/promotions/AdminPromotionsClient'
import { fetchAllPromotionsAdmin } from '@/lib/promotions-server'

export default async function AdminPromotionsPage() {
  let promotions: Awaited<ReturnType<typeof fetchAllPromotionsAdmin>> = []
  try {
    promotions = await fetchAllPromotionsAdmin()
  } catch (err) {
    console.error('Load promotions:', err)
  }

  return <AdminPromotionsClient initialPromotions={promotions} />
}
