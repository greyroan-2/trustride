-- Run as the operator on Supabase after delivery lifecycle migrations.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('trustride-advance-deliveries','* * * * *','SELECT trustride_private.advance_due_deliveries();');
