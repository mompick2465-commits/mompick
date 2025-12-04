-- notifications 테이블 생성
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('like', 'reply')),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  from_user_name TEXT NOT NULL,
  from_user_profile_image TEXT,
  user_id UUID NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON notifications(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON notifications(from_user_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

-- RLS 정책 생성
-- 사용자는 자신의 알림만 볼 수 있음
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid() OR user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- 사용자는 자신의 알림만 업데이트할 수 있음 (읽음 처리)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid() OR user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- 사용자는 다른 사용자에게 알림을 생성할 수 있음 (from_user_id가 현재 사용자의 profile id와 일치해야 함)
CREATE POLICY "Users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (from_user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- 함수 생성: 알림 생성 시 자동으로 타임스탬프 설정
CREATE OR REPLACE FUNCTION update_notification_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_update_notification_created_at
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_created_at();
