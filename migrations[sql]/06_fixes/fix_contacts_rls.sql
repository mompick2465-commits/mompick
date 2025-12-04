-- contacts 테이블 RLS 정책 수정
-- user_id는 profiles.id를 참조하므로, profiles 테이블을 조인해서 auth_user_id와 비교해야 함

-- 기존 정책 삭제
DROP POLICY IF EXISTS "사용자는 자신의 문의사항 조회 가능" ON contacts;
DROP POLICY IF EXISTS "사용자는 자신의 문의사항 수정 가능" ON contacts;

-- 수정된 SELECT 정책 생성 (profiles 테이블 조인 사용)
CREATE POLICY "사용자는 자신의 문의사항 조회 가능" ON contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = contacts.user_id 
      AND profiles.auth_user_id = auth.uid()
    ) OR contacts.user_id IS NULL
  );

-- 수정된 UPDATE 정책 생성 (profiles 테이블 조인 사용)
CREATE POLICY "사용자는 자신의 문의사항 수정 가능" ON contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = contacts.user_id 
      AND profiles.auth_user_id = auth.uid()
    ) AND contacts.status = 'pending'
  );

-- 정책 확인
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
WHERE tablename = 'contacts'
ORDER BY policyname;

