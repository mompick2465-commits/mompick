import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 예약 알림 처리 (예약 시간이 된 알림 발송)
export async function POST() {
  try {
    const now = new Date().toISOString()

    // 예약 시간이 지났고 아직 발송되지 않은 알림 조회
    const { data: scheduledNotifications, error: fetchError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })

    if (fetchError) {
      console.error('예약 알림 조회 오류:', fetchError)
      return NextResponse.json({ 
        error: '예약 알림 조회 중 오류가 발생했습니다.',
        processed: 0
      }, { status: 500 })
    }

    if (!scheduledNotifications || scheduledNotifications.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: '발송할 예약 알림이 없습니다.',
        processed: 0
      })
    }

    let successCount = 0
    let failCount = 0

    // 각 예약 알림 처리
    for (const scheduled of scheduledNotifications) {
      try {
        // 원자적 업데이트: pending -> processing (중복 처리 방지)
        const { data: updated, error: updateError } = await supabase
          .from('scheduled_notifications')
          .update({ status: 'processing' })
          .eq('id', scheduled.id)
          .eq('status', 'pending') // pending 상태인 것만 업데이트
          .select()
          .single()

        // 다른 프로세스가 이미 처리 중이면 건너뛰기
        if (updateError || !updated) {
          console.log(`예약 알림 ${scheduled.id}는 이미 처리 중이거나 처리되었습니다.`)
          continue
        }

        // 모든 사용자 조회
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id')

        if (profilesError || !profiles || profiles.length === 0) {
          console.error('사용자 조회 오류:', profilesError)
          await supabase
            .from('scheduled_notifications')
            .update({ status: 'pending' })
            .eq('id', scheduled.id)
          failCount++
          continue
        }

        // 이미 발송된 알림이 있는지 확인 (중복 방지)
        const scheduledTime = new Date(scheduled.scheduled_at).getTime()
        const timeWindow = 5 * 60 * 1000 // 5분 윈도우
        
        const { data: recentNotifications } = await supabase
          .from('notifications')
          .select('payload, created_at')
          .eq('type', 'system')
          .gte('created_at', new Date(scheduledTime - timeWindow).toISOString())
          .lte('created_at', new Date(scheduledTime + timeWindow).toISOString())

        let isDuplicate = false
        if (recentNotifications && recentNotifications.length > 0) {
          isDuplicate = recentNotifications.some((n: any) => {
            const payload = typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload
            return payload?.title === scheduled.title && payload?.content === scheduled.body
          })
        }

        if (isDuplicate) {
          console.log(`예약 알림 ${scheduled.id}는 이미 발송되었습니다. (중복 방지)`)
          await supabase
            .from('scheduled_notifications')
            .update({ 
              status: 'sent',
              updated_at: new Date().toISOString()
            })
            .eq('id', scheduled.id)
          continue
        }

        // 각 사용자에게 알림 생성
        const notifications = profiles.map((profile: any) => ({
          type: 'system',
          to_user_id: profile.id,
          from_user_id: null,
          post_id: null,
          comment_id: null,
          payload: {
            title: scheduled.title,
            content: scheduled.body,
            message: scheduled.body,
            scheduled_notification_id: scheduled.id // 중복 체크용
          },
          is_read: false
        }))

        const { data: insertedData, error: insertError } = await supabase
          .from('notifications')
          .insert(notifications)
          .select()

        if (insertError) {
          console.error('알림 생성 오류:', insertError)
          await supabase
            .from('scheduled_notifications')
            .update({ status: 'pending' })
            .eq('id', scheduled.id)
          failCount++
          continue
        }

        // 알림 설정 조회
        const { data: notificationSettings } = await supabase
          .from('notification_settings')
          .select('user_id, notice')

        const settingsMap = new Map()
        if (notificationSettings) {
          notificationSettings.forEach((setting: any) => {
            settingsMap.set(setting.user_id, setting.notice !== false)
          })
        }

        // FCM 푸시 알림 전송
        const usersToNotify = profiles.filter((profile: any) => {
          const canReceive = settingsMap.get(profile.id) !== false
          return canReceive
        })

        let fcmSuccess = 0
        let fcmFail = 0

        // FCM 전송 (배치 처리)
        const batchSize = 10
        for (let i = 0; i < usersToNotify.length; i += batchSize) {
          const batch = usersToNotify.slice(i, i + batchSize)
          const results = await Promise.allSettled(
            batch.map(async (profile: any) => {
              try {
                const { data, error } = await supabase.functions.invoke('send-fcm-push', {
                  body: {
                    userId: profile.id,
                    title: scheduled.title,
                    body: scheduled.body,
                    data: {
                      type: 'notice',
                      notificationId: insertedData?.find((n: any) => n.to_user_id === profile.id)?.id || ''
                    }
                  }
                })

                if (error || data?.skipped) {
                  return false
                }
                return true
              } catch (error) {
                console.error(`사용자 ${profile.id} FCM 전송 오류:`, error)
                return false
              }
            })
          )

          results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value === true) {
              fcmSuccess++
            } else {
              fcmFail++
            }
          })
        }

        // 상태를 sent로 변경
        await supabase
          .from('scheduled_notifications')
          .update({ 
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', scheduled.id)

        successCount++
        console.log(`예약 알림 발송 완료: ${scheduled.id} (앱 알림: ${insertedData?.length || 0}명, FCM: ${fcmSuccess}명 성공)`)
      } catch (error) {
        console.error(`예약 알림 ${scheduled.id} 처리 오류:`, error)
        await supabase
          .from('scheduled_notifications')
          .update({ status: 'pending' })
          .eq('id', scheduled.id)
        failCount++
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `${scheduledNotifications.length}개의 예약 알림 중 ${successCount}개 발송 완료, ${failCount}개 실패`,
      processed: successCount,
      failed: failCount,
      total: scheduledNotifications.length
    })
  } catch (error) {
    console.error('예약 알림 처리 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      processed: 0
    }, { status: 500 })
  }
}

