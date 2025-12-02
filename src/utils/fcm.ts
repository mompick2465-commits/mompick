import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { Device } from '@capacitor/device'
import { supabase } from '../lib/supabase'

// FCM 리스너가 이미 등록되었는지 확인
let listenersRegistered = false
// iOS에서 AppDelegate에서 받은 FCM 토큰을 임시 저장
let pendingFCMToken: string | null = null

// iOS FCM 토큰 이벤트 리스너를 앱 시작 시점에 등록
if (typeof window !== 'undefined' && Capacitor.getPlatform() === 'ios') {
  // 이벤트 리스너 등록
  window.addEventListener('fcmTokenReceived', async (event: any) => {
    const token = event.detail
    console.log('✅ iOS FCM 토큰 수신 (AppDelegate에서, 앱 시작 시):', token)
    
    // 항상 pendingFCMToken에 저장 (initializeFCM에서 처리)
    console.log('🔔 FCM 토큰 임시 저장 (초기화 시 저장됨)')
    pendingFCMToken = token
    
    // 이미 초기화되었으면 즉시 저장 시도
    if (listenersRegistered) {
      console.log('🔔 FCM이 이미 초기화됨 - 토큰 저장 시도')
      // saveFCMToken은 아래에서 정의되므로 여기서는 pendingFCMToken에만 저장
      // initializeFCM에서 pendingFCMToken을 확인하여 저장
    }
  })
  
  // WebView 로드 완료 후 window._pendingFCMToken 확인
  const checkPendingToken = () => {
    // AppDelegate에서 저장한 토큰이 있는지 확인
    if ((window as any)._pendingFCMToken) {
      const token = (window as any)._pendingFCMToken
      console.log('✅ WebView 로드 후 저장된 FCM 토큰 발견:', token.substring(0, 20) + '...')
      pendingFCMToken = token
      // 이벤트도 발생시켜 리스너가 처리하도록
      const event = new CustomEvent('fcmTokenReceived', { detail: token })
      window.dispatchEvent(event)
      // 전역 변수 제거
      delete (window as any)._pendingFCMToken
    }
  }
  
  if (document.readyState === 'complete') {
    checkPendingToken()
  } else {
    window.addEventListener('load', checkPendingToken)
  }
}

export const initializeFCM = async () => {
  const platform = Capacitor.getPlatform()
  console.log('🔔 FCM 초기화 시작 - 플랫폼:', platform)
  
  if (platform === 'web') {
    console.log('웹 플랫폼에서는 FCM을 초기화하지 않습니다.')
    return
  }

  try {
    console.log('🔔 권한 확인 중...')
    let permStatus = await PushNotifications.checkPermissions()
    console.log('🔔 현재 권한 상태:', permStatus)

    if (permStatus.receive === 'prompt') {
      console.log('🔔 권한 요청 중...')
      permStatus = await PushNotifications.requestPermissions()
      console.log('🔔 권한 요청 결과:', permStatus)
    }

    if (permStatus.receive !== 'granted') {
      console.error('❌ 푸시 알림 권한이 거부되었습니다. 상태:', permStatus.receive)
      return
    }

    console.log('✅ 푸시 알림 권한 승인됨')

    // 리스너는 한 번만 등록
    if (!listenersRegistered) {
      console.log('🔔 FCM 리스너 등록 중...')
      
      PushNotifications.addListener('registration', async (token: { value: string }) => {
        console.log('✅ FCM 토큰 수신:', token.value)
        console.log('🔔 토큰 저장 시작...')
        await saveFCMToken(token.value)
      })

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('❌ FCM 토큰 등록 오류:', error)
      })

      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('📱 푸시 알림 수신 (포그라운드):', notification)
      })

      PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
        console.log('👆 푸시 알림 클릭:', notification)
      })
      
      listenersRegistered = true
      console.log('✅ FCM 리스너 등록 완료')
    } else {
      console.log('ℹ️ FCM 리스너는 이미 등록되어 있습니다.')
    }
    
    // iOS에서 토큰 확인 및 저장 (리스너 등록 후 항상 확인)
    if (platform === 'ios') {
      console.log('🔍 iOS 토큰 확인 시작...')
      console.log('🔍 pendingFCMToken:', pendingFCMToken ? pendingFCMToken.substring(0, 20) + '...' : '없음')
      console.log('🔍 window._pendingFCMToken:', (window as any)._pendingFCMToken ? ((window as any)._pendingFCMToken as string).substring(0, 20) + '...' : '없음')
      
      // 1. pendingFCMToken 확인
      if (pendingFCMToken) {
        console.log('🔔 이미 받은 iOS FCM 토큰 저장 (pendingFCMToken):', pendingFCMToken.substring(0, 20) + '...')
        try {
          await saveFCMToken(pendingFCMToken)
          console.log('✅ pendingFCMToken 저장 완료')
        } catch (error) {
          console.error('❌ pendingFCMToken 저장 실패:', error)
        }
        pendingFCMToken = null
      } else {
        console.log('ℹ️ pendingFCMToken이 없습니다.')
      }
      
      // 2. window._pendingFCMToken 확인 (AppDelegate에서 저장한 토큰)
      if ((window as any)._pendingFCMToken) {
        const token = (window as any)._pendingFCMToken
        console.log('🔔 AppDelegate에서 저장한 FCM 토큰 발견:', token.substring(0, 20) + '...')
        try {
          await saveFCMToken(token)
          console.log('✅ window._pendingFCMToken 저장 완료')
        } catch (error) {
          console.error('❌ window._pendingFCMToken 저장 실패:', error)
        }
        delete (window as any)._pendingFCMToken
      } else {
        console.log('ℹ️ window._pendingFCMToken이 없습니다.')
      }
      
      // 3. 지연 후 window._pendingFCMToken 다시 확인
      setTimeout(async () => {
        console.log('🔍 지연 후 토큰 재확인...')
        console.log('🔍 window._pendingFCMToken:', (window as any)._pendingFCMToken ? ((window as any)._pendingFCMToken as string).substring(0, 20) + '...' : '없음')
        if ((window as any)._pendingFCMToken) {
          const token = (window as any)._pendingFCMToken
          console.log('🔔 지연 후 AppDelegate에서 저장한 FCM 토큰 재확인:', token.substring(0, 20) + '...')
          try {
            await saveFCMToken(token)
            console.log('✅ 지연 후 토큰 저장 완료')
          } catch (error) {
            console.error('❌ 지연 후 토큰 저장 실패:', error)
          }
          delete (window as any)._pendingFCMToken
        } else {
          console.log('ℹ️ 지연 후에도 window._pendingFCMToken이 없습니다.')
        }
      }, 2000) // 2초로 증가
    }

    // 토큰 등록 (이미 등록되어 있어도 다시 호출하면 토큰을 받을 수 있음)
    console.log('🔔 PushNotifications.register() 호출 중...')
    await PushNotifications.register()
    console.log('✅ PushNotifications.register() 완료 - 토큰은 registration 리스너에서 받을 수 있습니다.')

    console.log('✅ FCM 초기화 완료')
  } catch (error) {
    console.error('❌ FCM 초기화 오류:', error)
    console.error('❌ 오류 상세:', JSON.stringify(error, null, 2))
  }
}

export const saveFCMToken = async (token: string) => {
  try {
    console.log('🔔 saveFCMToken 시작 - 토큰:', token.substring(0, 20) + '...')
    console.log('🔔 플랫폼:', Capacitor.getPlatform())
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔔 Auth 사용자 확인:', user ? `있음 (${user.id})` : '없음')
    if (authError) {
      console.error('❌ Auth 사용자 조회 오류:', authError)
      console.error('❌ Auth 오류 상세:', JSON.stringify(authError, null, 2))
    }
    
    if (!user) {
      console.log('🔔 OAuth 사용자 없음, 전화번호 로그인 확인 중...')
      const isLoggedIn = localStorage.getItem('isLoggedIn')
      const userProfile = localStorage.getItem('userProfile')
      
      console.log('🔔 localStorage 확인:', { isLoggedIn, hasUserProfile: !!userProfile })
      
      if (isLoggedIn !== 'true' || !userProfile) {
        console.error('❌ 로그인되지 않은 사용자입니다. 토큰 저장 불가.')
        console.error('❌ isLoggedIn:', isLoggedIn)
        console.error('❌ userProfile:', userProfile ? '있음' : '없음')
        return
      }
      
      try {
        const profile = JSON.parse(userProfile)
        console.log('🔔 프로필 ID (전화번호):', profile.id)
        await saveTokenForProfile(profile.id, token)
      } catch (parseError) {
        console.error('❌ 프로필 파싱 오류:', parseError)
        return
      }
      return
    }

    console.log('🔔 프로필 조회 중... (auth_user_id:', user.id, ')')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('❌ 프로필 조회 오류:', profileError)
      console.error('❌ 프로필 오류 상세:', JSON.stringify(profileError, null, 2))
      return
    }

    if (!profileData) {
      console.error('❌ 프로필을 찾을 수 없습니다.')
      console.error('❌ auth_user_id:', user.id)
      return
    }

    console.log('🔔 프로필 ID (OAuth):', profileData.id)
    await saveTokenForProfile(profileData.id, token)
  } catch (error) {
    console.error('❌ FCM 토큰 저장 오류:', error)
    console.error('❌ 오류 상세:', JSON.stringify(error, null, 2))
    if (error instanceof Error) {
      console.error('❌ 오류 스택:', error.stack)
    }
  }
}

const saveTokenForProfile = async (profileId: string, token: string) => {
  try {
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
    
    // 기기 ID 가져오기
    let deviceId: string | null = null
    try {
      const deviceInfo = await Device.getId()
      deviceId = deviceInfo.identifier || null
      console.log('🔔 기기 ID:', deviceId)
    } catch (deviceError) {
      console.warn('⚠️ 기기 ID 가져오기 실패:', deviceError)
      // 기기 ID를 가져오지 못해도 계속 진행
    }
    
    console.log('🔔 saveTokenForProfile 시작:', { 
      profileId, 
      platform, 
      deviceId,
      tokenLength: token.length 
    })
    
    // 1. 같은 기기, 같은 사용자의 기존 토큰 확인
    let existingTokenByDevice = null
    let checkDeviceError = null
    
    if (deviceId) {
      // device_id가 있는 경우: 같은 device_id로 검색
      const result = await supabase
        .from('fcm_tokens')
        .select('id, user_id, token, device_id')
        .eq('user_id', profileId)
        .eq('device_id', deviceId)
        .maybeSingle()
      
      existingTokenByDevice = result.data
      checkDeviceError = result.error
    } else {
      // device_id가 NULL인 경우: 같은 사용자의 device_id가 NULL인 토큰 검색
      const result = await supabase
        .from('fcm_tokens')
        .select('id, user_id, token, device_id')
        .eq('user_id', profileId)
        .is('device_id', null)
        .maybeSingle()
      
      existingTokenByDevice = result.data
      checkDeviceError = result.error
    }

    if (checkDeviceError && checkDeviceError.code !== 'PGRST116') {
      console.error('❌ 기기별 토큰 확인 오류:', checkDeviceError)
    }

    // 2. 같은 토큰이 이미 존재하는지 확인 (전체 범위)
    const { data: existingTokenByToken, error: checkTokenError } = await supabase
      .from('fcm_tokens')
      .select('id, user_id, token, device_id')
      .eq('token', token)
      .maybeSingle()

    if (checkTokenError && checkTokenError.code !== 'PGRST116') {
      console.error('❌ 토큰 확인 오류:', checkTokenError)
      return
    }

    console.log('🔔 기존 토큰 확인:', {
      같은기기토큰: existingTokenByDevice ? `있음 (token: ${existingTokenByDevice.token.substring(0, 20)}...)` : '없음',
      같은토큰: existingTokenByToken ? `있음 (user_id: ${existingTokenByToken.user_id}, device_id: ${existingTokenByToken.device_id})` : '없음'
    })

    // 3. 같은 기기, 같은 사용자, 같은 토큰이면 업데이트만
    if (existingTokenByDevice && existingTokenByDevice.token === token) {
      console.log('🔔 같은 기기, 같은 사용자, 같은 토큰 - 업데이트만')
      const { data: updateData, error: updateError } = await supabase
        .from('fcm_tokens')
        .update({
          platform,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTokenByDevice.id)
        .select()

      if (updateError) {
        console.error('❌ FCM 토큰 업데이트 오류:', updateError)
      } else {
        console.log('✅ FCM 토큰 업데이트 완료:', updateData)
      }
      return
    }

    // 4. 같은 기기, 같은 사용자, 다른 토큰이면 기존 토큰 삭제 후 새 토큰 삽입
    if (existingTokenByDevice && existingTokenByDevice.token !== token) {
      console.log('🔔 같은 기기, 같은 사용자, 다른 토큰 - 기존 토큰 삭제 후 새 토큰 등록')
      const { error: deleteError } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('id', existingTokenByDevice.id)

      if (deleteError) {
        console.error('❌ 기존 토큰 삭제 오류:', deleteError)
      } else {
        console.log('✅ 기존 토큰 삭제 완료')
      }
    }

    // 5. 같은 토큰이 있지만 다른 사용자거나 다른 기기면, 이전 토큰 삭제 후 새로 삽입
    if (existingTokenByToken) {
      const isDifferentUser = existingTokenByToken.user_id !== profileId
      const isDifferentDevice = existingTokenByToken.device_id !== deviceId
      
      if (isDifferentUser || isDifferentDevice) {
        console.log('🔔 같은 토큰이 다른 사용자/기기에게 있음 - 이전 토큰 삭제 후 새로 등록')
        const { error: deleteError } = await supabase
          .from('fcm_tokens')
          .delete()
          .eq('token', token)

        if (deleteError) {
          console.error('❌ 이전 토큰 삭제 오류:', deleteError)
        } else {
          console.log('✅ 이전 사용자/기기 토큰 삭제 완료')
        }
      }
    }

    // 6. 새 토큰 삽입
    console.log('🔔 새 토큰 삽입 중...')
    const { data: insertData, error: insertError } = await supabase
      .from('fcm_tokens')
      .insert({
        user_id: profileId,
        token,
        platform,
        device_id: deviceId
      })
      .select()

    if (insertError) {
      if (insertError.code === '23505') {
        // 중복 키 오류 - 다시 업데이트 시도
        console.log('ℹ️ 중복 키 오류 발생 - 업데이트로 재시도')
        const { data: updateData, error: updateError } = await supabase
          .from('fcm_tokens')
          .update({
            user_id: profileId,
            platform,
            device_id: deviceId,
            updated_at: new Date().toISOString()
          })
          .eq('token', token)
          .select()

        if (updateError) {
          console.error('❌ FCM 토큰 업데이트 오류:', updateError)
        } else {
          console.log('✅ FCM 토큰 업데이트 완료:', updateData)
        }
      } else {
        console.error('❌ FCM 토큰 저장 오류:', insertError)
        console.error('❌ 저장 오류 상세:', JSON.stringify(insertError, null, 2))
      }
    } else {
      console.log('✅ FCM 토큰 저장 완료:', insertData)
      console.log('✅ 데이터베이스에 저장된 토큰 ID:', insertData?.[0]?.id)
    }
  } catch (error) {
    console.error('❌ FCM 토큰 저장 중 오류:', error)
    console.error('❌ 오류 상세:', JSON.stringify(error, null, 2))
  }
}

export const removeFCMToken = async () => {
  if (Capacitor.getPlatform() === 'web') {
    return
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      const isLoggedIn = localStorage.getItem('isLoggedIn')
      const userProfile = localStorage.getItem('userProfile')
      
      if (isLoggedIn !== 'true' || !userProfile) {
        return
      }
      
      const profile = JSON.parse(userProfile)
      await removeTokenForProfile(profile.id)
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (profileError || !profileData) {
      return
    }

    await removeTokenForProfile(profileData.id)
  } catch (error) {
    console.error('FCM 토큰 삭제 오류:', error)
  }
}

const removeTokenForProfile = async (profileId: string) => {
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', profileId)

    if (error) {
      console.error('FCM 토큰 삭제 오류:', error)
    } else {
      console.log('FCM 토큰 삭제 완료')
    }
  } catch (error) {
    console.error('FCM 토큰 삭제 중 오류:', error)
  }
}


