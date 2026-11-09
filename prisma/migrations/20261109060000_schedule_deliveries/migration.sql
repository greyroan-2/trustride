-- Supabase supports pg_cron. Plain Postgres CI does not, so skip there.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name='pg_cron') THEN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXECUTE $job$SELECT cron.schedule('trustride-advance-deliveries','* * * * *','SELECT trustride_private.advance_due_deliveries();')$job$;
 END IF;
END $$;
