-- Win-back email: track when we sent the 15-day inactive order reminder
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS inactive_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN customers.inactive_reminder_sent_at IS
  'Set when 15-day no-order reminder email is sent; cleared when customer places a new order';
