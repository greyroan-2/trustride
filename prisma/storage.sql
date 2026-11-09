-- Run in Supabase SQL editor as operator, after application migrations.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('vehicle-assets','vehicle-assets',true,5242880,ARRAY['image/jpeg','image/png']) ON CONFLICT (id) DO NOTHING;
CREATE SCHEMA IF NOT EXISTS trustride_private;
REVOKE ALL ON SCHEMA trustride_private FROM PUBLIC;
GRANT USAGE ON SCHEMA trustride_private TO authenticated;
CREATE OR REPLACE FUNCTION trustride_private.is_trustride_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public."UserProfile" WHERE id = auth.uid() AND role = 'ADMIN'); $$;
REVOKE ALL ON FUNCTION trustride_private.is_trustride_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION trustride_private.is_trustride_admin() TO authenticated;
CREATE POLICY trustride_admin_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-assets' AND (SELECT trustride_private.is_trustride_admin()));
-- Public bucket contains only licensed public vehicle photos, never customer documents.
