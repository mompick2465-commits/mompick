-- =====================================================
-- profiles 테이블 auth_user_id 컬럼 추가 및 마이그레이션
-- =====================================================

-- 1. profiles 테이블에 auth_user_id 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. auth_user_id 컬럼에 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);

-- 3. 기존 profiles 데이터를 auth.users와 연결
-- 전화번호가 일치하는 사용자들을 찾아서 연결
UPDATE profiles 
SET auth_user_id = auth_users.id
FROM auth.users auth_users
WHERE profiles.phone = auth_users.phone 
  AND profiles.auth_user_id IS NULL
  AND auth_users.phone IS NOT NULL;

-- 4. auth_user_id가 NULL인 profiles 레코드 확인
-- 이는 전화번호가 auth.users에 없는 사용자들
SELECT 
  id, 
  phone, 
  full_name, 
  created_at,
  '전화번호가 auth.users에 없음' as status
FROM profiles 
WHERE auth_user_id IS NULL;

-- 5. RLS 정책 수정 - auth_user_id를 사용하도록 변경
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Allow users to read own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to create profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to delete own profile" ON profiles;

-- 새로운 정책 생성 (auth_user_id 사용)
CREATE POLICY "Allow users to read own profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Allow authenticated users to create profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Allow users to update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Allow users to delete own profile" ON profiles
  FOR DELETE 
  USING (auth.uid() = auth_user_id);

-- 6. community_posts 테이블의 RLS 정책도 수정
-- author_id가 profiles.id가 아닌 profiles.auth_user_id와 비교해야 함
DROP POLICY IF EXISTS "게시글 작성 정책" ON community_posts;
DROP POLICY IF EXISTS "게시글 수정/삭제 정책" ON community_posts;
DROP POLICY IF EXISTS "게시글 삭제 정책" ON community_posts;

-- 새로운 정책 생성
CREATE POLICY "게시글 작성 정책" ON community_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = community_posts.author_id 
      AND profiles.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "게시글 수정/삭제 정책" ON community_posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = community_posts.author_id 
      AND profiles.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "게시글 삭제 정책" ON community_posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = community_posts.author_id 
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- 7. profiles 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 8. 마이그레이션 결과 확인
SELECT 
  COUNT(*) as total_profiles,
  COUNT(auth_user_id) as connected_profiles,
  COUNT(*) - COUNT(auth_user_id) as unconnected_profiles
FROM profiles;

-- 9. 연결되지 않은 프로필 상세 정보
SELECT 
  id, 
  phone, 
  full_name, 
  created_at,
  '연결 필요' as status
FROM profiles 
WHERE auth_user_id IS NULL;

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. 마이그레이션 결과 확인
-- 4. 연결되지 않은 프로필이 있다면 수동으로 처리 필요

-- =====================================================
-- 주의사항:
-- =====================================================
-- - 이 스크립트는 기존 데이터를 변경합니다
-- - 실행 전 데이터 백업 권장
-- - 연결되지 않은 프로필이 있다면 수동으로 auth.users와 연결 필요
-- - 전화번호가 일치하지 않는 경우 별도 처리 필요
