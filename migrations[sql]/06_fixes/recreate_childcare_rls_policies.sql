-- =====================================================
-- 어린이집 커스텀 정보 및 급식 테이블 RLS 정책 재생성
-- =====================================================

-- 1. childcare_custom_info 테이블 정책 재생성
-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Anyone can view active childcare custom info" ON childcare_custom_info;
DROP POLICY IF EXISTS "Service role can manage childcare custom info" ON childcare_custom_info;

-- SELECT 전용 정책 생성 (모든 사용자가 읽기 가능)
CREATE POLICY "Anyone can view active childcare custom info" ON childcare_custom_info
  FOR SELECT
  USING (is_active = true);

-- 관리자 정책 생성 (INSERT, UPDATE, DELETE)
CREATE POLICY "Service role can insert childcare custom info" ON childcare_custom_info
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update childcare custom info" ON childcare_custom_info
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete childcare custom info" ON childcare_custom_info
  FOR DELETE
  USING (true);

-- 2. childcare_meals 테이블 정책 재생성
-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Anyone can view active childcare meals" ON childcare_meals;
DROP POLICY IF EXISTS "Service role can manage childcare meals" ON childcare_meals;

-- SELECT 전용 정책 생성 (모든 사용자가 읽기 가능)
CREATE POLICY "Anyone can view active childcare meals" ON childcare_meals
  FOR SELECT
  USING (is_active = true);

-- 관리자 정책 생성 (INSERT, UPDATE, DELETE)
CREATE POLICY "Service role can insert childcare meals" ON childcare_meals
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update childcare meals" ON childcare_meals
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete childcare meals" ON childcare_meals
  FOR DELETE
  USING (true);

-- 3. 정책 확인
-- 다음 쿼리로 정책이 올바르게 생성되었는지 확인:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('childcare_custom_info', 'childcare_meals');

