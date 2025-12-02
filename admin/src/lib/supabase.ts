import { createClient } from '@supabase/supabase-js'

// Next.js 환경변수 방식 사용 (두 가지 방식 모두 시도)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인해주세요.')
}

if (!supabaseServiceKey) {
  throw new Error('Supabase 서비스 키가 설정되지 않았습니다. SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.')
}

// 클라이언트 사이드용 Supabase 클라이언트
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 서버 사이드용 Supabase 클라이언트 (관리자 권한)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 타입 정의
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
    profile_image_url?: string
  }>
  school_name?: string
  subject?: string
  experience_years?: number
  created_at: string
  updated_at: string
}

export interface CommunityPost {
  id: string
  content: string
  location: string
  hashtags: string[]
  images: string[]
  emojis: string[]
  category: string
  author_id: string
  author_name: string
  likes_count: number
  comments_count: number
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  post_id: string
  reporter_id: string
  report_reason: string
  report_type: 'spam' | 'inappropriate' | 'harassment' | 'other'
  status: 'pending' | 'reviewed' | 'resolved'
  admin_notes?: string
  created_at: string
  updated_at: string
  // 조인된 데이터
  post?: CommunityPost
  reporter?: UserProfile
}

export interface ChildcareReview {
  id: string
  childcare_code: string
  user_id: string
  rating: number
  content: string
  helpful_count: number
  created_at: string
  updated_at: string
  is_deleted: boolean
  childcare_name?: string
  // 조인된 데이터
  user?: UserProfile
}

