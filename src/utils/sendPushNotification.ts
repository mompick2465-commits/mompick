import { supabase } from '../lib/supabase'

/**
 * FCM 푸시 알림 전송 (Supabase Edge Function 호출)
 */
export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: { [key: string]: string }
) => {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-fcm-push', {
      body: {
        userId,
        title,
        body,
        data,
      },
    })

    if (error) {
      console.error('❌ 푸시 알림 전송 오류:', error)
      return false
    }

    console.log('📤 푸시 알림 전송 결과:', result)
    
    // 실패한 경우 상세 정보 출력
    if (result && result.failed > 0) {
      console.warn('⚠️ 푸시 알림 일부 전송 실패 (일부 기기에서만 실패):')
      console.warn('  - 성공:', result.sent, '개 기기')
      console.warn('  - 실패:', result.failed, '개 기기')
      console.warn('  - 전체 토큰 수:', result.tokensCount)
      
      if (result.failures && result.failures.length > 0) {
        console.warn('  - 실패 상세:')
        result.failures.forEach((failure: any, index: number) => {
          const isInvalidToken = failure.isInvalidToken || 
                                 failure.error?.includes('NOT_FOUND') ||
                                 failure.error?.includes('UNREGISTERED')
          
          if (isInvalidToken) {
            console.warn(`    [${index + 1}] 플랫폼: ${failure.platform} - 유효하지 않은 토큰 (자동 삭제됨)`)
            console.warn(`         오류: ${failure.error}`)
            console.warn(`         → 이 토큰은 자동으로 데이터베이스에서 삭제되었습니다.`)
          } else {
            console.warn(`    [${index + 1}] 플랫폼: ${failure.platform}`)
            console.warn(`         오류: ${failure.error}`)
          }
        })
      }
      
      // 일부 성공한 경우에는 경고만 출력 (에러가 아님)
      if (result.sent > 0) {
        console.log('✅ 일부 기기에는 성공적으로 전송되었습니다.')
      }
    }
    
    return result?.sent > 0
  } catch (error) {
    console.error('푸시 알림 전송 중 오류:', error)
    return false
  }
}


