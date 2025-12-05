import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Supabase 환경변수가 설정되지 않았습니다.'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 최근 7일 계산
    const today = new Date()
    today.setHours(23, 59, 59, 999) // 오늘 마지막 시간
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6) // 최근 7일 (오늘 포함)
    sevenDaysAgo.setHours(0, 0, 0, 0) // 7일 전 시작 시간

    const sevenDaysAgoISO = sevenDaysAgo.toISOString()
    const todayISO = today.toISOString()

    // 최근 7일간의 모든 칭찬 가져오기
    const [playgroundReviews, kindergartenReviews, childcareReviews] = await Promise.all([
      // 놀이시설 칭찬
      supabase
        .from('playground_reviews')
        .select('created_at')
        .eq('is_deleted', false)
        .gte('created_at', sevenDaysAgoISO)
        .lte('created_at', todayISO),
      
      // 유치원 칭찬
      supabase
        .from('kindergarten_reviews')
        .select('created_at')
        .eq('is_deleted', false)
        .gte('created_at', sevenDaysAgoISO)
        .lte('created_at', todayISO),
      
      // 어린이집 칭찬
      supabase
        .from('childcare_reviews')
        .select('created_at')
        .eq('is_deleted', false)
        .gte('created_at', sevenDaysAgoISO)
        .lte('created_at', todayISO)
    ])

    // 모든 칭찬 데이터 합치기
    const allReviews: string[] = []
    
    if (playgroundReviews.data) {
      playgroundReviews.data.forEach((review: any) => {
        if (review.created_at) {
          allReviews.push(review.created_at)
        }
      })
    }
    
    if (kindergartenReviews.data) {
      kindergartenReviews.data.forEach((review: any) => {
        if (review.created_at) {
          allReviews.push(review.created_at)
        }
      })
    }
    
    if (childcareReviews.data) {
      childcareReviews.data.forEach((review: any) => {
        if (review.created_at) {
          allReviews.push(review.created_at)
        }
      })
    }

    // 최근 7일의 날짜 배열 생성
    const dateKeys: string[] = []
    const dailyCounts: Record<string, number> = {}
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dateKeys.push(dateStr)
      dailyCounts[dateStr] = 0
    }

    // 일별 칭찬 수 계산
    allReviews.forEach((createdAt: string) => {
      const reviewDate = new Date(createdAt).toISOString().split('T')[0]
      if (dailyCounts.hasOwnProperty(reviewDate)) {
        dailyCounts[reviewDate]++
      }
    })

    // 일별 데이터 생성
    const dailyData = dateKeys.map((dateStr) => {
      const dateObj = new Date(dateStr)
      const monthDay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      return {
        date: monthDay,
        count: dailyCounts[dateStr] || 0
      }
    })

    return NextResponse.json({
      dailyData,
      success: true
    })

  } catch (error) {
    console.error('일별 칭찬 데이터 조회 오류:', error)
    return NextResponse.json({
      error: '일별 칭찬 데이터 조회 실패',
      dailyData: []
    }, { status: 500 })
  }
}

