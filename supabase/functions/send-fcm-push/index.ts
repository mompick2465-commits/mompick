// Supabase Edge Function: FCM 푸시 알림 전송 (HTTP v1 API 사용)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 서비스 계정 키 JSON (환경 변수에서 가져옴)
const SERVICE_ACCOUNT_KEY_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_KEY') || ''
const FCM_PROJECT_ID = Deno.env.get('FCM_PROJECT_ID') || 'mompick-46b2c'

// JWT 생성 및 OAuth 2.0 액세스 토큰 발급
async function getAccessToken(serviceAccountKey: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  
  // JWT 헤더
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  // JWT 클레임
  const claim = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  // Base64URL 인코딩
  const base64UrlEncode = (str: string): string => {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedClaim = base64UrlEncode(JSON.stringify(claim))
  const signatureInput = `${encodedHeader}.${encodedClaim}`

  // PEM 형식의 private key를 PKCS8 형식으로 변환
  const privateKeyPem = serviceAccountKey.private_key.replace(/\\n/g, '\n')
  
  // PEM에서 키 추출 (간단한 방법)
  const keyData = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  
  const keyBytes = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))

  // RS256 서명 생성
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  )

  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))
  const jwt = `${signatureInput}.${encodedSignature}`

  // OAuth 2.0 토큰 요청
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    throw new Error(`OAuth 토큰 발급 실패: ${tokenResponse.status} - ${errorText}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

serve(async (req) => {
  try {
    // CORS 헤더 설정
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const { userId, title, body, data } = await req.json()

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: '필수 파라미터가 누락되었습니다.' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // FCM 알림 텍스트 길이 제한 (기기 표시 최적화)
    // 제목: 최대 64자 (FCM 제한), 실제 표시는 약 40-50자
    // 본문: 최대 1024자 (FCM 제한), 실제 표시는 약 200-240자
    const truncateText = (text: string, maxLength: number): string => {
      if (text.length <= maxLength) return text
      // 한글, 영문 모두 고려하여 마지막 3자리를 '...'으로 대체
      return text.substring(0, maxLength - 3) + '...'
    }

    const truncatedTitle = truncateText(title, 64)
    const truncatedBody = truncateText(body, 240) // 기기 표시 최적화를 위해 240자로 제한

    // 서비스 계정 키 확인
    if (!SERVICE_ACCOUNT_KEY_JSON) {
      console.error('FCM_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다.')
      return new Response(
        JSON.stringify({ 
          error: 'FCM 서비스 계정 키가 설정되지 않았습니다. Supabase Dashboard > Edge Functions > Secrets에서 FCM_SERVICE_ACCOUNT_KEY를 설정하세요. 서비스 계정 키 JSON을 문자열로 저장하세요.' 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    let serviceAccountKey: any
    try {
      serviceAccountKey = JSON.parse(SERVICE_ACCOUNT_KEY_JSON)
    } catch (e) {
      return new Response(
        JSON.stringify({ error: '서비스 계정 키 JSON 파싱 오류' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // OAuth 2.0 액세스 토큰 발급
    let accessToken: string
    try {
      accessToken = await getAccessToken(serviceAccountKey)
    } catch (error) {
      console.error('액세스 토큰 발급 오류:', error)
      return new Response(
        JSON.stringify({ error: `액세스 토큰 발급 실패: ${error.message}` }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 사용자의 FCM 토큰 조회
    console.log('🔍 FCM 토큰 조회 시작 - userId:', userId)
    const { data: tokens, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('token, platform, user_id')
      .eq('user_id', userId)

    if (tokenError) {
      console.error('❌ FCM 토큰 조회 오류:', tokenError)
      return new Response(
        JSON.stringify({ error: 'FCM 토큰 조회 실패', details: tokenError }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    console.log('🔍 조회된 토큰 개수:', tokens?.length || 0)
    if (tokens && tokens.length > 0) {
      console.log('🔍 토큰 정보:', tokens.map(t => ({ platform: t.platform, tokenPreview: t.token.substring(0, 20) + '...' })))
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ 사용자에게 등록된 FCM 토큰이 없습니다.')
      return new Response(
        JSON.stringify({ message: '등록된 토큰이 없습니다.', sent: 0 }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // 알림 타입에 따른 채널 ID 결정
    const getChannelId = (notificationType?: string): string => {
      switch (notificationType) {
        case 'like':
          return 'mompick_post'  // 게시글 채널
        case 'comment':
          return 'mompick_comment'  // 댓글 채널
        case 'reply':
          return 'mompick_reply'  // 답글 채널
        case 'review_like':
          return 'mompick_review'  // 리뷰 채널
        case 'notice':
          return 'mompick_notice'  // 공지사항 채널
        default:
          return 'mompick_notifications'  // 기본 채널
      }
    }

    const channelId = getChannelId(data?.type)

    // 각 토큰에 대해 푸시 알림 전송 (HTTP v1 API)
    console.log('📤 FCM 알림 전송 시작 - 토큰 개수:', tokens.length)
    const results = await Promise.allSettled(
      tokens.map(async (tokenData, index) => {
        try {
          console.log(`📤 토큰 ${index + 1}/${tokens.length} 전송 시도 - 플랫폼: ${tokenData.platform}`)
          
          // HTTP v1 API 메시지 구조
          const message: any = {
            token: tokenData.token,
            notification: {
              title: truncatedTitle,
              body: truncatedBody,
            },
          }

          // 데이터 추가 (모든 값은 문자열이어야 함)
          if (data) {
            message.data = {}
            for (const [key, value] of Object.entries(data)) {
              message.data[key] = String(value)
            }
          }

        // Android용 설정
        if (tokenData.platform === 'android') {
          message.android = {
            priority: 'high',
            notification: {
              channel_id: channelId,
              sound: 'default',
              // 알림 아이콘은 drawable 리소스여야 함
              // 기본적으로 앱 아이콘이 사용되지만, 명시적으로 설정 가능
              // icon: 'ic_notification', // 커스텀 알림 아이콘 사용 시
              color: '#fb8678', // 알림 색상 (맘픽 브랜드 컬러)
            },
          }
          console.log(`📱 Android 알림 설정 - 채널 ID: ${channelId}`)
        }

          // iOS용 설정
          if (tokenData.platform === 'ios') {
            message.apns = {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                },
              },
            }
            console.log(`🍎 iOS 알림 설정 완료`)
          }

          // HTTP v1 API 엔드포인트 사용
          const v1Endpoint = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`
          console.log(`📡 FCM API 호출: ${v1Endpoint}`)
          
          const response = await fetch(v1Endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ message }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            let errorData: any = {}
            try {
              errorData = JSON.parse(errorText)
            } catch {
              errorData = { message: errorText }
            }
            
            console.error(`❌ FCM 전송 실패 (토큰 ${index + 1}):`, {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              errorData: errorData
            })
            
            // 오류 정보를 포함하여 throw
            const errorMessage = errorData.error?.message || errorData.message || errorText
            const errorCode = errorData.error?.status || response.status.toString()
            throw new Error(`FCM 전송 실패 [${errorCode}]: ${errorMessage}`)
          }

          const result = await response.json()
          console.log(`✅ FCM 전송 성공 (토큰 ${index + 1}):`, result)
          return result
        } catch (error: any) {
          console.error(`❌ 토큰 ${index + 1} 전송 중 오류:`, error.message)
          throw error
        }
      })
    )

    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failureCount = results.filter((r) => r.status === 'rejected').length

    // 실패한 토큰의 오류 메시지 수집
    const failures = results
      .map((r, index) => {
        if (r.status === 'rejected') {
          const errorMessage = r.reason?.message || '알 수 없는 오류'
          // 토큰이 유효하지 않은 경우를 판단
          // INVALID_ARGUMENT는 메시지 형식 문제이므로 토큰 문제가 아님
          const isInvalidToken = errorMessage.includes('NOT_FOUND') || 
                                 errorMessage.includes('404') ||
                                 errorMessage.includes('registration-token-not-registered') ||
                                 errorMessage.includes('UNREGISTERED')
          
          return {
            tokenIndex: index + 1,
            platform: tokens[index].platform,
            error: errorMessage,
            isInvalidToken: isInvalidToken
          }
        }
        return null
      })
      .filter(Boolean)

    console.log('📊 전송 결과:', {
      success: successCount,
      failed: failureCount,
      failures: failures
    })

    // 토큰이 정말 유효하지 않은 경우에만 삭제
    const invalidTokens = tokens
      .filter((_, index) => {
        const failure = failures.find((f: any) => f.tokenIndex === index + 1)
        return failure && failure.isInvalidToken
      })
      .map((t) => t.token)

    if (invalidTokens.length > 0) {
      console.log('🗑️ 유효하지 않은 토큰 삭제 중:', invalidTokens.length, '개')
      const { error: deleteError } = await supabase
        .from('fcm_tokens')
        .delete()
        .in('token', invalidTokens)
      
      if (deleteError) {
        console.error('❌ 토큰 삭제 오류:', deleteError)
      } else {
        console.log('✅ 유효하지 않은 토큰 삭제 완료')
      }
    } else {
      console.log('ℹ️ 실패한 토큰이 있지만 유효하지 않은 토큰은 없습니다. 토큰을 유지합니다.')
    }

    return new Response(
      JSON.stringify({
        message: '푸시 알림 전송 완료',
        sent: successCount,
        failed: failureCount,
        failures: failures,
        tokensCount: tokens.length
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('에러:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
