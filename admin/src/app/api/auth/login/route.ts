import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 환경 변수에서 관리자 계정 정보 가져오기
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    // 개발 환경에서는 기본 계정 사용 가능
    const defaultEmail = process.env.NODE_ENV === 'development' ? 'admin@mompick.com' : null
    const defaultPassword = process.env.NODE_ENV === 'development' ? 'admin123' : null

    const validEmail = adminEmail || defaultEmail
    const validPassword = adminPassword || defaultPassword

    if (!validEmail || !validPassword) {
      console.error('관리자 계정이 환경 변수에 설정되지 않았습니다.')
      return NextResponse.json(
        { error: '관리자 계정이 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // 이메일과 비밀번호 확인
    if (email !== validEmail || password !== validPassword) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 세션 토큰 생성 (간단한 랜덤 문자열)
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

    // 쿠키에 세션 저장
    const cookieStore = await cookies()
    cookieStore.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })

    return NextResponse.json({
      success: true,
      message: '로그인 성공',
    })
  } catch (error) {
    console.error('로그인 오류:', error)
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

