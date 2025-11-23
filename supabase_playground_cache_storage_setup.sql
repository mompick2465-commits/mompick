-- =====================================================
-- Supabase Storage: playground-cache 버킷 설정
-- =====================================================
-- 놀이시설 캐시 데이터 저장을 위한 Storage 버킷 생성 및 정책 설정

-- 1. Storage 버킷 메타데이터 설정
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'playground-cache',
  'playground-cache',
  true,
  52428800, -- 50MB 파일 크기 제한
  ARRAY['application/json', 'text/json'] -- JSON 파일만 허용
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. 기존 정책이 있다면 삭제 (중복 방지)
DROP POLICY IF EXISTS "Allow authenticated uploads to playground-cache" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from playground-cache" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to playground-cache" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from playground-cache" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role uploads to playground-cache" ON storage.objects;

-- 3. Storage 버킷에 대한 RLS 정책 설정

-- INSERT 정책 (인증된 사용자 및 서비스 역할 업로드 허용)
CREATE POLICY "Allow authenticated uploads to playground-cache" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'playground-cache' 
    AND (
      auth.role() = 'authenticated' 
      OR auth.role() = 'service_role'
    )
  );

-- 서비스 역할 업로드 정책 (관리자 페이지용)
CREATE POLICY "Allow service role uploads to playground-cache" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'playground-cache' 
    AND auth.role() = 'service_role'
  );

-- SELECT 정책 (파일 읽기 허용 - 공개)
CREATE POLICY "Allow public reads from playground-cache" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'playground-cache'
  );

-- UPDATE 정책 (파일 수정 허용 - 업로드한 사용자 또는 서비스 역할)
CREATE POLICY "Allow authenticated updates to playground-cache" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'playground-cache' 
    AND (
      auth.uid() = owner 
      OR auth.role() = 'service_role'
    )
  );

-- DELETE 정책 (파일 삭제 허용 - 업로드한 사용자 또는 서비스 역할)
CREATE POLICY "Allow authenticated deletes from playground-cache" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'playground-cache' 
    AND (
      auth.uid() = owner 
      OR auth.role() = 'service_role'
    )
  );

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. Storage > Buckets에서 playground-cache 버킷 확인
-- 4. Storage > Policies에서 정책들이 생성되었는지 확인





