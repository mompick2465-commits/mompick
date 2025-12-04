ㅜㅜ-- 칭찬 사진 신고는 중복 허용하도록 UNIQUE 제약조건 수정
-- 칭찬글 신고는 중복 방지 유지, 칭찬 사진 신고는 중복 허용

-- 1) 기존 UNIQUE 인덱스 제거
DROP INDEX IF EXISTS uniq_reports_user_target;
DROP INDEX IF EXISTS uniq_reports_user_facility;

-- 2) 칭찬글 신고만 중복 방지하는 새로운 UNIQUE 인덱스 생성
-- (칭찬 사진 신고는 제외: target_type이 *_review_image로 끝나지 않는 경우만)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reports_user_target
  ON reports(reporter_id, target_type, target_id)
  WHERE target_id IS NOT NULL 
    AND target_type NOT LIKE '%_review_image'
    AND target_type != 'building_image';

-- 3) 칭찬글 신고 중복 방지 (리뷰 ID 기준)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reports_user_review
  ON reports(reporter_id, target_type, target_id)
  WHERE target_id IS NOT NULL 
    AND (target_type = 'kindergarten_review' 
         OR target_type = 'childcare_review' 
         OR target_type = 'playground_review');

-- 4) 시설 코드 기준 중복 방지 (칭찬 사진 신고 제외)
-- 건물사진 신고와 칭찬글 신고만 중복 방지, 칭찬 사진 신고는 중복 허용
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reports_user_facility
  ON reports(reporter_id, facility_type, facility_code)
  WHERE facility_code IS NOT NULL 
    AND target_type NOT LIKE '%_review_image'
    AND target_type != 'meal_image';

-- 참고:
-- - 칭찬 사진 신고 (*_review_image)는 중복 허용 (target_id 기준, facility_code 기준 모두)
-- - 급식 사진 신고 (meal_image)는 중복 허용 (facility_code 기준)
-- - 칭찬글 신고 (*_review)는 중복 방지 (target_id 기준)
-- - 건물사진 신고 (building_image)는 중복 허용 (시설 코드 기준으로는 중복 방지됨)

