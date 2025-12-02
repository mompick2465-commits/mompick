import { supabase } from '../lib/supabase'
import { sendPushNotification } from './sendPushNotification'
import { canReceiveNotification } from './notificationSettings'

// 알림 생성 함수 (새로운 스키마 사용)
export const createNotification = async (
  type: 'like' | 'reply' | 'comment' | 'review_like',
  postId: string,
  fromUserId: string,
  fromUserName: string,
  fromUserProfileImage: string,
  toUserId: string,
  commentId?: string
) => {
  try {
    // 자기 자신에게는 알림을 보내지 않음 (애플리케이션 레벨 체크)
    // toUserId를 profile ID로 변환한 후 체크
    let targetProfileId = toUserId;
    
    if (toUserId.length === 36 && toUserId.includes('-')) {
      // auth_user_id인 경우 profile ID로 변환
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id, auth_user_id, full_name')
        .eq('auth_user_id', toUserId)
        .maybeSingle();
        
      if (targetProfile) {
        targetProfileId = targetProfile.id;
      }
    }
    
    if (fromUserId === targetProfileId) {
      console.log('자기 자신에게는 알림을 보내지 않습니다.')
      return
    }

    // 현재 인증된 사용자의 profile id 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    const currentAuthUserId = user?.id

    if (!currentAuthUserId) {
      console.error('인증된 사용자 정보를 가져올 수 없습니다.')
      return null
    }

    // 현재 사용자의 profile id 가져오기
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', currentAuthUserId)
      .single()

    if (profileError || !profileData) {
      console.error('프로필 정보를 가져올 수 없습니다:', profileError)
      return null
    }

    const currentProfileId = profileData.id

    console.log('=== 알림 생성 디버깅 ===')
    console.log('currentAuthUserId:', currentAuthUserId)
    console.log('currentProfileId:', currentProfileId)
    console.log('fromUserId (파라미터):', fromUserId)
    console.log('toUserId:', toUserId)
    console.log('toUserId 타입 추정:', toUserId.length === 36 && toUserId.includes('-') ? 'UUID (auth_user_id 또는 id)' : 'Profile ID')
    console.log('type:', type)
    console.log('postId:', postId)

    // toUserId가 Auth UID인지 Profile ID인지 확인하고 Profile ID로 변환
    targetProfileId = toUserId;
    
    // toUserId가 Auth UID인지 Profile ID인지 정확히 판단
    if (toUserId.length === 36 && toUserId.includes('-')) {
      console.log('UUID 형식 감지, 정확한 타입 확인 중:', toUserId);
      
      // 먼저 auth_user_id로 검색 (더 일반적인 경우)
      const { data: targetProfile, error: targetError } = await supabase
        .from('profiles')
        .select('id, auth_user_id, full_name')
        .eq('auth_user_id', toUserId)
        .maybeSingle();
        
      if (targetProfile) {
        // Auth UID인 경우 Profile ID로 변환
        targetProfileId = targetProfile.id;
        console.log('Auth UID를 Profile ID로 변환:', toUserId, '->', targetProfileId);
      } else {
        // auth_user_id로 찾지 못한 경우, id로 검색 시도
        const { data: profileById, error: errorById } = await supabase
          .from('profiles')
          .select('id, auth_user_id, full_name')
          .eq('id', toUserId)
          .maybeSingle();
          
        if (profileById) {
          // 이미 Profile ID인 경우
          targetProfileId = profileById.id;
          console.log('이미 Profile ID였음:', toUserId);
        } else {
          console.error('대상 사용자의 프로필을 찾을 수 없습니다:', toUserId);
          console.error('auth_user_id 조회 오류:', targetError);
          console.error('id 조회 오류:', errorById);
          return null;
        }
      }
    } else {
      console.log('Profile ID로 판단됨:', toUserId);
    }

    // 이미 같은 알림이 있는지 확인 (중복 방지)
    let existingNotificationQuery = supabase
      .from('notifications')
      .select('id')
      .eq('type', type)
      .eq('post_id', postId)
      .eq('from_user_id', currentProfileId) // profile id 사용
      .eq('to_user_id', targetProfileId) // 새로운 스키마: to_user_id
      .eq('is_read', false)

    // 답글 알림의 경우 comment_id도 함께 고려
    if (type === 'reply' && commentId) {
      existingNotificationQuery = existingNotificationQuery.eq('comment_id', commentId)
    }

    const { data: existingNotification } = await existingNotificationQuery.maybeSingle()

    if (existingNotification) {
      console.log('이미 존재하는 알림이 있습니다.')
      return
    }

    // 새로운 스키마에 맞는 알림 데이터 생성
    const notificationData = {
      type,
      post_id: postId,
      comment_id: commentId,
      from_user_id: currentProfileId, // profile id 사용
      to_user_id: targetProfileId, // 새로운 스키마: to_user_id
      payload: {
        from_user_name: fromUserName,
        from_user_profile_image: fromUserProfileImage,
        post_title: '', // 필요시 추가
        comment_content: '' // 필요시 추가
      },
      is_read: false
    }
    
    console.log('삽입할 데이터:', notificationData)
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single()

    if (error) {
      console.error('알림 생성 오류:', error)
      return null
    }

    console.log('알림 생성 성공:', data)

    // 알림 타입을 FCM 알림 타입으로 매핑
    const fcmNotificationType = type === 'like' ? 'like' : 
                                 type === 'comment' ? 'comment' : 
                                 type === 'reply' ? 'reply' : 
                                 type === 'review_like' ? 'review_like' : 
                                 'notice'

    // 사용자 알림 설정 확인 (공지사항은 항상 전송)
    if (fcmNotificationType !== 'notice') {
      const canReceive = await canReceiveNotification(targetProfileId, fcmNotificationType)
      if (!canReceive) {
        console.log(`사용자가 ${fcmNotificationType} 알림을 받지 않도록 설정했습니다. FCM 전송을 건너뜁니다.`)
        // 알림은 DB에 저장되지만 FCM은 전송하지 않음
        return data
      }
    }

    // FCM 푸시 알림 전송 (비동기, 실패해도 알림은 생성됨)
    const notificationTitle = getNotificationTitle(type, fromUserName)
    const notificationBody = getNotificationBody(type, fromUserName, notificationData.payload)
    
    sendPushNotification(
      targetProfileId,
      notificationTitle,
      notificationBody,
      {
        notificationId: data.id,
        type: fcmNotificationType,
        postId: postId,
        ...(commentId && { commentId: commentId })
      }
    ).catch(error => {
      console.error('FCM 푸시 알림 전송 실패:', error)
    })

    return data
  } catch (error) {
    console.error('알림 생성 오류:', error)
    return null
  }
}

// 좋아요 알림 생성
export const createLikeNotification = async (
  postId: string,
  fromUserId: string,
  fromUserName: string,
  fromUserProfileImage: string,
  toUserId: string
) => {
  return await createNotification(
    'like',
    postId,
    fromUserId,
    fromUserName,
    fromUserProfileImage,
    toUserId
  )
}

// 답글 알림 생성
export const createReplyNotification = async (
  postId: string,
  commentId: string,
  fromUserId: string,
  fromUserName: string,
  fromUserProfileImage: string,
  toUserId: string
) => {
  return await createNotification(
    'reply',
    postId,
    fromUserId,
    fromUserName,
    fromUserProfileImage,
    toUserId,
    commentId
  )
}

// 댓글 알림 생성
export const createCommentNotification = async (
  postId: string,
  commentId: string,
  fromUserId: string,
  fromUserName: string,
  fromUserProfileImage: string,
  toUserId: string
) => {
  return await createNotification(
    'comment',
    postId,
    fromUserId,
    fromUserName,
    fromUserProfileImage,
    toUserId,
    commentId
  )
}

// 리뷰 좋아요 알림 생성
export const createReviewLikeNotification = async (
  reviewId: string,
  kindergartenName: string,
  fromUserId: string,
  fromUserName: string,
  fromUserProfileImage: string,
  toUserId: string
) => {
  try {
    // 자기 자신에게는 알림을 보내지 않음
    if (fromUserId === toUserId) {
      console.log('자기 자신에게는 알림을 보내지 않습니다.')
      return
    }

    // 현재 인증된 사용자의 profile id 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    const currentAuthUserId = user?.id

    if (!currentAuthUserId) {
      console.error('인증된 사용자 정보를 가져올 수 없습니다.')
      return null
    }

    // 현재 사용자의 profile id 가져오기
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', currentAuthUserId)
      .single()

    if (profileError || !profileData) {
      console.error('프로필 정보를 가져올 수 없습니다:', profileError)
      return null
    }

    const currentProfileId = profileData.id

    // toUserId를 profile ID로 변환
    let targetProfileId = toUserId;
    
    if (toUserId.length === 36 && toUserId.includes('-')) {
      const { data: targetProfile, error: targetError } = await supabase
        .from('profiles')
        .select('id, auth_user_id, full_name')
        .eq('auth_user_id', toUserId)
        .maybeSingle();
        
      if (targetProfile) {
        targetProfileId = targetProfile.id;
      } else {
        const { data: profileById, error: errorById } = await supabase
          .from('profiles')
          .select('id, auth_user_id, full_name')
          .eq('id', toUserId)
          .maybeSingle();
          
        if (profileById) {
          targetProfileId = profileById.id;
        } else {
          console.error('대상 사용자의 프로필을 찾을 수 없습니다:', toUserId);
          return null;
        }
      }
    }

    // 이미 같은 알림이 있는지 확인 (중복 방지)
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'review_like')
      .eq('comment_id', reviewId) // 리뷰 ID를 comment_id 필드에 저장
      .eq('from_user_id', currentProfileId)
      .eq('to_user_id', targetProfileId)
      .eq('is_read', false)
      .maybeSingle()

    if (existingNotification) {
      console.log('이미 존재하는 리뷰 좋아요 알림이 있습니다.')
      return
    }

    // 리뷰 좋아요 알림 데이터 생성
    const notificationData = {
      type: 'review_like',
      post_id: null, // post_id는 null로 설정
      comment_id: reviewId, // 리뷰 ID를 comment_id 필드에 저장
      from_user_id: currentProfileId,
      to_user_id: targetProfileId,
      payload: {
        from_user_name: fromUserName,
        from_user_profile_image: fromUserProfileImage,
        kindergarten_name: kindergartenName,
        message: `${kindergartenName} 칭찬에 ${fromUserName}님이 하트를 눌렀습니다.`
      },
      is_read: false
    }
    
    console.log('리뷰 좋아요 알림 생성:', notificationData)
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single()

    if (error) {
      console.error('리뷰 좋아요 알림 생성 오류:', error)
      return null
    }

    console.log('리뷰 좋아요 알림 생성 성공:', data)

    // FCM 푸시 알림 전송 (비동기, 실패해도 알림은 생성됨)
    const notificationTitle = `${fromUserName}님이 하트를 눌렀습니다`
    const notificationBody = `${kindergartenName} 칭찬에 ${fromUserName}님이 하트를 눌렀습니다.`
    
    sendPushNotification(
      targetProfileId,
      notificationTitle,
      notificationBody,
      {
        notificationId: data.id,
        type: 'review_like',
        reviewId: reviewId
      }
    ).catch(error => {
      console.error('FCM 푸시 알림 전송 실패:', error)
    })

    return data
  } catch (error) {
    console.error('리뷰 좋아요 알림 생성 오류:', error)
    return null
  }
}

// 알림 타입에 따른 제목 생성
const getNotificationTitle = (type: 'like' | 'reply' | 'comment' | 'review_like', fromUserName: string): string => {
  switch (type) {
    case 'like':
      return '새로운 좋아요'
    case 'reply':
      return '새로운 답글'
    case 'comment':
      return '새로운 댓글'
    case 'review_like':
      return '새로운 하트'
    default:
      return '새로운 알림'
  }
}

// 알림 타입에 따른 본문 생성
const getNotificationBody = (
  type: 'like' | 'reply' | 'comment' | 'review_like',
  fromUserName: string,
  payload: any
): string => {
  switch (type) {
    case 'like':
      return `${fromUserName}님이 회원님의 게시글에 하트를 눌렀습니다.`
    case 'reply':
      return `${fromUserName}님이 회원님의 댓글에 답글을 달았습니다.`
    case 'comment':
      return `${fromUserName}님이 회원님의 게시글에 댓글을 달았습니다.`
    case 'review_like':
      return `${payload.kindergarten_name || ''} 칭찬에 ${fromUserName}님이 하트를 눌렀습니다.`
    default:
      return `${fromUserName}님으로부터 새로운 알림이 있습니다.`
  }
}

// 리뷰 좋아요 알림 삭제
export const deleteReviewLikeNotification = async (
  reviewId: string,
  fromUserId: string,
  toUserId: string
) => {
  try {
    console.log('=== 리뷰 좋아요 알림 삭제 디버깅 ===')
    console.log('reviewId:', reviewId)
    console.log('fromUserId:', fromUserId)
    console.log('toUserId:', toUserId)

    // toUserId를 profile ID로 변환
    let targetProfileId = toUserId;
    
    if (toUserId.length === 36 && toUserId.includes('-')) {
      const { data: targetProfile, error: targetError } = await supabase
        .from('profiles')
        .select('id, auth_user_id, full_name')
        .eq('auth_user_id', toUserId)
        .maybeSingle();
        
      if (targetProfile) {
        targetProfileId = targetProfile.id;
      } else {
        const { data: profileById, error: errorById } = await supabase
          .from('profiles')
          .select('id, auth_user_id, full_name')
          .eq('id', toUserId)
          .maybeSingle();
          
        if (profileById) {
          targetProfileId = profileById.id;
        } else {
          console.error('대상 사용자의 프로필을 찾을 수 없습니다:', toUserId);
          return null;
        }
      }
    }

    // 현재 사용자의 profile id 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    const currentAuthUserId = user?.id

    if (!currentAuthUserId) {
      console.error('인증된 사용자 정보를 가져올 수 없습니다.')
      return null
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', currentAuthUserId)
      .single()

    if (profileError || !profileData) {
      console.error('프로필 정보를 가져올 수 없습니다:', profileError)
      return null
    }

    const currentProfileId = profileData.id

    // 리뷰 좋아요 알림 삭제
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('type', 'review_like')
      .eq('comment_id', reviewId) // 리뷰 ID를 comment_id 필드에 저장
      .eq('from_user_id', currentProfileId)
      .eq('to_user_id', targetProfileId)

    if (error) {
      console.error('리뷰 좋아요 알림 삭제 오류:', error)
      return null
    }

    console.log('리뷰 좋아요 알림 삭제 성공')
    return true
  } catch (error) {
    console.error('리뷰 좋아요 알림 삭제 오류:', error)
    return null
  }
}

// 좋아요 알림 삭제
export const deleteLikeNotification = async (
  postId: string,
  fromUserId: string,
  toUserId: string
) => {
  try {
    console.log('=== 좋아요 알림 삭제 디버깅 ===')
    console.log('postId:', postId)
    console.log('fromUserId:', fromUserId)
    console.log('toUserId:', toUserId)

    // toUserId가 Auth UID인지 Profile ID인지 확인하고 Profile ID로 변환
    let targetProfileId = toUserId;
    
    if (toUserId.length === 36 && toUserId.includes('-')) {
      console.log('UUID 형식 감지, 정확한 타입 확인 중:', toUserId);
      
      // 먼저 auth_user_id로 검색
      const { data: targetProfile, error: targetError } = await supabase
        .from('profiles')
        .select('id, auth_user_id, full_name')
        .eq('auth_user_id', toUserId)
        .maybeSingle();
        
      if (targetProfile) {
        targetProfileId = targetProfile.id;
        console.log('Auth UID를 Profile ID로 변환:', toUserId, '->', targetProfileId);
      } else {
        // auth_user_id로 찾지 못한 경우, id로 검색 시도
        const { data: profileById, error: errorById } = await supabase
          .from('profiles')
          .select('id, auth_user_id, full_name')
          .eq('id', toUserId)
          .maybeSingle();
          
        if (profileById) {
          targetProfileId = profileById.id;
          console.log('이미 Profile ID였음:', toUserId);
        } else {
          console.error('대상 사용자의 프로필을 찾을 수 없습니다:', toUserId);
          return null;
        }
      }
    }

    // 현재 사용자의 profile id 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    const currentAuthUserId = user?.id

    if (!currentAuthUserId) {
      console.error('인증된 사용자 정보를 가져올 수 없습니다.')
      return null
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', currentAuthUserId)
      .single()

    if (profileError || !profileData) {
      console.error('프로필 정보를 가져올 수 없습니다:', profileError)
      return null
    }

    const currentProfileId = profileData.id

    // 해당 좋아요 알림 삭제
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('type', 'like')
      .eq('post_id', postId)
      .eq('from_user_id', currentProfileId)
      .eq('to_user_id', targetProfileId)

    if (error) {
      console.error('좋아요 알림 삭제 오류:', error)
      return null
    }

    console.log('좋아요 알림 삭제 성공')
    return true
  } catch (error) {
    console.error('좋아요 알림 삭제 오류:', error)
    return null
  }
}

// 읽지 않은 알림 개수 가져오기 (일반 공지사항 제외, 긴급 알림 포함)
export const getUnreadNotificationCount = async (userId: string) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('to_user_id', userId) // 새로운 스키마: to_user_id
      .eq('is_read', false)
      .neq('type', 'notice') // 일반 공지사항만 제외 (긴급 알림은 포함)

    if (error) {
      console.error('알림 개수 조회 오류:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('알림 개수 조회 오류:', error)
    return 0
  }
}
