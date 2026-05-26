import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin-config'

export async function requireAdminSession() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !isAdminEmail(user?.email)) {
    return null
  }

  return user
}
