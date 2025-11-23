import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; filename: string } }
) {
  try {
    const { id: userId, filename } = params
    
    // Next.js 환경변수 방식 사용
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase 환경변수가 설정되지 않았습니다.',
        success: false
      }, { status: 500 })
    }

    // 서버에서 Supabase 클라이언트 생성 (관리자 권한으로)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('프로필 이미지 삭제 시작 - userId:', userId, 'filename:', filename)

    // Storage에서 이미지 삭제
    const { error: deleteError } = await supabase
      .storage
      .from('profile-images')
      .remove([`${userId}/${filename}`])

    if (deleteError) {
      console.error('이미지 삭제 오류:', deleteError)
      return NextResponse.json({ 
        error: `이미지 삭제 중 오류가 발생했습니다: ${deleteError.message}`,
        success: false
      }, { status: 500 })
    }

    console.log('이미지 삭제 성공')

    // 삭제된 이미지가 현재 프로필 이미지인 경우 profiles 테이블 업데이트
    const deletedImageUrl = `${supabaseUrl}/storage/v1/object/public/profile-images/${userId}/${filename}`
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_image_url, auth_user_id')
      .eq('auth_user_id', userId)
      .single()

    if (profile && profile.profile_image_url === deletedImageUrl) {
      // 현재 프로필 이미지를 null로 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: null })
        .eq('auth_user_id', userId)

      if (updateError) {
        console.error('프로필 이미지 URL 업데이트 오류:', updateError)
      } else {
        console.log('프로필 이미지 URL null로 업데이트됨')
      }
    }

    return NextResponse.json({ 
      success: true,
      message: '이미지가 성공적으로 삭제되었습니다.'
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      success: false
    }, { status: 500 })
  }
}

