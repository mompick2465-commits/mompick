-- profiles 테이블에 is_active 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 기존 사용자들은 모두 활성 상태로 설정
UPDATE profiles 
SET is_active = true 
WHERE is_active IS NULL;

-- is_active 컬럼에 NOT NULL 제약 추가
ALTER TABLE profiles 
ALTER COLUMN is_active SET NOT NULL;

-- is_active 컬럼에 기본값 설정
ALTER TABLE profiles 
ALTER COLUMN is_active SET DEFAULT true;

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

COMMENT ON COLUMN profiles.is_active IS '사용자 활성화 상태 (true: 활성, false: 비활성)';

