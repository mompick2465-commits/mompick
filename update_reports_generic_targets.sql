-- reports 테이블을 범용 타겟(게시글/리뷰/시설 등) 신고로 확장
-- 기존 컬럼(post_id, reporter_id 등)은 유지하며, 신규 타겟 구분 컬럼을 추가

-- 1) 신규 컬럼 추가
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS target_type VARCHAR(50),      -- 'community_post', 'kindergarten_review', 'facility' 등
  ADD COLUMN IF NOT EXISTS target_id UUID,               -- 리뷰/게시글 등 UUID 타겟 ID
  ADD COLUMN IF NOT EXISTS facility_type VARCHAR(50),    -- 'kindergarten' | 'childcare' | 'hospital' 등
  ADD COLUMN IF NOT EXISTS facility_code TEXT;           -- 외부 코드(예: 유치원 코드)

-- 2) 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_reports_target_type ON reports(target_type);
CREATE INDEX IF NOT EXISTS idx_reports_target_id ON reports(target_id);
CREATE INDEX IF NOT EXISTS idx_reports_facility_type ON reports(facility_type);
CREATE INDEX IF NOT EXISTS idx_reports_facility_code ON reports(facility_code);

-- 3) 중복 신고 방지 고유 제약(기존 post_id + reporter_id는 유지)
-- 리뷰/게시글 UUID 타겟 기준 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reports_user_target
  ON reports(reporter_id, target_type, target_id)
  WHERE target_id IS NOT NULL;

-- 시설 코드 기준 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reports_user_facility
  ON reports(reporter_id, facility_type, facility_code)
  WHERE facility_code IS NOT NULL;

-- 주의: RLS 정책은 기존과 동일하게 유지합니다.
-- reporter_id는 profiles(id)를 가리키므로, 클라이언트에서 profiles.id를 넣어야 합니다.


