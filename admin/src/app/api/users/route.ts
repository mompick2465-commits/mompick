import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Next.js 환경변수 방식 사용 (두 가지 방식 모두 시도)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인해주세요.',
        users: []
      }, { status: 500 })
    }

    console.log('API 라우트에서 환경 변수 확인:', {
      supabaseUrl: supabaseUrl ? '설정됨' : '설정 안됨',
      supabaseKey: supabaseKey ? '설정됨' : '설정 안됨',
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
      allPublicEnvKeys: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')),
      processEnvKeys: Object.keys(process.env).slice(0, 10) // 처음 10개만 표시
    })

    if (!supabaseUrl || !supabaseKey) {
      console.error('환경 변수 누락:', { supabaseUrl, supabaseKey })
      return NextResponse.json({ 
        error: 'Supabase 환경 변수가 설정되지 않았습니다.',
        users: []
      }, { status: 500 })
    }

    // 서버에서 Supabase 클라이언트 생성 (관리자 권한으로)
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase Service Role Key가 설정되지 않았습니다.',
        users: []
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 필요한 컬럼만 선택하여 조회
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        auth_user_id,
        user_type,
        full_name,
        auth_method,
        email,
        username,
        nickname,
        profile_image_url,
        phone,
        children_info,
        school_name,
        subject,
        experience_years,
        introduction,
        is_active,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase 조회 오류:', error)
      return NextResponse.json({ 
        error: '데이터 조회 중 오류가 발생했습니다.',
        users: []
      }, { status: 500 })
    }

    // 각 사용자의 프로필 이미지와 이미지 기록, 게시글 수, auth 정보 가져오기
    const usersWithImages = await Promise.all(
      (data || []).map(async (user) => {
        try {
          // auth.users에서 전화번호 가져오기
          let authPhone = null
          if (user.auth_user_id) {
            try {
              const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.auth_user_id)
              if (!authError && authUser?.user) {
                authPhone = authUser.user.phone
              }
            } catch (authErr) {
              console.error('Auth 사용자 조회 오류:', authErr)
            }
          }

          // 사용자의 게시글 수 조회
          const { count: postsCount } = await supabase
            .from('community_posts')
            .select('*', { count: 'exact', head: true })
            .eq('author_id', user.auth_user_id || user.id)

          // 사용자의 댓글 수 조회
          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.auth_user_id || user.id)
            .eq('is_deleted', false)

          // 사용자의 프로필 이미지 폴더에서 모든 이미지 조회
          const { data: imageFiles, error: storageError } = await supabase
            .storage
            .from('profile-images')
            .list(user.auth_user_id || user.id, {
              limit: 100,
              offset: 0,
              sortBy: { column: 'created_at', order: 'desc' }
            })

          if (storageError) {
            console.error(`사용자 ${user.id} 이미지 조회 오류:`, storageError)
            return {
              ...user,
              current_profile_image: user.profile_image_url,
              profile_image_history: [],
              children_image_history: []
            }
          }

          // 이미지 파일들의 공개 URL 생성 (children 폴더 제외)
          const imageHistory = (imageFiles || [])
            .filter(file => !file.name.startsWith('children/'))
            .map(file => {
              const { data: { publicUrl } } = supabase
                .storage
                .from('profile-images')
                .getPublicUrl(`${user.auth_user_id || user.id}/${file.name}`)
              
              return {
                name: file.name,
                url: publicUrl,
                created_at: file.created_at,
                size: file.metadata?.size || 0
              }
            })

          // 자녀 프로필 이미지 조회 (children 폴더)
          const { data: childrenImageFiles } = await supabase
            .storage
            .from('profile-images')
            .list(`${user.auth_user_id || user.id}/children`, {
              limit: 100,
              offset: 0,
              sortBy: { column: 'created_at', order: 'desc' }
            })

          const childrenImageHistory = (childrenImageFiles || []).map(file => {
            const { data: { publicUrl } } = supabase
              .storage
              .from('profile-images')
              .getPublicUrl(`${user.auth_user_id || user.id}/children/${file.name}`)
            
            return {
              name: file.name,
              url: publicUrl,
              created_at: file.created_at,
              size: file.metadata?.size || 0
            }
          })

          // 현재 프로필 이미지 URL
          let currentProfileImage = user.profile_image_url
          
          // profile_image_url이 없고 이미지 기록이 있으면 최신 이미지를 현재 이미지로 사용
          if (!currentProfileImage && imageHistory.length > 0) {
            currentProfileImage = imageHistory[0].url
          }

          return {
            ...user,
            phone: authPhone || user.phone, // auth.users의 전화번호 우선 사용
            current_profile_image: currentProfileImage,
            profile_image_history: imageHistory,
            children_image_history: childrenImageHistory,
            posts_count: postsCount || 0,
            comments_count: commentsCount || 0
          }
        } catch (err) {
          console.error(`사용자 ${user.id} 이미지 처리 오류:`, err)
          return {
            ...user,
            phone: user.phone, // auth.users 조회 실패 시 profiles의 phone 사용
            current_profile_image: user.profile_image_url,
            profile_image_history: [],
            children_image_history: [],
            posts_count: 0,
            comments_count: 0
          }
        }
      })
    )

    return NextResponse.json({ 
      users: usersWithImages,
      count: usersWithImages.length
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      users: []
    }, { status: 500 })
  }
}

