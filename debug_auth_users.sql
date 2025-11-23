-- =====================================================
-- auth.users와 profiles 테이블 연결 문제 진단
-- =====================================================

-- 1. auth.users 테이블의 phone 컬럼 확인
SELECT 
  id,
  email,
  phone,
  created_at,
  'auth.users' as source
FROM auth.users 
WHERE phone IS NOT NULL
ORDER BY created_at DESC;

-- 2. profiles 테이블의 phone 컬럼 확인
SELECT 
  id,
  phone,
  full_name,
  created_at,
  'profiles' as source
FROM profiles 
ORDER BY created_at DESC;

-- 3. phone 형식 비교 (공백, 하이픈, 괄호 등 제거)
SELECT 
  'auth.users' as source,
  COUNT(*) as total_count,
  COUNT(phone) as phone_count,
  COUNT(CASE WHEN phone ~ '^[0-9]+$' THEN 1 END) as numeric_only,
  COUNT(CASE WHEN phone ~ '[^0-9]' THEN 1 END) as has_special_chars
FROM auth.users;

SELECT 
  'profiles' as source,
  COUNT(*) as total_count,
  COUNT(phone) as phone_count,
  COUNT(CASE WHEN phone ~ '^[0-9]+$' THEN 1 END) as numeric_only,
  COUNT(CASE WHEN phone ~ '[^0-9]' THEN 1 END) as has_special_chars
FROM profiles;

-- 4. 전화번호 형식 정규화 후 연결 시도
-- 공백, 하이픈, 괄호 등을 제거하고 숫자만 남김
UPDATE profiles 
SET auth_user_id = auth_users.id
FROM auth.users auth_users
WHERE REGEXP_REPLACE(profiles.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(auth_users.phone, '[^0-9]', '', 'g')
  AND profiles.auth_user_id IS NULL
  AND auth_users.phone IS NOT NULL;

-- 5. 연결 결과 확인
SELECT 
  COUNT(*) as total_profiles,
  COUNT(auth_user_id) as connected_profiles,
  COUNT(*) - COUNT(auth_user_id) as unconnected_profiles
FROM profiles;

-- 6. 연결되지 않은 프로필 상세 정보
SELECT 
  id, 
  phone, 
  full_name, 
  created_at,
  '연결 필요' as status
FROM profiles 
WHERE auth_user_id IS NULL;

-- 7. auth.users에서 전화번호가 있는 사용자들
SELECT 
  id,
  email,
  phone,
  created_at
FROM auth.users 
WHERE phone IS NOT NULL
ORDER BY created_at DESC;
