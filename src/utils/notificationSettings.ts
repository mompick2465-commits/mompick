import { supabase } from '../lib/supabase'

export interface NotificationSettings {
  notice: boolean
  post: boolean
  comment: boolean
  reply: boolean
  review: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  notice: true,
  post: true,
  comment: true,
  reply: true,
  review: true
}

/**
 * 현재 사용자의 알림 설정 가져오기
 */
export const getNotificationSettings = async (userId: string): Promise<NotificationSettings> => {
  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('notice, post, comment, reply, review')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('알림 설정 조회 오류:', error)
      return DEFAULT_SETTINGS
    }

    if (!data) {
      // 설정이 없으면 기본값으로 생성
      return await createDefaultSettings(userId)
    }

    return data as NotificationSettings
  } catch (error) {
    console.error('알림 설정 조회 중 오류:', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * 기본 알림 설정 생성
 */
const createDefaultSettings = async (userId: string): Promise<NotificationSettings> => {
  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .insert({
        user_id: userId,
        ...DEFAULT_SETTINGS
      })
      .select('notice, post, comment, reply, review')
      .single()

    if (error) {
      console.error('알림 설정 생성 오류:', error)
      return DEFAULT_SETTINGS
    }

    return data as NotificationSettings
  } catch (error) {
    console.error('알림 설정 생성 중 오류:', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * 알림 설정 저장
 */
export const saveNotificationSettings = async (
  userId: string,
  settings: NotificationSettings
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: userId,
        ...settings
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('알림 설정 저장 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('알림 설정 저장 중 오류:', error)
    return false
  }
}

/**
 * 알림 타입에 따라 설정 확인
 * @param userId 사용자 ID
 * @param notificationType 알림 타입 ('like', 'comment', 'reply', 'review_like', 'notice')
 * @returns 알림을 받을 수 있는지 여부
 */
export const canReceiveNotification = async (
  userId: string,
  notificationType: 'like' | 'comment' | 'reply' | 'review_like' | 'notice'
): Promise<boolean> => {
  try {
    const settings = await getNotificationSettings(userId)

    switch (notificationType) {
      case 'notice':
        return settings.notice
      case 'like':
        return settings.post
      case 'comment':
        return settings.comment
      case 'reply':
        return settings.reply
      case 'review_like':
        return settings.review
      default:
        return true // 알 수 없는 타입은 기본적으로 허용
    }
  } catch (error) {
    console.error('알림 설정 확인 중 오류:', error)
    return true // 오류 시 기본적으로 허용
  }
}

/**
 * 현재 사용자의 프로필 ID 가져오기
 */
export const getCurrentUserProfileId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // OAuth 사용자
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      
      return profile?.id || null
    } else {
      // 전화번호 가입 사용자
      const isLoggedIn = localStorage.getItem('isLoggedIn')
      const userProfile = localStorage.getItem('userProfile')
      
      if (isLoggedIn === 'true' && userProfile) {
        const profile = JSON.parse(userProfile)
        return profile.id || null
      }
    }
    
    return null
  } catch (error) {
    console.error('사용자 프로필 ID 조회 오류:', error)
    return null
  }
}

