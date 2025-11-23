-- notifications 테이블 현재 상태 확인

-- 1) 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2) CHECK 제약조건 확인
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%notifications%type%';

-- 3) 현재 알림 데이터 확인
SELECT 
  type,
  COUNT(*) as count
FROM public.notifications 
GROUP BY type
ORDER BY type;

-- 4) RLS 정책 확인
SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;
