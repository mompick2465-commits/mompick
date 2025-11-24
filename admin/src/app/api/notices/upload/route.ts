import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 공지사항 이미지 업로드
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({
        error: '파일이 없습니다.'
      }, { status: 400 })
    }

    // 파일명 생성 (타임스탬프 + 원본 파일명)
    const timestamp = Date.now()
    const fileName = `notices/${timestamp}-${file.name}`

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Supabase Storage에 업로드 (notices 버킷 사용, 없으면 생성 필요)
    const { data, error } = await supabase.storage
      .from('notices')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Storage 업로드 오류:', error)
      return NextResponse.json({
        error: `파일 업로드 실패: ${error.message}`
      }, { status: 500 })
    }

    // Public URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('notices')
      .getPublicUrl(fileName)

    return NextResponse.json({
      message: '파일이 업로드되었습니다.',
      url: publicUrl,
      path: data.path
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

