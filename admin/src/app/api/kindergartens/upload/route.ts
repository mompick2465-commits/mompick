import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const kinderCode = formData.get('kinderCode') as string
    const imageType = formData.get('imageType') as string // 'building' or 'meal'

    if (!file || !kinderCode || !imageType) {
      return NextResponse.json({
        error: '파일, 유치원 코드, 이미지 타입이 필요합니다.'
      }, { status: 400 })
    }

    console.log(`📤 이미지 업로드 시작: ${kinderCode} - ${imageType}`)

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

    // 파일명 생성 (타임스탬프 + 확장자만 사용, 한글 제거)
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${timestamp}.${fileExtension}`
    const filePath = `${kinderCode}/${imageType}/${fileName}`

    console.log(`📂 저장 경로: kindergarten-images/${filePath}`)
    console.log(`📝 원본 파일명: ${file.name} → 저장 파일명: ${fileName}`)

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kindergarten-images')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('이미지 업로드 실패:', uploadError)
      return NextResponse.json({
        error: `이미지 업로드 실패: ${uploadError.message}`
      }, { status: 500 })
    }

    // Public URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('kindergarten-images')
      .getPublicUrl(filePath)

    console.log(`✅ 이미지 업로드 성공: ${publicUrl}`)

    return NextResponse.json({
      message: '이미지 업로드 성공',
      url: publicUrl,
      path: filePath
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

