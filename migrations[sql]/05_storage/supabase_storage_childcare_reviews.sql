-- Storage 버킷: childcare-reviews 생성 및 정책

-- 버킷 메타데이터 (이미 존재하면 업데이트)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'childcare-reviews',
  'childcare-reviews',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 정책 초기화(있으면 삭제)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow authenticated uploads to childcare-reviews') THEN
    DROP POLICY "Allow authenticated uploads to childcare-reviews" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public reads from childcare-reviews') THEN
    DROP POLICY "Allow public reads from childcare-reviews" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow authenticated updates to childcare-reviews') THEN
    DROP POLICY "Allow authenticated updates to childcare-reviews" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow authenticated deletes from childcare-reviews') THEN
    DROP POLICY "Allow authenticated deletes from childcare-reviews" ON storage.objects;
  END IF;
END $$;

-- 업로드 허용 (인증 사용자)
CREATE POLICY "Allow authenticated uploads to childcare-reviews" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'childcare-reviews' AND auth.role() = 'authenticated'
  );

-- 공개 읽기
CREATE POLICY "Allow public reads from childcare-reviews" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'childcare-reviews'
  );

-- 본인만 업데이트/삭제
CREATE POLICY "Allow authenticated updates to childcare-reviews" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'childcare-reviews' AND auth.uid() = owner
  );

CREATE POLICY "Allow authenticated deletes from childcare-reviews" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'childcare-reviews' AND auth.uid() = owner
  );


