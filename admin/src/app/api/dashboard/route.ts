import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Next.js 환경변수 방식 사용 (두 가지 방식 모두 시도)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase 환경변수가 설정되지 않았습니다.',
        stats: {}
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

    // 최근 7일 날짜 계산
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    // 병렬로 여러 통계 조회
    const [
      { count: totalUsers, error: usersError },
      { count: parentUsers, error: parentError },
      { count: teacherUsers, error: teacherError },
      { count: totalReports, error: reportsError },
      { count: pendingReports, error: pendingReportsError },
      { data: recentReports, error: recentReportsError },
      { count: newUsers, error: newUsersError },
      { count: newPosts, error: newPostsError },
      { data: recentUsers, error: recentUsersError },
      { count: kindergartenReviews, error: kindergartenReviewsError },
      { count: childcareReviews, error: childcareReviewsError },
      { count: playgroundReviews, error: playgroundReviewsError },
      { count: totalPosts, error: totalPostsError },
      { count: totalKindergartenReviews, error: totalKindergartenReviewsError },
      { count: totalChildcareReviews, error: totalChildcareReviewsError },
      { count: totalPlaygroundReviews, error: totalPlaygroundReviewsError },
      { data: recentPosts, error: recentPostsError },
      { data: recentComments, error: recentCommentsError },
      { data: recentKindergartenReviews, error: recentKindergartenReviewsError },
      { data: recentChildcareReviews, error: recentChildcareReviewsError },
      { data: recentPlaygroundReviews, error: recentPlaygroundReviewsError }
    ] = await Promise.all([
      // 전체 사용자 수
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),
      
      // 학부모 수
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'parent'),
      
      // 교사 수
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'teacher'),
      
      // 전체 신고 수
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true }),
      
      // 대기 중인 신고 수
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      
      // 최근 7일간 신고 (report_type별 집계용)
      supabase
        .from('reports')
        .select('report_type, created_at')
        .gte('created_at', sevenDaysAgoISO),
      
      // 최근 7일간 신규 가입자 수
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgoISO),
      
      // 최근 7일간 게시글 작성 수
      supabase
        .from('community_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgoISO),
      
      // 최근 7일간 사용자 데이터 (일별 집계용)
      supabase
        .from('profiles')
        .select('created_at, user_type')
        .gte('created_at', sevenDaysAgoISO),
      
      // 최근 7일간 게시글 데이터 (일별 활성 사용자 계산용)
      supabase
        .from('community_posts')
        .select('author_id, created_at')
        .gte('created_at', sevenDaysAgoISO),
      
      // 최근 7일간 댓글 데이터 (일별 활성 사용자 계산용)
      supabase
        .from('comments')
        .select('user_id, created_at')
        .gte('created_at', sevenDaysAgoISO),
      
      // 최근 7일간 유치원 칭찬 작성 수
      supabase
        .from('kindergarten_reviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgoISO),
      
      // 최근 7일간 어린이집 칭찬 작성 수
      supabase
        .from('childcare_reviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgoISO),
      
      // 최근 7일간 놀이터 칭찬 작성 수
      supabase
        .from('playground_reviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgoISO),
      
      // 최근 7일간 유치원 칭찬 작성 데이터 (일별 집계용)
      supabase
        .from('kindergarten_reviews')
        .select('created_at')
        .gte('created_at', sevenDaysAgoISO),
      
      // 최근 7일간 어린이집 칭찬 작성 데이터 (일별 집계용)
      supabase
        .from('childcare_reviews')
        .select('created_at')
        .gte('created_at', sevenDaysAgoISO),
      
      // 최근 7일간 놀이터 칭찬 작성 데이터 (일별 집계용)
      supabase
        .from('playground_reviews')
        .select('created_at')
        .gte('created_at', sevenDaysAgoISO),
      
      // 전체 게시글 수
      supabase
        .from('community_posts')
        .select('*', { count: 'exact', head: true }),
      
      // 전체 유치원 칭찬 수
      supabase
        .from('kindergarten_reviews')
        .select('*', { count: 'exact', head: true }),
      
      // 전체 어린이집 칭찬 수
      supabase
        .from('childcare_reviews')
        .select('*', { count: 'exact', head: true }),
      
      // 전체 놀이터 칭찬 수
      supabase
        .from('playground_reviews')
        .select('*', { count: 'exact', head: true })
    ])

    // 에러 체크
    if (usersError || parentError || teacherError || reportsError || pendingReportsError) {
      console.error('대시보드 통계 조회 오류:', {
        usersError,
        parentError,
        teacherError,
        reportsError,
        pendingReportsError
      })
      
      return NextResponse.json({ 
        error: '통계 데이터 조회 중 오류가 발생했습니다.',
        stats: {}
      }, { status: 500 })
    }

    // 최근 신고 통계 계산 (report_type별 집계)
    const recentReportStats = {
      inappropriate: 0, // 부적절한 게시글
      spam: 0,          // 스팸
      harassment: 0,    // 괴롭힘
      other: 0          // 기타
    }

    if (recentReports && !recentReportsError) {
      recentReports.forEach((report: any) => {
        const reportType = report.report_type || 'other'
        if (reportType === 'inappropriate') {
          recentReportStats.inappropriate++
        } else if (reportType === 'spam') {
          recentReportStats.spam++
        } else if (reportType === 'harassment') {
          recentReportStats.harassment++
        } else {
          recentReportStats.other++
        }
      })
    }

    // 활성 사용자 수 계산 (최근 7일간 로그인한 사용자)
    // auth.users 테이블의 last_sign_in_at을 사용
    let uniqueActiveUsers = 0
    try {
      // SQL 함수를 통해 auth.users 테이블 조회
      // 함수가 없으면 에러가 발생하므로 fallback 로직 사용
      const { data: activeUsersData, error: activeUsersError } = await supabase
        .rpc('get_active_users_count', { 
          days_ago: 7 
        })
      
      if (!activeUsersError && activeUsersData !== null && activeUsersData !== undefined) {
        uniqueActiveUsers = typeof activeUsersData === 'number' ? activeUsersData : 0
      } else {
        // RPC 함수가 없거나 에러가 발생한 경우
        console.warn('get_active_users_count RPC 함수 없음 또는 에러:', activeUsersError)
        // fallback: 게시글/댓글 작성자 수 사용
        uniqueActiveUsers = 0
      }
    } catch (error) {
      console.error('활성 사용자 수 계산 오류:', error)
      uniqueActiveUsers = 0
    }
    
    // RPC 함수가 없거나 실패한 경우 fallback 로직
    if (uniqueActiveUsers === 0) {
      try {
        const [postAuthorsResult, commentAuthorsResult] = await Promise.all([
          supabase
            .from('community_posts')
            .select('author_id')
            .gte('created_at', sevenDaysAgoISO),
          supabase
            .from('comments')
            .select('user_id')
            .gte('created_at', sevenDaysAgoISO)
        ])
        
        const authorIds = new Set<string>()
        postAuthorsResult.data?.forEach((post: any) => {
          if (post.author_id) authorIds.add(post.author_id)
        })
        commentAuthorsResult.data?.forEach((comment: any) => {
          if (comment.user_id) authorIds.add(comment.user_id)
        })
        
        // fallback 값이 0보다 크면 사용 (RPC 함수가 없을 때만)
        if (authorIds.size > 0) {
          uniqueActiveUsers = authorIds.size
        }
      } catch (fallbackError) {
        console.error('활성 사용자 수 계산 fallback 오류:', fallbackError)
      }
    }

    // 일별 사용자 통계 계산 (누적)
    // 전체 사용자 수에서 최근 7일간의 일별 가입자 수를 빼서 역산
    const dailyUserCounts: { [key: string]: { total: number, parent: number, teacher: number } } = {}
    
    // 최근 7일 날짜 배열 생성 (오늘부터 6일 전까지)
    const userDateKeys: string[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      userDateKeys.push(dateStr)
    }
    
    // 최근 7일간 일별 가입자 수 계산
    const dailyNewUsers: { [key: string]: { total: number, parent: number, teacher: number } } = {}
    
    if (recentUsers && !recentUsersError && recentUsers.length > 0) {
      for (const dateStr of userDateKeys) {
        const dateStart = new Date(dateStr)
        dateStart.setHours(0, 0, 0, 0)
        const dateEnd = new Date(dateStr)
        dateEnd.setHours(23, 59, 59, 999)
        
        // 해당 날짜에 가입한 사용자
        const usersOnDate = recentUsers.filter((user: any) => {
          if (!user.created_at) return false
          const userDate = new Date(user.created_at)
          return userDate >= dateStart && userDate <= dateEnd
        })
        
        dailyNewUsers[dateStr] = {
          total: usersOnDate.length,
          parent: usersOnDate.filter((u: any) => u.user_type === 'parent').length,
          teacher: usersOnDate.filter((u: any) => u.user_type === 'teacher').length
        }
      }
    } else {
      // 데이터가 없으면 0으로 채움
      for (const dateStr of userDateKeys) {
        dailyNewUsers[dateStr] = { total: 0, parent: 0, teacher: 0 }
      }
    }
    
    // 각 날짜별로 그 날짜까지의 누적 사용자 수 계산 (역산)
    // 오늘부터 과거로 가면서, 그 날짜 이후에 가입한 사용자 수를 빼서 계산
    for (let i = userDateKeys.length - 1; i >= 0; i--) {
      const dateStr = userDateKeys[i]
      let totalAfterDate = 0
      let parentAfterDate = 0
      let teacherAfterDate = 0
      
      // 이 날짜 이후에 가입한 사용자 수 계산
      for (let j = i + 1; j < userDateKeys.length; j++) {
        const laterDate = userDateKeys[j]
        totalAfterDate += dailyNewUsers[laterDate]?.total || 0
        parentAfterDate += dailyNewUsers[laterDate]?.parent || 0
        teacherAfterDate += dailyNewUsers[laterDate]?.teacher || 0
      }
      
      // 전체 사용자 수에서 이후에 가입한 사용자 수를 빼서 해당 날짜의 누적 수 계산
      dailyUserCounts[dateStr] = {
        total: Math.max(0, (totalUsers || 0) - totalAfterDate),
        parent: Math.max(0, (parentUsers || 0) - parentAfterDate),
        teacher: Math.max(0, (teacherUsers || 0) - teacherAfterDate)
      }
    }
    
    // 일별 활성 사용자 계산 (게시글/댓글 작성자 기준)
    const dailyActiveUsers: { [key: string]: Set<string> } = {}
    
    // 날짜별로 초기화
    for (const dateStr of userDateKeys) {
      dailyActiveUsers[dateStr] = new Set<string>()
    }
    
    // 게시글 작성자 기준 활성 사용자
    if (recentPosts && !recentPostsError && Array.isArray(recentPosts)) {
      recentPosts.forEach((post: any) => {
        if (post && post.created_at && post.author_id) {
          try {
            const postDate = new Date(post.created_at).toISOString().split('T')[0]
            if (dailyActiveUsers.hasOwnProperty(postDate)) {
              dailyActiveUsers[postDate].add(post.author_id)
            }
          } catch (e) {
            console.warn('게시글 날짜 파싱 오류:', e, post)
          }
        }
      })
    } else {
      console.warn('게시글 데이터 조회 실패:', { recentPostsError, recentPosts })
    }
    
    // 댓글 작성자 기준 활성 사용자
    if (recentComments && !recentCommentsError && Array.isArray(recentComments)) {
      recentComments.forEach((comment: any) => {
        if (comment && comment.created_at && comment.user_id) {
          try {
            const commentDate = new Date(comment.created_at).toISOString().split('T')[0]
            if (dailyActiveUsers.hasOwnProperty(commentDate)) {
              dailyActiveUsers[commentDate].add(comment.user_id)
            }
          } catch (e) {
            console.warn('댓글 날짜 파싱 오류:', e, comment)
          }
        }
      })
    } else {
      console.warn('댓글 데이터 조회 실패:', { recentCommentsError, recentComments })
    }
    
    // 일별 신규가입자와 활성 사용자 데이터 배열로 변환
    // 활성 사용자는 게시글/댓글 작성자 기준으로 계산하되, 없으면 전체 활성 사용자를 일별로 균등 분배
    const totalActiveUsersFromPosts = Array.from(new Set([
      ...(recentPosts || []).map((p: any) => p?.author_id).filter(Boolean),
      ...(recentComments || []).map((c: any) => c?.user_id).filter(Boolean)
    ])).length
    
    // 일별 활성 사용자가 없으면 전체 활성 사용자를 사용
    const finalActiveUsersCount = totalActiveUsersFromPosts > 0 ? totalActiveUsersFromPosts : uniqueActiveUsers
    
    const dailyUserData = userDateKeys.map((dateStr) => {
      const dateObj = new Date(dateStr)
      const monthDay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      const activeUsersForDate = dailyActiveUsers[dateStr]?.size || 0
      
      return {
        date: monthDay,
        '전체가입자[누적]': dailyUserCounts[dateStr]?.total || 0,
        활성사용자: activeUsersForDate > 0 ? activeUsersForDate : (finalActiveUsersCount > 0 ? Math.ceil(finalActiveUsersCount / 7) : 0)
      }
    })
    
    console.log('일별 사용자 통계:', {
      totalUsers,
      parentUsers,
      teacherUsers,
      uniqueActiveUsers,
      recentUsersCount: recentUsers?.length || 0,
      recentPostsCount: recentPosts?.length || 0,
      recentCommentsCount: recentComments?.length || 0,
      totalActiveUsersFromPosts,
      finalActiveUsersCount,
      dailyUserData: dailyUserData,
      dailyNewUsers: Object.fromEntries(Object.entries(dailyNewUsers).map(([k, v]) => [k, v.total])),
      dailyCumulativeUsers: Object.fromEntries(Object.entries(dailyUserCounts).map(([k, v]) => [k, v.total])),
      dailyActiveUsers: Object.fromEntries(Object.entries(dailyActiveUsers).map(([k, v]) => [k, v.size])),
      sampleDailyUserData: dailyUserData[0]
    })

    // 일별 신고 개수 계산
    const dailyReportCounts: { [key: string]: number } = {}
    
    // 최근 7일 날짜 배열 생성 (날짜 순서 보장)
    const reportDateKeys: string[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD 형식
      reportDateKeys.push(dateStr)
      dailyReportCounts[dateStr] = 0
    }
    
    // 신고 데이터에서 일별 개수 집계
    if (recentReports && !recentReportsError) {
      recentReports.forEach((report: any) => {
        if (report.created_at) {
          const reportDate = new Date(report.created_at).toISOString().split('T')[0]
          if (dailyReportCounts.hasOwnProperty(reportDate)) {
            dailyReportCounts[reportDate]++
          }
        }
      })
    }
    
    // 일별 데이터 배열로 변환 (누적) - 날짜 순서대로
    let cumulativeCount = 0
    const dailyReportData = reportDateKeys.map((dateStr) => {
      const count = dailyReportCounts[dateStr] || 0
      const dateObj = new Date(dateStr)
      const dayName = dateObj.toLocaleDateString('ko-KR', { weekday: 'short' })
      const monthDay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      cumulativeCount += count
      return {
        date: monthDay,
        day: dayName,
        count: cumulativeCount
      }
    })

    // 타입별 일별 신고 개수 계산
    const dailyReportTypeCounts: { [key: string]: { [key: string]: number } } = {}
    
    // 최근 7일 날짜 배열 생성
    const dateKeys: string[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dateKeys.push(dateStr)
      dailyReportTypeCounts[dateStr] = {
        inappropriate: 0,
        spam: 0,
        harassment: 0,
        other: 0
      }
    }
    
    // 신고 데이터에서 타입별 일별 개수 집계
    if (recentReports && !recentReportsError) {
      recentReports.forEach((report: any) => {
        if (report.created_at && report.report_type) {
          const reportDate = new Date(report.created_at).toISOString().split('T')[0]
          if (dailyReportTypeCounts.hasOwnProperty(reportDate)) {
            const reportType = report.report_type || 'other'
            if (reportType === 'inappropriate') {
              dailyReportTypeCounts[reportDate].inappropriate++
            } else if (reportType === 'spam') {
              dailyReportTypeCounts[reportDate].spam++
            } else if (reportType === 'harassment') {
              dailyReportTypeCounts[reportDate].harassment++
            } else {
              dailyReportTypeCounts[reportDate].other++
            }
          }
        }
      })
    }
    
    // 타입별 일별 데이터 배열로 변환
    const dailyReportTypeData = dateKeys.map((dateStr) => {
      const dateObj = new Date(dateStr)
      const monthDay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      return {
        date: monthDay,
        부적절한게시글: dailyReportTypeCounts[dateStr].inappropriate,
        스팸: dailyReportTypeCounts[dateStr].spam,
        괴롭힘: dailyReportTypeCounts[dateStr].harassment,
        기타: dailyReportTypeCounts[dateStr].other
      }
    })

    // 일별 게시글 작성 누적 데이터 계산
    const dailyPostCounts: { [key: string]: number } = {}
    const postDateKeys: string[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      postDateKeys.push(dateStr)
      dailyPostCounts[dateStr] = 0
    }

    if (recentPosts && !recentPostsError) {
      recentPosts.forEach((post: any) => {
        if (post.created_at) {
          const postDate = new Date(post.created_at).toISOString().split('T')[0]
          if (dailyPostCounts.hasOwnProperty(postDate)) {
            dailyPostCounts[postDate]++
          }
        }
      })
    }

    // 일별 게시글 작성 누적 데이터
    const totalPostsCount = (totalPosts || 0)
    const totalRecentPostsCount = Object.values(dailyPostCounts).reduce((sum, count) => sum + count, 0)
    const postsBeforeRecent7Days = Math.max(0, totalPostsCount - totalRecentPostsCount)
    
    const dailyPostData = postDateKeys.map((dateStr) => {
      const dateObj = new Date(dateStr)
      const monthDay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      // 누적 계산: 7일 전까지의 게시글 수 + 해당 날짜까지의 게시글 수
      let postsUpToDate = postsBeforeRecent7Days
      const currentIndex = postDateKeys.indexOf(dateStr)
      for (let i = 0; i <= currentIndex; i++) {
        postsUpToDate += dailyPostCounts[postDateKeys[i]] || 0
      }
      return {
        date: monthDay,
        '게시글 작성[누적]': postsUpToDate
      }
    })

    // 일별 칭찬 작성 누적 데이터 계산
    const dailyReviewCounts: { [key: string]: number } = {}
    const reviewDateKeys: string[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      reviewDateKeys.push(dateStr)
      dailyReviewCounts[dateStr] = 0
    }

    // 모든 칭찬 데이터 합치기
    const allRecentReviews = [
      ...(recentKindergartenReviews || []),
      ...(recentChildcareReviews || []),
      ...(recentPlaygroundReviews || [])
    ]

    allRecentReviews.forEach((review: any) => {
      if (review.created_at) {
        const reviewDate = new Date(review.created_at).toISOString().split('T')[0]
        if (dailyReviewCounts.hasOwnProperty(reviewDate)) {
          dailyReviewCounts[reviewDate]++
        }
      }
    })

    // 일별 칭찬 작성 누적 데이터
    const totalReviews = (totalKindergartenReviews || 0) + (totalChildcareReviews || 0) + (totalPlaygroundReviews || 0)
    const totalRecentReviewsCount = Object.values(dailyReviewCounts).reduce((sum, count) => sum + count, 0)
    const reviewsBeforeRecent7Days = Math.max(0, totalReviews - totalRecentReviewsCount)
    
    const dailyReviewData = reviewDateKeys.map((dateStr) => {
      const dateObj = new Date(dateStr)
      const monthDay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      // 누적 계산: 7일 전까지의 칭찬 수 + 해당 날짜까지의 칭찬 수
      let reviewsUpToDate = reviewsBeforeRecent7Days
      const currentIndex = reviewDateKeys.indexOf(dateStr)
      for (let i = 0; i <= currentIndex; i++) {
        reviewsUpToDate += dailyReviewCounts[reviewDateKeys[i]] || 0
      }
      return {
        date: monthDay,
        '칭찬 작성[누적]': reviewsUpToDate
      }
    })

    // 게시글과 칭찬 데이터를 하나의 배열로 합치기
    const dailyContentData = postDateKeys.map((dateStr) => {
      const dateObj = new Date(dateStr)
      const monthDay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      const postData = dailyPostData.find(d => d.date === monthDay)
      const reviewData = dailyReviewData.find(d => d.date === monthDay)
      return {
        date: monthDay,
        '게시글 작성[누적]': postData?.['게시글 작성[누적]'] || 0,
        '칭찬 작성[누적]': reviewData?.['칭찬 작성[누적]'] || 0
      }
    })

    const stats = {
      totalUsers: totalUsers || 0,
      parentUsers: parentUsers || 0,
      teacherUsers: teacherUsers || 0,
      totalReports: totalReports || 0,
      pendingReports: pendingReports || 0,
      resolvedReports: (totalReports || 0) - (pendingReports || 0),
      recentReports: recentReportStats,
      dailyReports: dailyReportData,
      dailyReportTypes: dailyReportTypeData,
      dailyUsers: dailyUserData,
      dailyContent: dailyContentData,
      userActivity: {
        newUsers: newUsers || 0,
        activeUsers: uniqueActiveUsers,
        newPosts: newPosts || 0,
        newReviews: (kindergartenReviews || 0) + (childcareReviews || 0) + (playgroundReviews || 0),
        totalPosts: totalPosts || 0,
        totalReviews: (totalKindergartenReviews || 0) + (totalChildcareReviews || 0) + (totalPlaygroundReviews || 0)
      }
    }

    console.log('대시보드 통계:', stats)

    return NextResponse.json({ 
      stats,
      success: true
    })

  } catch (error) {
    console.error('대시보드 API 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      stats: {}
    }, { status: 500 })
  }
}
