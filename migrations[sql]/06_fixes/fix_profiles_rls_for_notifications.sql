-- profiles 테이블 RLS 정책 수정 (알림 기능 지원)

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Allow users to read own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to create profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to delete own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;

-- 2. RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. 새로운 RLS 정책 생성

-- SELECT 정책 (자신의 프로필 + 다른 사용자의 기본 정보 읽기 가능)
CREATE POLICY "Allow users to read profiles for notifications" ON profiles
  FOR SELECT 
  USING (
    auth_user_id = auth.uid() OR  -- 자신의 프로필
    auth.role() = 'authenticated'  -- 인증된 사용자는 다른 사용자의 기본 정보 읽기 가능
  );

-- INSERT 정책 (인증된 사용자만 프로필 생성 가능)
CREATE POLICY "Allow authenticated users to create profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth_user_id = auth.uid());

-- UPDATE 정책 (자신의 프로필만 수정 가능)
CREATE POLICY "Allow users to update own profile" ON profiles
  FOR UPDATE 
  USING (auth_user_id = auth.uid());

-- DELETE 정책 (자신의 프로필만 삭제 가능)
CREATE POLICY "Allow users to delete own profile" ON profiles
  FOR DELETE 
  USING (auth_user_id = auth.uid());

-- 4. 정책 확인
SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 5. RLS 상태 확인
SELECT 
  schemaname, 
  tablename, 
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '활성화됨'
    ELSE '비활성화됨'
  END as rls_status
FROM pg_tables 
WHERE tablename = 'profiles';
