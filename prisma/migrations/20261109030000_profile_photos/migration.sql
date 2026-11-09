ALTER TABLE public."UserProfile" ADD COLUMN "avatarPath" TEXT;
-- Profile photos are public; never store IDs or other private documents here.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('profile-photos','profile-photos',true,5242880,ARRAY['image/jpeg','image/png'])
ON CONFLICT (id) DO UPDATE SET public=true,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
CREATE POLICY profile_photo_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='profile-photos' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY profile_photo_read_own ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='profile-photos' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY profile_photo_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='profile-photos' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
