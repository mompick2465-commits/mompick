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
      console.error('❌ 푸시 알림 전송 실패 상세:')
      console.error('  - 성공:', result.sent)
      console.error('  - 실패:', result.failed)
      console.error('  - 전체 토큰 수:', result.tokensCount)
      if (result.failures && result.failures.length > 0) {
        console.error('  - 실패 상세:')
        result.failures.forEach((failure: any, index: number) => {
          console.error(`    [${index + 1}] 플랫폼: ${failure.platform}`)
          console.error(`         오류: ${failure.error}`)
        })
      }
    }
    
    return result?.sent > 0
  } catch (error) {
    console.error('푸시 알림 전송 중 오류:', error)
    return false
  }
}


