-- =====================================================
-- 어린이집 이미지 스토리지 버킷 생성 및 정책 설정
-- =====================================================

-- 1. childcare-images 버킷 생성
-- Supabase 대시보드 > Storage에서 수동으로 버킷 생성:
-- - Bucket name: childcare-images
-- - Public bucket: true (체크)
-- - Allowed MIME types: image/* (또는 비워둠)
-- - File size limit: 50MB

-- 또는 SQL로 버킷 생성 (Supabase CLI 필요)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'childcare-images',
  'childcare-images', 
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. 스토리지 정책 설정

-- 모든 사용자가 이미지를 읽을 수 있도록 (공개)
CREATE POLICY "Public Access for childcare images"
ON storage.objects FOR SELECT
USING (bucket_id = 'childcare-images');

-- 인증된 사용자와 서비스 역할이 이미지를 업로드할 수 있도록
CREATE POLICY "Authenticated users can upload childcare images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'childcare-images' 
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- 인증된 사용자와 서비스 역할이 이미지를 업데이트할 수 있도록
CREATE POLICY "Authenticated users can update childcare images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'childcare-images'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
)
WITH CHECK (
  bucket_id = 'childcare-images'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- 인증된 사용자와 서비스 역할이 이미지를 삭제할 수 있도록
CREATE POLICY "Authenticated users can delete childcare images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'childcare-images'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- =====================================================
-- 폴더 구조 설명
-- =====================================================
-- childcare-images/
--   └── {childcare_code}/          예: 11260000447/
--       ├── building/               건물 사진
--       │   ├── 1234567890.jpg
--       │   ├── 1234567891.jpg
--       │   └── ...
--       └── meal/                   급식 사진
--           ├── 1234567892.jpg
--           ├── 1234567893.jpg
--           └── ...
-- =====================================================

-- 참고: 
-- 1. 이미지 URL 예시: 
--    https://{project_ref}.supabase.co/storage/v1/object/public/childcare-images/11260000447/building/1234567890.jpg
--
-- 2. 관리자 페이지에서 업로드 시:
--    - Service Role Key 사용하여 인증 우회
--    - 파일명은 타임스탬프 사용 (한글 제거)
--    - childcare_custom_info 테이블에 URL 배열로 저장
--
-- 3. 앱에서 이미지 조회 시:
--    - 공개 버킷이므로 인증 없이 접근 가능
--    - childcare_custom_info 테이블에서 URL 배열 가져오기

