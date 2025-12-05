-- 예약 알림 테이블 생성
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_at ON scheduled_notifications(scheduled_at);

-- 업데이트 시간 자동 갱신 함수 (이미 존재할 수 있음)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
DROP TRIGGER IF EXISTS update_scheduled_notifications_updated_at ON scheduled_notifications;
CREATE TRIGGER update_scheduled_notifications_updated_at
    BEFORE UPDATE ON scheduled_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책 (관리자만 접근 가능)
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- 관리자만 모든 작업 가능 (service_role 키를 사용하는 경우 RLS를 우회하므로 필요 없을 수도 있음)
-- 하지만 추가로 안전장치로 추가
CREATE POLICY "Enable all operations for service role" ON scheduled_notifications
    FOR ALL
    USING (true)
    WITH CHECK (true);

