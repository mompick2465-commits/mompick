-- 커뮤니티 게시글 테이블 생성
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  location VARCHAR(100) NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  emojis TEXT[] DEFAULT '{}',
  category VARCHAR(100) NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name VARCHAR(100) NOT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);

-- 커뮤니티 이미지 스토리지 버킷 생성 (Supabase 대시보드에서 수동으로 생성 필요)
-- Storage > New Bucket > Name: community-images, Public: true

-- RLS (Row Level Security) 정책 설정
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 게시글을 읽을 수 있도록 정책 생성
CREATE POLICY "게시글 읽기 정책" ON community_posts
  FOR SELECT USING (true);

-- 인증된 사용자만 게시글을 작성할 수 있도록 정책 생성
CREATE POLICY "게시글 작성 정책" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 작성자만 게시글을 수정/삭제할 수 있도록 정책 생성
CREATE POLICY "게시글 수정/삭제 정책" ON community_posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "게시글 삭제 정책" ON community_posts
  FOR DELETE USING (auth.uid() = author_id);

-- 업데이트 시 updated_at 자동 갱신을 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
-- Supabase Database: profiles 테이블 RLS 정책 설정
-- =====================================================

-- 1. profiles 테이블에 대한 RLS 정책 설정

-- SELECT 정책 (자신의 프로필만 읽기 가능)
CREATE POLICY "Allow users to read own profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- INSERT 정책 (인증된 사용자만 프로필 생성 가능)
CREATE POLICY "Allow authenticated users to create profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- UPDATE 정책 (자신의 프로필만 수정 가능)
CREATE POLICY "Allow users to update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id);

-- DELETE 정책 (자신의 프로필만 삭제 가능)
CREATE POLICY "Allow users to delete own profile" ON profiles
  FOR DELETE 
  USING (auth.uid() = id);

-- 2. 기존 정책이 있다면 삭제 (중복 방지)
DROP POLICY IF EXISTS "Allow users to read own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to create profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to delete own profile" ON profiles;

-- 3. 정책 재생성
CREATE POLICY "Allow users to read own profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to create profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Allow users to delete own profile" ON profiles
  FOR DELETE 
  USING (auth.uid() = id);

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. Storage > Buckets에서 community-images 버킷 확인
-- 4. Storage > Policies에서 정책들이 생성되었는지 확인
-- 5. Database > Tables > profiles > Policies에서 정책들이 생성되었는지 확인

-- =====================================================
-- 보안 정책 설명:
-- =====================================================
-- Storage:
-- - 인증된 사용자만 파일 업로드 가능
-- - 모든 사용자가 파일 읽기 가능 (공개)
-- - 파일 소유자만 수정/삭제 가능
-- - 파일 크기 및 타입 제한으로 보안 강화

-- Profiles:
-- - 사용자는 자신의 프로필만 읽기/수정/삭제 가능
-- - 인증된 사용자만 프로필 생성 가능
-- - 다른 사용자의 프로필 정보 접근 불가

-- =====================================================
-- 앱 배포 시 고려사항:
-- =====================================================
-- - 사용자 인증이 제대로 작동하는지 확인
-- - 파일 업로드 권한 테스트
-- - 파일 읽기 권한 테스트
-- - 프로필 정보 접근 권한 테스트
-- - 보안 정책이 의도한 대로 작동하는지 검증
