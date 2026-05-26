/** Single source of truth for admin email checks (middleware, API routes, UI). */
export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL?.trim() || 'amaranaeem453@gmail.com'
).toLowerCase()

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.trim().toLowerCase() === ADMIN_EMAIL
}
