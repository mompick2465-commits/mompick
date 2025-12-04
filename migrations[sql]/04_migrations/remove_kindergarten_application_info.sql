-- kindergarten_custom_info 테이블에서 간편신청 관련 컬럼 제거

-- 1. monthly_fee 컬럼 삭제
ALTER TABLE kindergarten_custom_info
DROP COLUMN IF EXISTS monthly_fee;

-- 2. available_slots 컬럼 삭제
ALTER TABLE kindergarten_custom_info
DROP COLUMN IF EXISTS available_slots;

-- 3. application_note 컬럼 삭제
ALTER TABLE kindergarten_custom_info
DROP COLUMN IF EXISTS application_note;



