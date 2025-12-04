import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Next.js 환경변수 방식 사용 (두 가지 방식 모두 시도)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인해주세요.',
        reports: []
      }, { status: 500 })
    }
    
    console.log('Reports API에서 환경 변수 확인:', {
      supabaseUrl: supabaseUrl ? '설정됨' : '설정 안됨',
      supabaseKey: supabaseKey ? '설정됨' : '설정 안됨'
    })

    // 서버에서 Supabase 클라이언트 생성 (관리자 권한으로)
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase Service Role Key가 설정되지 않았습니다.',
        reports: []
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 먼저 기본 reports 데이터만 조회
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase 조회 오류:', error)
      return NextResponse.json({ 
        error: '데이터 조회 중 오류가 발생했습니다.',
        reports: []
      }, { status: 500 })
    }

    // 각 신고에 대한 추가 정보 조회 (신고자, 피신고 대상)
    const reportsWithDetails = await Promise.all(
      (data || []).map(async (report) => {
        console.log('🔍 신고 처리 중:', {
          id: report.id,
          post_id: report.post_id,
          target_type: report.target_type,
          target_id: report.target_id,
          facility_type: report.facility_type
        })

        // 신고자 정보 조회 (reporter_id는 profiles.id)
        const { data: reporter } = await supabase
          .from('profiles')
          .select('id, full_name, nickname, profile_image_url, user_type, auth_user_id')
          .eq('id', report.reporter_id)
          .single()

        // 피신고자 정보 (target_type에 따라 다름)
        let targetData: any = null
        let targetAuthor: any = null

        // target_type 정규화 (이미지 신고 타입도 처리)
        let normalizedTargetType = report.target_type
        const isImageReport = normalizedTargetType?.endsWith('_review_image')
        
        if (normalizedTargetType === 'childcare_review' || normalizedTargetType === 'kindergarten_review' || normalizedTargetType === 'playground_review') {
          normalizedTargetType = 'review'
        } else if (isImageReport) {
          // 이미지 신고는 review로 처리하되, 이미지 정보는 별도로 저장
          normalizedTargetType = 'review_image'
        }
        // meal_image와 building_image는 그대로 유지
        else if (normalizedTargetType === 'meal_image' || normalizedTargetType === 'building_image') {
          // 그대로 유지
        }
        
        // target_type이 없으면 post_id가 있으면 'post'로 간주
        // 단, target_type이 'profile' 또는 'comment'인 경우는 각각 프로필/댓글 신고로 처리
        const inferredTargetType = normalizedTargetType === 'profile' 
          ? 'profile' 
          : normalizedTargetType === 'comment'
          ? 'comment'
          : (normalizedTargetType || (report.post_id ? 'post' : null))
        
        // target_type에 따라 다른 테이블에서 조회
        // comment인 경우 target_id 사용, 그 외에는 post_id가 있으면 우선 사용, 없으면 target_id 사용
        const targetId = inferredTargetType === 'comment' 
          ? report.target_id 
          : (report.post_id || report.target_id)
        
        console.log('🔍 신고 타입 분석:', {
          original: report.target_type,
          normalized: normalizedTargetType,
          inferred: inferredTargetType,
          targetId,
          facility_type: report.facility_type
        })
        
        if (inferredTargetType === 'profile') {
          // 프로필 신고 처리
          // 커뮤니티 페이지에서 신고한 경우: post_id가 있고, 게시글 작성자가 피신고자
          // 상세보기 페이지에서 신고한 경우: target_id가 피신고자 프로필 ID
          
          if (report.post_id) {
            // 커뮤니티 페이지에서 신고한 경우 - 게시글 정보와 작성자 정보 조회
            const { data: postData } = await supabase
              .from('community_posts')
              .select('id, content, author_name, author_profile_image, location, category, images, hashtags, emojis, author_id')
              .eq('id', report.post_id)
              .single()
            
            if (postData) {
              targetData = {
                type: 'profile',
                id: postData.id,
                content: postData.content,
                images: postData.images || [],
                author_name: postData.author_name,
                author_profile_image: postData.author_profile_image,
                location: postData.location,
                category: postData.category,
                hashtags: postData.hashtags || [],
                emojis: postData.emojis || []
              }
              
              // 프로필 신고의 피신고자는 게시글 작성자 또는 댓글 작성자
              if (report.target_id) {
                // 댓글/답글 작성자 프로필 신고인 경우 - target_id가 피신고자 프로필 ID
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('id, full_name, nickname, profile_image_url, auth_user_id, user_type')
                  .eq('id', report.target_id)
                  .single()
                
                if (profileData) {
                  targetAuthor = profileData
                } else {
                  // target_id로 못 찾으면 게시글 작성자로 폴백
                  if (postData.author_id) {
                    let { data: author } = await supabase
                      .from('profiles')
                      .select('id, full_name, nickname, profile_image_url, auth_user_id')
                      .eq('id', postData.author_id)
                      .maybeSingle()
                    
                    if (!author) {
                      const { data: authorByAuthId } = await supabase
                        .from('profiles')
                        .select('id, full_name, nickname, profile_image_url, auth_user_id')
                        .eq('auth_user_id', postData.author_id)
                        .maybeSingle()
                      author = authorByAuthId
                    }
                    
                    targetAuthor = author
                  }
                }
              } else {
                // 게시글 작성자 프로필 신고인 경우
                if (postData.author_id) {
                  // 먼저 id로 조회 시도
                  let { data: author } = await supabase
                    .from('profiles')
                    .select('id, full_name, nickname, profile_image_url, auth_user_id')
                    .eq('id', postData.author_id)
                    .maybeSingle()
                  
                  // id로 못 찾으면 auth_user_id로 조회 시도
                  if (!author) {
                    const { data: authorByAuthId } = await supabase
                      .from('profiles')
                      .select('id, full_name, nickname, profile_image_url, auth_user_id')
                      .eq('auth_user_id', postData.author_id)
                      .maybeSingle()
                    author = authorByAuthId
                  }
                  
                  targetAuthor = author
                }
              }
              
              console.log('🔍 프로필 신고 - 커뮤니티 페이지:', {
                post_id: report.post_id,
                target_id: report.target_id,
                found: !!targetAuthor,
                author_name: targetAuthor?.full_name
              })
            }
          } else if (report.target_id) {
            // 상세보기 페이지에서 신고한 경우 - target_id가 피신고자 프로필 ID
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, nickname, profile_image_url, auth_user_id, user_type')
              .eq('id', report.target_id)
              .single()
            
            if (profileData) {
              targetData = {
                type: 'profile',
                id: profileData.id,
                full_name: profileData.full_name,
                nickname: profileData.nickname,
                profile_image_url: profileData.profile_image_url,
                user_type: profileData.user_type
              }
              
              // 프로필 신고의 피신고자는 target_id에 해당하는 프로필
              targetAuthor = profileData
              
              console.log('🔍 프로필 신고 - 상세보기 페이지:', {
                target_id: report.target_id,
                found: !!profileData,
                author_name: profileData?.full_name,
                facility_type: report.facility_type,
                facility_name: report.facility_name
              })
            } else {
              console.warn('프로필 신고 - 피신고자 프로필을 찾을 수 없음:', report.target_id)
            }
          }
        } else if ((inferredTargetType === 'post' || !inferredTargetType) && targetId) {
          // 커뮤니티 게시글
          const { data: postData } = await supabase
            .from('community_posts')
            .select('id, content, author_name, author_profile_image, location, category, images, hashtags, emojis, author_id')
            .eq('id', targetId)
            .single()
          
          if (postData) {
            targetData = {
              type: 'post',
              id: postData.id,
              content: postData.content,
              images: postData.images || [],
              author_name: postData.author_name,
              author_profile_image: postData.author_profile_image,
              location: postData.location,
              category: postData.category,
              hashtags: postData.hashtags || [],
              emojis: postData.emojis || []
            }
            
            // 게시글 작성자 정보 조회 (author_id가 profiles.id 또는 profiles.auth_user_id일 수 있음)
            if (postData.author_id) {
              // 먼저 id로 조회 시도
              let { data: author } = await supabase
                .from('profiles')
                .select('id, full_name, nickname, profile_image_url, auth_user_id')
                .eq('id', postData.author_id)
                .maybeSingle()
              
              // id로 못 찾으면 auth_user_id로 조회 시도
              if (!author) {
                const { data: authorByAuthId } = await supabase
                  .from('profiles')
                  .select('id, full_name, nickname, profile_image_url, auth_user_id')
                  .eq('auth_user_id', postData.author_id)
                  .maybeSingle()
                author = authorByAuthId
              }
              
              targetAuthor = author
              
              console.log('🔍 게시글 작성자 조회:', {
                author_id: postData.author_id,
                found: !!author,
                author_name: author?.full_name
              })
            }
          }
        } else if (inferredTargetType === 'comment' && targetId) {
          // 댓글
          const { data: commentData } = await supabase
            .from('comments')
            .select('id, content, user_id, user_name, user_profile_image, post_id, parent_id')
            .eq('id', targetId)
            .single()
          
          if (commentData) {
            targetData = {
              type: commentData.parent_id ? 'reply' : 'comment',
              id: commentData.id,
              content: commentData.content,
              user_name: commentData.user_name,
              user_profile_image: commentData.user_profile_image,
              post_id: commentData.post_id,
              parent_id: commentData.parent_id
            }
            
            // 댓글 작성자 정보 조회 (comments.user_id는 profiles.auth_user_id를 참조)
            if (commentData.user_id) {
              const { data: author } = await supabase
                .from('profiles')
                .select('id, full_name, nickname, profile_image_url, auth_user_id')
                .eq('auth_user_id', commentData.user_id)
                .maybeSingle()
              
              targetAuthor = author
              
              console.log('🔍 댓글 작성자 조회:', {
                comment_user_id: commentData.user_id,
                found: !!author,
                author_name: author?.full_name
              })
            }
            
            // 댓글이 속한 게시글 정보도 조회
            if (commentData.post_id) {
              const { data: postData } = await supabase
                .from('community_posts')
                .select('id, content, author_name, location, category')
                .eq('id', commentData.post_id)
                .single()
              if (postData) {
                targetData.post = postData
              }
            }
          }
        } else if ((inferredTargetType === 'review' || inferredTargetType === 'review_image') && targetId) {
          // 칭찬 (리뷰) 또는 리뷰 이미지 신고
          // 원본 target_type에서 facility_type 추론
          let facilityType = report.facility_type
          if (!facilityType && report.target_type) {
            if (report.target_type === 'kindergarten_review' || report.target_type === 'kindergarten_review_image') facilityType = 'kindergarten'
            else if (report.target_type === 'childcare_review' || report.target_type === 'childcare_review_image') facilityType = 'childcare'
            else if (report.target_type === 'playground_review' || report.target_type === 'playground_review_image') facilityType = 'playground'
          }
          
          console.log('🔍 리뷰 신고 처리:', { facilityType, targetId })
          
          let reviewData: any = null
          
          if (facilityType === 'kindergarten') {
            const { data: review } = await supabase
              .from('kindergarten_reviews')
              .select('id, content, user_id, kindergarten_code, kindergarten_name, rating')
              .eq('id', targetId)
              .single()
            reviewData = review
            
            // 리뷰 이미지 조회
            if (reviewData) {
              const { data: reviewImages } = await supabase
                .from('kindergarten_review_images')
                .select('image_url, image_order')
                .eq('review_id', reviewData.id)
                .order('image_order', { ascending: true })
              
              reviewData.images = reviewImages || []
            }
          } else if (facilityType === 'childcare') {
            const { data: review } = await supabase
              .from('childcare_reviews')
              .select('id, content, user_id, childcare_code, childcare_name, rating')
              .eq('id', targetId)
              .single()
            reviewData = review
            
            // 리뷰 이미지 조회
            if (reviewData) {
              const { data: reviewImages } = await supabase
                .from('childcare_review_images')
                .select('image_url, image_order')
                .eq('review_id', reviewData.id)
                .order('image_order', { ascending: true })
              
              reviewData.images = reviewImages || []
            }
          } else if (facilityType === 'playground') {
            const { data: review } = await supabase
              .from('playground_reviews')
              .select('id, content, user_id, playground_id, playground_name, rating')
              .eq('id', targetId)
              .single()
            reviewData = review
            
            // 리뷰 이미지 조회 (playground_review_images 테이블이 있다고 가정)
            if (reviewData) {
              const { data: reviewImages } = await supabase
                .from('playground_review_images')
                .select('image_url, image_order')
                .eq('review_id', reviewData.id)
                .order('image_order', { ascending: true })
              
              reviewData.images = reviewImages || []
            }
          }
          
          if (reviewData) {
            // 이미지 URL 배열로 변환
            const imageUrls = (reviewData.images || []).map((img: any) => img.image_url || img)
            
            // admin_notes에서 이미지 신고 정보 파싱
            let reportedImageUrl: string | null = null
            let facilityAddress: string | null = null
            
            if (report.admin_notes) {
              try {
                const adminNotesData = JSON.parse(report.admin_notes)
                reportedImageUrl = adminNotesData.reported_image_url || null
                facilityAddress = adminNotesData.facility_address || null
              } catch (e) {
                // JSON 파싱 실패 시 무시
                console.warn('admin_notes 파싱 실패:', e)
              }
            }
            
            // 칭찬 사진 신고인 경우 신고된 이미지만 표시, 칭찬글 신고인 경우 모든 이미지 표시
            const displayImages = isImageReport && reportedImageUrl 
              ? [reportedImageUrl] // 칭찬 사진 신고: 신고된 이미지 1개만
              : imageUrls // 칭찬글 신고: 모든 이미지
            
            targetData = {
              type: isImageReport ? 'review_image' : 'review',
              id: reviewData.id,
              content: reviewData.content,
              rating: reviewData.rating,
              images: displayImages,
              reported_image_url: reportedImageUrl, // 신고된 특정 이미지 URL
              facility_type: facilityType || report.facility_type,
              facility_code: report.facility_code || reviewData.kindergarten_code || reviewData.childcare_code || reviewData.playground_id,
              facility_name: report.facility_name || reviewData.kindergarten_name || reviewData.childcare_name || reviewData.playground_name,
              facility_address: facilityAddress || null // 시설 주소
            }
            
            console.log('✅ 리뷰 데이터 조회 성공:', {
              facility_type: targetData.facility_type,
              facility_name: targetData.facility_name,
              facility_address: targetData.facility_address,
              hasContent: !!targetData.content,
              imageCount: imageUrls.length,
              reportedImageUrl: reportedImageUrl
            })
            
            // 리뷰 작성자 정보 조회 (user_id는 auth_user_id)
            if (reviewData.user_id) {
              const { data: author } = await supabase
                .from('profiles')
                .select('id, full_name, nickname, profile_image_url, auth_user_id')
                .eq('auth_user_id', reviewData.user_id)
                .single()
              targetAuthor = author
            }
          }
        } else if (inferredTargetType === 'building_image') {
          // 건물사진 신고 처리
          let facilityType = report.facility_type
          
          // admin_notes에서 건물사진 정보 파싱
          let reportedImageUrl: string | null = null
          let facilityAddress: string | null = null
          
          if (report.admin_notes) {
            try {
              const adminNotesData = JSON.parse(report.admin_notes)
              reportedImageUrl = adminNotesData.reported_image_url || null
              facilityAddress = adminNotesData.facility_address || null
            } catch (e) {
              console.warn('admin_notes 파싱 실패:', e)
            }
          }
          
          targetData = {
            type: 'building_image',
            reported_image_url: reportedImageUrl,
            facility_type: facilityType,
            facility_code: report.facility_code,
            facility_name: report.facility_name,
            facility_address: facilityAddress
          }
          
          console.log('✅ 건물사진 신고 데이터:', {
            facility_type: targetData.facility_type,
            facility_name: targetData.facility_name,
            facility_code: targetData.facility_code,
            reported_image_url: targetData.reported_image_url
          })
        } else if (inferredTargetType === 'meal_image') {
          // 급식사진 신고 처리
          let facilityType = report.facility_type
          
          // admin_notes에서 급식사진 정보 파싱
          let reportedImageUrl: string | null = null
          let facilityAddress: string | null = null
          
          if (report.admin_notes) {
            try {
              const adminNotesData = JSON.parse(report.admin_notes)
              reportedImageUrl = adminNotesData.reported_image_url || null
              facilityAddress = adminNotesData.facility_address || null
            } catch (e) {
              console.warn('admin_notes 파싱 실패:', e)
            }
          }
          
          targetData = {
            type: 'meal_image',
            reported_image_url: reportedImageUrl,
            facility_type: facilityType,
            facility_code: report.facility_code,
            facility_name: report.facility_name,
            facility_address: facilityAddress
          }
          
          console.log('✅ 급식사진 신고 데이터:', {
            facility_type: targetData.facility_type,
            facility_name: targetData.facility_name,
            facility_code: targetData.facility_code,
            reported_image_url: targetData.reported_image_url
          })
        }

        const result = {
          ...report,
          target_type: inferredTargetType || normalizedTargetType || report.target_type,
          reporter: reporter || null,
          target: targetData,
          targetAuthor: targetAuthor || null
        }
        
        // facility_type이 없으면 원본 target_type에서 추론
        if (!result.facility_type && report.target_type) {
          if (report.target_type === 'kindergarten_review') result.facility_type = 'kindergarten'
          else if (report.target_type === 'childcare_review') result.facility_type = 'childcare'
          else if (report.target_type === 'playground_review') result.facility_type = 'playground'
        }
        
        console.log('✅ 신고 처리 완료:', {
          id: result.id,
          target_type: result.target_type,
          hasTarget: !!result.target,
          hasTargetAuthor: !!result.targetAuthor
        })
        
        return result
      })
    )

    return NextResponse.json({ 
      reports: reportsWithDetails,
      count: reportsWithDetails.length
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      reports: []
    }, { status: 500 })
  }
}

