-- Realtime updates when admins change slot config (public booking page listens)
ALTER PUBLICATION supabase_realtime ADD TABLE reservation_slots;
