-- 프로필 신고는 중복 허용하도록 UNIQUE 제약조건 수정
-- 게시글 신고는 중복 방지 유지, 프로필 신고는 중복 허용

-- 1) 기존 UNIQUE 제약조건 제거
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_post_id_reporter_id_key;

-- 2) 기존 UNIQUE 인덱스 제거 (프로필 신고 및 댓글 신고 제외를 위해 재생성 필요)
DROP INDEX IF EXISTS uniq_reports_post_reporter;
DROP INDEX IF EXISTS uniq_reports_user_target;
DROP INDEX IF EXISTS uniq_reports_user_facility;

-- 3) 게시글 신고만 중복 방지하는 조건부 UNIQUE 인덱스 생성
-- (프로필 신고 및 댓글 신고는 제외: target_type이 'profile' 또는 'comment'가 아닌 경우만)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reports_post_reporter
  ON reports(post_id, reporter_id)
  WHERE post_id IS NOT NULL 
    AND (target_type IS NULL OR (target_type != 'profile' AND target_type != 'comment'));

-- 4) 타겟 기반 신고 중복 방지 (프로필 신고 및 댓글 신고 제외)
-- target_type이 'profile' 또는 'comment'가 아닌 경우만 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reports_user_target
  ON reports(reporter_id, target_type, target_id)
  WHERE target_id IS NOT NULL 
    AND target_type != 'profile'
    AND target_type != 'comment'
    AND target_type NOT LIKE '%_review_image'
    AND target_type != 'building_image'
    AND target_type != 'meal_image';

-- 5) 시설 코드 기준 중복 방지 (프로필 신고 제외)
-- target_type이 'profile'이 아닌 경우만 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reports_user_facility
  ON reports(reporter_id, facility_type, facility_code)
  WHERE facility_code IS NOT NULL 
    AND target_type != 'profile'
    AND target_type NOT LIKE '%_review_image'
    AND target_type != 'meal_image';

-- 참고:
-- - 프로필 신고 (target_type = 'profile')는 중복 허용 (모든 UNIQUE 인덱스에서 제외)
-- - 댓글 신고 (target_type = 'comment')는 중복 허용 (모든 UNIQUE 인덱스에서 제외)
-- - 게시글 신고 (target_type IS NULL 또는 다른 값)는 중복 방지
-- - 칭찬 사진 신고 (*_review_image)는 중복 허용
-- - 급식 사진 신고 (meal_image)는 중복 허용
-- - 건물사진 신고 (building_image)는 중복 허용

