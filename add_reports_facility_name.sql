-- reports 테이블에 시설 명칭 저장을 위한 컬럼 추가
ALTER TABLE IF EXISTS public.reports
ADD COLUMN IF NOT EXISTS facility_name text;

-- 참고: 기존 RLS 정책은 reporter_id 검증만 수행하므로 별도 변경 불필요

