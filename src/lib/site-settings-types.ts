export interface SiteSettings {
  hours: {
    monday_friday: string
    saturday: string
    sunday: string
    note: string
  }
  contact: {
    phone: string
    email: string
    address: string
    map_embed: string
  }
  social: {
    instagram: string
    facebook: string
    whatsapp: string
    tiktok: string
  }
  announcement: {
    enabled: boolean
    text: string
    type: 'info' | 'promo' | 'warning'
  }
  delivery: {
    fee: number
    min_order: number
    radius: string
    estimated_time: string
  }
}

export const SETTINGS_FALLBACK: SiteSettings = {
  hours: {
    monday_friday: '5:00 PM – 11:00 PM',
    saturday: '5:00 PM – 11:00 PM',
    sunday: '5:00 PM – 10:00 PM',
    note: '',
  },
  contact: {
    phone: '+92 300 0000000',
    email: 'reservations@eclat.com',
    address: '123 Luxury Avenue, Prestige District',
    map_embed: '',
  },
  social: {
    instagram: '#',
    facebook: '#',
    whatsapp: '#',
    tiktok: '#',
  },
  announcement: {
    enabled: false,
    text: '',
    type: 'promo',
  },
  delivery: {
    fee: 150,
    min_order: 500,
    radius: '10km',
    estimated_time: '30–45 mins',
  },
}
