import React from 'react'
import AnnouncementBanner from '@/components/public/AnnouncementBanner'
import CartShell from '@/components/public/cart/CartShell'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AnnouncementBanner />
      <CartShell>{children}</CartShell>
    </>
  )
}
