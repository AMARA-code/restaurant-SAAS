import AnnouncementBannerClient from '@/components/public/AnnouncementBannerClient'
import {
  fetchActivePromotion,
  fetchAnnouncementSetting,
} from '@/lib/promotions-server'

export default async function AnnouncementBanner() {
  const [promotion, announcement] = await Promise.all([
    fetchActivePromotion(),
    fetchAnnouncementSetting(),
  ])

  if (!promotion && !announcement) {
    return null
  }

  return (
    <AnnouncementBannerClient
      promotion={promotion}
      announcement={promotion ? null : announcement}
    />
  )
}
