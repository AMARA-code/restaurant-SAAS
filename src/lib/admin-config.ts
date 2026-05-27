/** Single source of truth for admin email checks (middleware, API routes, UI). */
const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL,
  process.env.GMAIL_USER,
  // Safe fallback for local/dev when env is missing.
  'amaranaeem453@gmail.com',
]
  .map((value) => value?.trim().toLowerCase())
  .filter((value): value is string => Boolean(value))

const ADMIN_EMAIL_SET = new Set(ADMIN_EMAILS)

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAIL_SET.has(email.trim().toLowerCase())
}
