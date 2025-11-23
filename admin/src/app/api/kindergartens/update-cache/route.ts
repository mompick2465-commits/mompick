import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { kindercode, customInfo } = body

    if (!kindercode) {
      return NextResponse.json({
        error: '유치원 코드가 필요합니다.'
      }, { status: 400 })
    }

    console.log(`🔄 캐시 업데이트 시작 - kindercode: ${kindercode}`)

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

    // 캐시 경로: kindergarten-detail-cache/details/{kindercode}/latest.json
    const cacheFolderPath = `details/${kindercode}`
    const cacheFilePath = `${cacheFolderPath}/latest.json`

    // 1. 기존 캐시 로드
    let existingCache: any = null
    
    try {
      const { data: cacheData, error: downloadError } = await supabase.storage
        .from('kindergarten-detail-cache')
        .download(cacheFilePath)

      if (!downloadError && cacheData) {
        const cacheText = await cacheData.text()
        existingCache = JSON.parse(cacheText)
        console.log('📦 기존 캐시 로드 성공')
      } else {
        console.log('📦 기존 캐시 없음, 새로 생성')
      }
    } catch (error) {
      console.log('기존 캐시 로드 실패, 새로 생성:', error)
    }

    // 2. 커스텀 정보 병합 (Envelope 구조: { meta, data })
    const updatedCache = {
      meta: existingCache?.meta || {
        kindercode: kinderCode,
        lastSyncedAt: new Date().toISOString(),
        apiVersion: '1.0'
      },
      data: {
        ...existingCache?.data,
        customInfo: {
          ...(existingCache?.data?.customInfo || {}),
          ...customInfo
        }
      }
    }

    console.log('📦 기존 캐시 data.customInfo:', existingCache?.data?.customInfo)
    console.log('📦 새로운 customInfo:', customInfo)
    console.log('📦 병합된 data.customInfo:', updatedCache.data.customInfo)

    // 3. 캐시 저장
    const jsonData = JSON.stringify(updatedCache, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })

    console.log(`💾 캐시 저장 경로: kindergarten-detail-cache/${cacheFilePath}`)

    const { error: uploadError } = await supabase.storage
      .from('kindergarten-detail-cache')
      .upload(cacheFilePath, blob, {
        contentType: 'application/json',
        upsert: true
      })

    if (uploadError) {
      console.error('❌ 캐시 저장 실패:', uploadError)
      return NextResponse.json({
        error: `캐시 저장 실패: ${uploadError.message}`
      }, { status: 500 })
    }

    console.log(`✅ 캐시 업데이트 성공: kindergarten-detail-cache/${cacheFilePath}`)

    return NextResponse.json({
      message: '캐시가 업데이트되었습니다.',
      cachePath: cacheFilePath,
      customInfo: updatedCache.customInfo
    })

  } catch (error) {
    console.error('캐시 업데이트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

