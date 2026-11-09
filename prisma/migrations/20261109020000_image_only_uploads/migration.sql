-- MIME limits protect new writes; existing files are not removed.
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png']::text[]
WHERE id IN ('booking-requirements','vehicle-assets');
UPDATE storage.buckets SET public = false WHERE id = 'booking-requirements';
