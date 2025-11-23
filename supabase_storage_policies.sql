-- Supabase Storage 정책 설정
-- 유치원 캐시 버킷에 대한 보안 정책

-- 1. 버킷 생성 (이미 있다면 스킵)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kindergarten-cache',
  'kindergarten-cache', 
  true, -- 읽기는 공개
  10485760, -- 10MB 제한
  ARRAY['application/json']
) ON CONFLICT (id) DO NOTHING;

-- 2. 읽기 정책: 모든 사용자가 읽기 가능
CREATE POLICY "Public read access for kindergarten cache"
ON storage.objects
FOR SELECT
USING (bucket_id = 'kindergarten-cache');

-- 3. 쓰기 정책: 서비스 롤만 쓰기 가능 (보안)
CREATE POLICY "Service role write only for kindergarten cache"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'kindergarten-cache' AND 
  auth.role() = 'service_role'
);

-- 4. 업데이트 정책: 서비스 롤만 업데이트 가능
CREATE POLICY "Service role update only for kindergarten cache"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'kindergarten-cache' AND 
  auth.role() = 'service_role'
)
WITH CHECK (
  bucket_id = 'kindergarten-cache' AND 
  auth.role() = 'service_role'
);

-- 5. 삭제 정책: 서비스 롤만 삭제 가능
CREATE POLICY "Service role delete only for kindergarten cache"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'kindergarten-cache' AND 
  auth.role() = 'service_role'
);

-- 6. 기존 정책이 있다면 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Public read access for kindergarten cache" ON storage.objects;
DROP POLICY IF EXISTS "Service role write only for kindergarten cache" ON storage.objects;
DROP POLICY IF EXISTS "Service role update only for kindergarten cache" ON storage.objects;
DROP POLICY IF EXISTS "Service role delete only for kindergarten cache" ON storage.objects;

-- 7. 정책 재생성
CREATE POLICY "Public read access for kindergarten cache"
ON storage.objects
FOR SELECT
USING (bucket_id = 'kindergarten-cache');

CREATE POLICY "Service role write only for kindergarten cache"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'kindergarten-cache' AND 
  auth.role() = 'service_role'
);

CREATE POLICY "Service role update only for kindergarten cache"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'kindergarten-cache' AND 
  auth.role() = 'service_role'
)
WITH CHECK (
  bucket_id = 'kindergarten-cache' AND 
  auth.role() = 'service_role'
);

CREATE POLICY "Service role delete only for kindergarten cache"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'kindergarten-cache' AND 
  auth.role() = 'service_role'
);

-- 8. 버킷 공개 설정 확인
UPDATE storage.buckets 
SET public = true 
WHERE id = 'kindergarten-cache';

-- 9. 정책 확인 쿼리
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%kindergarten%'
ORDER BY policyname;
