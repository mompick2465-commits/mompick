import { useEffect, useState } from 'react'
import { ChevronLeft, Bell, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { 
  getNotificationSettings, 
  saveNotificationSettings, 
  getCurrentUserProfileId,
  type NotificationSettings as NotificationSettingsType
} from '../utils/notificationSettings'

type NotificationCategoryKey = 'notice' | 'post' | 'comment' | 'reply' | 'review'

const DEFAULT_SETTINGS: NotificationSettingsType = {
  notice: true,
  post: true,
  comment: true,
  reply: true,
  review: true
}

const NotificationSettings = () => {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<NotificationSettingsType>(DEFAULT_SETTINGS)
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 서버에서 알림 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        const userId = await getCurrentUserProfileId()
        
        if (!userId) {
          console.log('로그인되지 않은 사용자입니다.')
          setInitialized(true)
          return
        }

        const serverSettings = await getNotificationSettings(userId)
        setSettings(serverSettings)
      } catch (e) {
        console.error('알림 설정 로드 오류:', e)
        setError('알림 설정을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
        setInitialized(true)
      }
    }

    loadSettings()
  }, [])

  // 설정 변경 시 서버에 저장
  useEffect(() => {
    if (!initialized || loading) return

    const saveSettings = async () => {
      try {
        setSaving(true)
        const userId = await getCurrentUserProfileId()
        
        if (!userId) {
          console.log('로그인되지 않은 사용자입니다.')
          return
        }

        const success = await saveNotificationSettings(userId, settings)
        if (!success) {
          setError('알림 설정 저장에 실패했습니다.')
        } else {
          setError(null)
        }
      } catch (e) {
        console.error('알림 설정 저장 오류:', e)
        setError('알림 설정 저장 중 오류가 발생했습니다.')
      } finally {
        setSaving(false)
      }
    }

    // 디바운싱: 500ms 후 저장
    const timeoutId = setTimeout(() => {
      saveSettings()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [settings, initialized, loading])

  const toggleAll = (value: boolean) => {
    setSettings({
      notice: value,
      post: value,
      comment: value,
      reply: value,
      review: value
    })
  }

  const toggle = (key: NotificationCategoryKey) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const items: Array<{ key: NotificationCategoryKey; title: string; desc: string }> = [
    { key: 'notice', title: '공지사항', desc: '서비스 공지 및 중요 알림 수신' },
    { key: 'post', title: '게시글', desc: '내 게시글 관련 활동 알림' },
    { key: 'comment', title: '댓글', desc: '내 게시글에 달린 댓글 알림' },
    { key: 'reply', title: '답글', desc: '내 댓글에 달린 답글 알림' },
    { key: 'review', title: '칭찬', desc: '칭찬 관련 활동 알림' }
  ]

  const allOn = items.every(i => settings[i.key])
  const allOff = items.every(i => !settings[i.key])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">알림 설정</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleAll(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[#fb8678]/10 text-[#fb8678] hover:bg-[#fb8678]/20 transition-colors"
                disabled={allOn}
              >
                전체 켜기
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                disabled={allOff}
              >
                전체 끄기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-4 space-y-3">
        {/* 안내 카드 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-[#fb8678] rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-800 font-semibold">수신할 알림 유형을 선택하세요</p>
              <p className="text-xs text-gray-500 mt-1">
                {saving ? '저장 중...' : '설정은 서버에 저장되어 모든 기기에서 동기화됩니다.'}
              </p>
              {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
              )}
            </div>
          </div>
        </div>

        {/* 토글 리스트 */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-500">알림 설정을 불러오는 중...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
            {items.map(item => (
              <div key={item.key} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggle(item.key)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[item.key] ? 'bg-[#fb8678]' : 'bg-gray-300'} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-pressed={settings[item.key]}
                  aria-label={`${item.title} 알림 ${settings[item.key] ? '켜짐' : '꺼짐'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings[item.key] ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationSettings


