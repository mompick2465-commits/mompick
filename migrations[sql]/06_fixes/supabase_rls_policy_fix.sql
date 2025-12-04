-- 전화번호 가입 사용자들을 위한 RLS 정책 수정
-- 이 스크립트는 comments 테이블의 RLS 정책을 수정하여 전화번호 가입 사용자들도 댓글을 수정할 수 있도록 합니다.

-- =====================================================
-- 1. 기존 RLS 정책 확인 및 삭제
-- =====================================================

-- comments 테이블의 기존 RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'comments';

-- 기존 UPDATE 정책 삭제 (필요한 경우)
-- DROP POLICY IF EXISTS "Users can update own comments" ON comments;

-- =====================================================
-- 2. 새로운 RLS 정책 생성
-- =====================================================

-- 댓글 수정 정책 (자신이 작성한 댓글만 수정 가능)
CREATE POLICY "Users can update own comments" ON comments
FOR UPDATE USING (
  -- Supabase Auth 사용자 (OAuth)
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- 전화번호 가입 사용자 (localStorage 기반)
  (auth.uid() IS NULL AND user_id IN (
    SELECT id::uuid FROM profiles 
    WHERE id IN (
      SELECT DISTINCT unnest(
        ARRAY(
          SELECT jsonb_array_elements_text(
            COALESCE(
              (SELECT value FROM localStorage WHERE key = 'userProfile'),
              '[]'::jsonb
            )
          )
        )
      )
    )
  ))
);

-- 댓글 삭제 정책 (자신이 작성한 댓글만 삭제 가능)
CREATE POLICY "Users can delete own comments" ON comments
FOR DELETE USING (
  -- Supabase Auth 사용자 (OAuth)
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- 전화번호 가입 사용자 (localStorage 기반)
  (auth.uid() IS NULL AND user_id IN (
    SELECT id::uuid FROM profiles 
    WHERE id IN (
      SELECT DISTINCT unnest(
        ARRAY(
          SELECT jsonb_array_elements_text(
            COALESCE(
              (SELECT value FROM localStorage WHERE key = 'userProfile'),
              '[]'::jsonb
            )
          )
        )
      )
    )
  ))
);

-- 댓글 조회 정책 (모든 사용자가 모든 댓글 조회 가능)
CREATE POLICY "Anyone can view comments" ON comments
FOR SELECT USING (true);

-- 댓글 작성 정책 (로그인한 사용자만 댓글 작성 가능)
CREATE POLICY "Authenticated users can insert comments" ON comments
FOR INSERT WITH CHECK (
  -- Supabase Auth 사용자 (OAuth)
  (auth.uid() IS NOT NULL)
  OR
  -- 전화번호 가입 사용자 (localStorage 기반)
  (auth.uid() IS NULL AND user_id IS NOT NULL)
);

-- =====================================================
-- 3. 대안: 간단한 RLS 정책 (권장)
-- =====================================================

-- 위의 복잡한 정책 대신, 더 간단한 정책을 사용할 수 있습니다:

-- 기존 정책 삭제
-- DROP POLICY IF EXISTS "Users can update own comments" ON comments;
-- DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
-- DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
-- DROP POLICY IF EXISTS "Authenticated users can insert comments" ON comments;

-- 간단한 정책 생성 (개발/테스트용)
-- CREATE POLICY "Enable all operations for authenticated users" ON comments
-- FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 4. RLS 활성화 확인
-- =====================================================

-- comments 테이블에 RLS가 활성화되어 있는지 확인
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'comments';

-- RLS가 비활성화되어 있다면 활성화
-- ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. Database > Tables > comments > Policies에서 정책 확인
-- 4. 필요에 따라 간단한 정책 사용 (4번 섹션)

-- =====================================================
-- 주의사항:
-- =====================================================
-- - 복잡한 정책은 성능에 영향을 줄 수 있습니다
-- - 개발/테스트 단계에서는 간단한 정책을 사용하는 것이 좋습니다
-- - 프로덕션에서는 보안을 위해 적절한 정책을 설정해야 합니다
