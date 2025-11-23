-- =====================================================
-- Supabase Storage: community-images 버킷 설정
-- =====================================================

-- 1. Storage 버킷 생성 (community-images)
-- Supabase 대시보드에서 수동으로 생성해야 합니다:
-- Storage > New Bucket > Name: community-images, Public: true

-- 2. Storage 버킷에 대한 RLS 정책 설정

-- INSERT 정책 (파일 업로드 허용)
CREATE POLICY "Allow authenticated uploads to community-images" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'community-images' 
    AND auth.role() = 'authenticated'
  );

-- SELECT 정책 (파일 읽기 허용 - 공개)
CREATE POLICY "Allow public reads from community-images" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'community-images'
  );

-- UPDATE 정책 (파일 수정 허용 - 업로드한 사용자만)
CREATE POLICY "Allow authenticated updates to community-images" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'community-images' 
    AND auth.uid() = owner
  );

-- DELETE 정책 (파일 삭제 허용 - 업로드한 사용자만)
CREATE POLICY "Allow authenticated deletes from community-images" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'community-images' 
    AND auth.uid() = owner
  );

-- 3. Storage 버킷 메타데이터 설정
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-images',
  'community-images',
  true,
  52428800, -- 50MB 파일 크기 제한
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'] -- 허용된 이미지 타입
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. 기존 정책이 있다면 삭제 (중복 방지)
DROP POLICY IF EXISTS "Allow authenticated uploads to community-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from community-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to community-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from community-images" ON storage.objects;

-- 5. 정책 재생성
CREATE POLICY "Allow authenticated uploads to community-images" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'community-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow public reads from community-images" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'community-images'
  );

CREATE POLICY "Allow authenticated updates to community-images" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'community-images' 
    AND auth.uid() = owner
  );

CREATE POLICY "Allow authenticated deletes from community-images" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'community-images' 
    AND auth.uid() = owner
  );

-- 6. 권한 확인을 위한 뷰 생성
CREATE OR REPLACE VIEW storage.community_images_info AS
SELECT 
  id,
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects 
WHERE bucket_id = 'community-images';

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. Storage > Buckets에서 community-images 버킷 확인
-- 4. Storage > Policies에서 정책들이 생성되었는지 확인

-- =====================================================
-- 보안 정책 설명:
-- =====================================================
-- - 인증된 사용자만 파일 업로드 가능
-- - 모든 사용자가 파일 읽기 가능 (공개)
-- - 파일 소유자만 수정/삭제 가능
-- - 파일 크기 및 타입 제한으로 보안 강화

-- =====================================================
-- 앱 배포 시 고려사항:
-- =====================================================
-- - 사용자 인증이 제대로 작동하는지 확인
-- - 파일 업로드 권한 테스트
-- - 파일 읽기 권한 테스트
-- - 보안 정책이 의도한 대로 작동하는지 검증
