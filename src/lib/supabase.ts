import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://dummy-project.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'dummy-anon-key-for-development'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 프로필 이미지 업로드 함수
export const uploadProfileImage = async (file: File, userId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('profile-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
  }

  // 업로드된 이미지의 공개 URL 반환
  const { data: { publicUrl } } = supabase.storage
    .from('profile-images')
    .getPublicUrl(filePath)

  return publicUrl
}

// 프로필 이미지 삭제 함수
export const deleteProfileImage = async (userId: string, fileName: string): Promise<void> => {
  const filePath = `${userId}/${fileName}`
  
  const { error } = await supabase.storage
    .from('profile-images')
    .remove([filePath])

  if (error) {
    throw new Error(`이미지 삭제 실패: ${error.message}`)
  }
}

// 사용자 타입 정의
export interface UserProfile {
  id: string
  email?: string
  phone?: string
  user_type: 'parent' | 'teacher'
  full_name: string
  auth_method: 'kakao' | 'google' | 'apple' | 'phone'
  nickname?: string
  profile_image_url?: string
  children_info?: Array<{
    name: string
    gender: string
    birth_date: string
    relationship: string
  }>
  school_name?: string
  subject?: string
  experience_years?: number
  // introduction?: string  // TODO: 데이터베이스에 introduction 컬럼 추가 후 활성화
  created_at: string
  updated_at: string
}

// 인증 관련 타입
export interface AuthState {
  user: any | null
  session: any | null
  loading: boolean
}

