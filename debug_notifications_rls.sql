-- notifications 테이블 RLS 정책 디버깅

-- 1. 현재 사용자 정보 확인
SELECT 
  auth.uid() as current_auth_uid,
  (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) as current_profile_id,
  (SELECT full_name FROM profiles WHERE auth_user_id = auth.uid()) as current_user_name;

-- 2. 특정 Profile ID가 현재 사용자의 것인지 확인
-- (실제 Profile ID로 테스트)
SELECT 
  'a8c55fce-8a43-4f48-aef0-99fc816e3101' as test_profile_id,
  (SELECT auth_user_id FROM profiles WHERE id = 'a8c55fce-8a43-4f48-aef0-99fc816e3101') as profile_auth_uid,
  auth.uid() as current_auth_uid,
  CASE 
    WHEN (SELECT auth_user_id FROM profiles WHERE id = 'a8c55fce-8a43-4f48-aef0-99fc816e3101') = auth.uid() 
    THEN '일치함' 
    ELSE '불일치함' 
  END as match_result;

-- 3. RLS 정책 테스트
-- INSERT 정책이 올바르게 작동하는지 확인
SELECT 
  'a8c55fce-8a43-4f48-aef0-99fc816e3101' IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  ) as insert_policy_check;

-- 4. 현재 RLS 정책 확인
SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
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
WHERE tablename = 'notifications';
