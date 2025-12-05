import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('admin_session')

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
    })
  } catch (error) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }
}

