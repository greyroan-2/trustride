-- Run as operator in Supabase SQL editor after prisma/storage.sql.
-- Grants only application admins access to list and delete public vehicle assets.
BEGIN;
DROP POLICY IF EXISTS trustride_admin_read_vehicle_photos ON storage.objects;
CREATE POLICY trustride_admin_read_vehicle_photos ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'vehicle-assets' AND (SELECT trustride_private.is_trustride_admin()));
DROP POLICY IF EXISTS trustride_admin_delete_vehicle_photos ON storage.objects;
CREATE POLICY trustride_admin_delete_vehicle_photos ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'vehicle-assets' AND (SELECT trustride_private.is_trustride_admin()));
COMMIT;
