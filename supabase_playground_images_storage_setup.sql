-- =====================================================
-- Supabase Storage: playground-images 버킷 설정
-- =====================================================
-- 놀이시설 건물 사진 업로드를 위한 Storage 버킷 정책 설정
--
-- ⚠️ 중요: 버킷은 Supabase 대시보드에서 수동으로 생성해야 합니다!
-- 1. Supabase 대시보드 > Storage > New Bucket
-- 2. Name: playground-images
-- 3. Public bucket: 체크 (공개)
-- 4. File size limit: 100MB (선택사항)
-- 5. Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, image/heic (선택사항)
-- 6. 생성 후 아래 SQL 스크립트를 실행하여 RLS 정책을 설정하세요.

-- 1. 기존 정책이 있다면 삭제 (중복 방지)
DROP POLICY IF EXISTS "Allow authenticated uploads to playground-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from playground-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to playground-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from playground-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role uploads to playground-images" ON storage.objects;

-- 3. Storage 버킷에 대한 RLS 정책 설정

-- INSERT 정책 (인증된 사용자 및 서비스 역할 업로드 허용)
-- 관리자 페이지에서 업로드하므로 서비스 역할도 허용
CREATE POLICY "Allow authenticated uploads to playground-images" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'playground-images' 
    AND (
      auth.role() = 'authenticated' 
      OR auth.role() = 'service_role'
    )
  );

-- 서비스 역할 업로드 정책 (관리자 페이지용)
CREATE POLICY "Allow service role uploads to playground-images" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'playground-images' 
    AND auth.role() = 'service_role'
  );

-- SELECT 정책 (파일 읽기 허용 - 공개)
CREATE POLICY "Allow public reads from playground-images" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'playground-images'
  );

-- UPDATE 정책 (파일 수정 허용 - 업로드한 사용자 또는 서비스 역할)
CREATE POLICY "Allow authenticated updates to playground-images" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'playground-images' 
    AND (
      auth.uid() = owner 
      OR auth.role() = 'service_role'
    )
  );

-- DELETE 정책 (파일 삭제 허용 - 업로드한 사용자 또는 서비스 역할)
CREATE POLICY "Allow authenticated deletes from playground-images" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'playground-images' 
    AND (
      auth.uid() = owner 
      OR auth.role() = 'service_role'
    )
  );

-- 4. 뷰 생성은 권한 문제로 인해 제외 (필요시 대시보드에서 확인)

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드 > Storage > New Bucket에서 버킷 생성
--    - Name: playground-images
--    - Public bucket: 체크
--    - File size limit: 100MB (선택사항)
-- 2. 버킷 생성 후 Supabase 대시보드에서 SQL Editor 열기
-- 3. 위 스크립트 복사하여 실행 (RLS 정책 설정)
-- 4. Storage > Buckets에서 playground-images 버킷 확인
-- 5. Storage > Policies에서 정책들이 생성되었는지 확인
-- 6. 관리자 페이지에서 놀이시설 건물 사진 업로드 테스트

-- =====================================================
-- 보안 정책 설명:
-- =====================================================
-- - 인증된 사용자 및 서비스 역할(관리자)만 파일 업로드 가능
-- - 모든 사용자가 파일 읽기 가능 (공개)
-- - 파일 소유자 또는 서비스 역할만 수정/삭제 가능
-- - 파일 크기 및 타입 제한으로 보안 강화
-- - 관리자 페이지에서 업로드할 수 있도록 서비스 역할 허용

-- =====================================================
-- 디렉토리 구조:
-- =====================================================
-- playground-images/
--   └── {playgroundId}/
--       └── building/
--           └── {timestamp}.{extension}

-- =====================================================
-- 앱 배포 시 고려사항:
-- =====================================================
-- - 관리자 페이지에서 파일 업로드 권한 테스트
-- - 파일 읽기 권한 테스트 (공개 접근)
-- - 보안 정책이 의도한 대로 작동하는지 검증
-- - 파일 크기 제한이 적절한지 확인

