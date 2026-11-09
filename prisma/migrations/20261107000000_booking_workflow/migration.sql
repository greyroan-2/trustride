CREATE TABLE public."BookingWorkflow" (
  "bookingId" uuid PRIMARY KEY REFERENCES public."Booking"(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public."BookingWorkflow" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."BookingWorkflow" FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-requirements', 'booking-requirements', false, 5242880, ARRAY['image/jpeg','image/png','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE SCHEMA IF NOT EXISTS trustride_private;
CREATE OR REPLACE FUNCTION trustride_private.can_read_booking_document(object_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    (storage.foldername(object_path))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public."UserProfile" WHERE id = auth.uid() AND role = 'ADMIN')
  );
$$;
REVOKE ALL ON FUNCTION trustride_private.can_read_booking_document(text) FROM PUBLIC;
GRANT USAGE ON SCHEMA trustride_private TO authenticated;
GRANT EXECUTE ON FUNCTION trustride_private.can_read_booking_document(text) TO authenticated;
CREATE POLICY booking_document_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'booking-requirements' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY booking_document_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'booking-requirements' AND trustride_private.can_read_booking_document(name));
CREATE POLICY booking_document_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'booking-requirements' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
