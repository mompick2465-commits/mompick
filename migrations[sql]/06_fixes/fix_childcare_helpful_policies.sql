-- 어린이집 리뷰 도움됨(childcare_review_helpful) RLS 정책을
-- 유치원(kindergarten_review_helpful)과 동일한 프로필 ID 기준으로 정렬합니다.

-- 참고: 애플리케이션은 childcare_review_helpful.user_id에 profiles.id를 저장합니다.
-- 따라서 RLS도 profiles.id 기준으로 auth.uid()를 매핑해 검증해야 합니다.

-- 안전을 위해 테이블 존재 및 RLS 활성화 보장
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'childcare_review_helpful'
  ) THEN
    RAISE NOTICE 'Table public.childcare_review_helpful does not exist. Skipping.';
    RETURN;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.childcare_review_helpful ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거 (있을 경우)
DROP POLICY IF EXISTS "모든 사용자는 어린이집 도움됨 정보를 조회할 수 있습니다" ON public.childcare_review_helpful;
DROP POLICY IF EXISTS "인증된 사용자는 어린이집 도움됨을 추가할 수 있습니다" ON public.childcare_review_helpful;
DROP POLICY IF EXISTS "사용자는 자신의 어린이집 도움됨만 삭제할 수 있습니다" ON public.childcare_review_helpful;

-- 조회: 모두 허용
CREATE POLICY "모든 사용자는 어린이집 도움됨 정보를 조회할 수 있습니다"
ON public.childcare_review_helpful
FOR SELECT
USING (true);

-- 추가: 현재 사용자의 profiles.id와 레코드의 user_id가 일치할 때만 허용
CREATE POLICY "인증된 사용자는 어린이집 도움됨을 추가할 수 있습니다"
ON public.childcare_review_helpful
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid() AND p.id = childcare_review_helpful.user_id
  )
);

-- 삭제: 현재 사용자의 profiles.id와 레코드의 user_id가 일치할 때만 허용
CREATE POLICY "사용자는 자신의 어린이집 도움됨만 삭제할 수 있습니다"
ON public.childcare_review_helpful
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid() AND p.id = childcare_review_helpful.user_id
  )
);

-- 참고: helpful_count는 트리거 update_childcare_review_helpful_count_trigger에서 관리됩니다.

