-- reports 테이블 RLS 정책 정리 (유치원/어린이집 공통 사용)

-- RLS 활성화
ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거(존재 시)
DROP POLICY IF EXISTS "누구나 자신의 신고를 조회" ON public.reports;
DROP POLICY IF EXISTS "인증 사용자는 신고 생성 가능" ON public.reports;
DROP POLICY IF EXISTS "신고자만 신고 수정 삭제" ON public.reports;

-- 조회: 본인이 작성한 신고만 조회 가능 (관리자 정책은 별도 운영 시 추가)
CREATE POLICY "누구나 자신의 신고를 조회"
ON public.reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid() AND p.id = reports.reporter_id
  )
);

-- 생성: 현재 로그인한 사용자의 profiles.id가 reporter_id와 일치하는 경우에만 허용
CREATE POLICY "인증 사용자는 신고 생성 가능"
ON public.reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid() AND p.id = reports.reporter_id
  )
);

-- 수정/삭제: 신고자만 가능 (운영 정책에 따라 관리자 예외는 별도 추가)
CREATE POLICY "신고자만 신고 수정 삭제"
ON public.reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid() AND p.id = reports.reporter_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid() AND p.id = reports.reporter_id
  )
);

CREATE POLICY "신고자만 신고 삭제"
ON public.reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid() AND p.id = reports.reporter_id
  )
);


