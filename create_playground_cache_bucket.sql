-- playground-cache 스토리지 버킷 생성 및 정책 설정

-- 1. playground-cache 버킷 생성 (이미 존재하면 무시)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'playground-cache',
  'playground-cache',
  true,
  52428800, -- 50MB
  ARRAY['application/json']
)
ON CONFLICT (id) DO NOTHING;

-- 2. 공개 읽기 정책 (모든 사용자가 캐시 읽기 가능)
CREATE POLICY "playground_cache_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'playground-cache');

-- 3. 인증된 사용자 쓰기 정책 (캐시 저장 가능)
CREATE POLICY "playground_cache_authenticated_write" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'playground-cache'
  AND auth.role() = 'authenticated'
);

-- 4. 인증된 사용자 업데이트 정책 (캐시 업데이트 가능)
CREATE POLICY "playground_cache_authenticated_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'playground-cache'
  AND auth.role() = 'authenticated'
);

-- 5. 인증된 사용자 삭제 정책 (캐시 삭제 가능)
CREATE POLICY "playground_cache_authenticated_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'playground-cache'
  AND auth.role() = 'authenticated'
);

-- 정책 확인
SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%playground_cache%'
ORDER BY policyname;

