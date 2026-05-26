import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'amaranaeem453@gmail.com'

export async function requireAdminSession() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user?.email || user.email !== ADMIN_EMAIL) {
    return null
  }

  return user
}
