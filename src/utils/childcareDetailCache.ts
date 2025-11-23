// 어린이집 상세 정보 캐시 매니저
import { supabase } from '../lib/supabase'
import type { ChildcareDetailSummary } from './childcareDetailApi'

export interface ChildcareDetailCacheEnvelope {
  meta: {
    stcode: string
    lastSyncedAt: string // ISO
    apiVersion?: string
  }
  data: ChildcareDetailSummary
}

export class ChildcareDetailCacheManager {
  private supabase = supabase
  private bucketName = 'childcare-detail-cache'
  private cacheExpiryDays = 7

  private detailPath(stcode: string): string {
    return `details/${stcode}/latest.json`
  }

  private snapshotPath(stcode: string, isoDate: string): string {
    return `details/${stcode}/${isoDate}.json`
  }

  // 최신 캐시 조회
  async getCachedDetail(stcode: string): Promise<ChildcareDetailSummary | null> {
    try {
      const basePath = `details/${stcode}`
      const { data: fileList, error: listError } = await this.supabase.storage
        .from(this.bucketName)
        .list(basePath)

      if (listError || !fileList || fileList.length === 0) {
        console.log(`📁 Storage에 어린이집 상세 캐시 없음: ${stcode}`)
        return null
      }

      const latestFile = fileList.find(f => f.name === 'latest.json')
      if (!latestFile) {
        console.log(`📁 Storage에 어린이집 상세 캐시 없음: ${stcode}`)
        return null
      }

      // 파일의 updated_at으로 먼저 TTL 체크 (다운로드 전에)
      const fileUpdatedAt = new Date(latestFile.updated_at).getTime()
      const fileAgeDays = (Date.now() - fileUpdatedAt) / (1000 * 60 * 60 * 24)
      
      if (fileAgeDays > this.cacheExpiryDays) {
        console.log(`⏰ 파일 메타데이터 기준 어린이집 캐시 만료: ${stcode} (${fileAgeDays.toFixed(1)}일 경과)`)
        return null
      }

      console.log(`📄 어린이집 latest.json 다운로드: ${stcode} (${fileAgeDays.toFixed(1)}일 전)`)

      const latestKey = this.detailPath(stcode)
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(latestKey)

      if (error || !data) return null

      const text = await data.text()
      const envelope: ChildcareDetailCacheEnvelope = JSON.parse(text)

      console.log(`✅ 어린이집 상세 캐시 사용: ${stcode} (${fileAgeDays.toFixed(1)}일 전)`)
      return envelope.data
    } catch (e) {
      console.warn('어린이집 상세 캐시 조회 오류:', e)
      return null
    }
  }

  // 캐시 저장
  async saveDetailCache(stcode: string, detail: ChildcareDetailSummary): Promise<void> {
    try {
      const now = new Date()
      const isoDate = now.toISOString().split('T')[0]

      const envelope: ChildcareDetailCacheEnvelope = {
        meta: { stcode, lastSyncedAt: now.toISOString(), apiVersion: '1.0' },
        data: detail
      }

      const latestKey = this.detailPath(stcode)
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })

      const uploadWithTimeout = async (path: string) => {
        const timeoutMs = 5000
        const uploadPromise = this.supabase.storage
          .from(this.bucketName)
          .upload(path, blob, { cacheControl: '3600', upsert: true })
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), timeoutMs)
        })
        const { error } = await Promise.race([uploadPromise, timeoutPromise]) as any
        if (error) throw error
      }

      // latest 먼저, 실패해도 스냅샷은 시도하지 않고 종료
      try {
        await uploadWithTimeout(latestKey)
      } catch (e: any) {
        const msg = (e?.message || '').toString()
        const status = (e?.status || e?.code || '').toString()
        if (status === '504' || msg.includes('504') || msg.toLowerCase().includes('timeout')) {
          console.warn('어린이집 latest 캐시 저장 타임아웃(무시):', stcode)
          return
        }
        console.warn('어린이집 latest 캐시 저장 오류(무시):', e)
        return
      }

      // 스냅샷 저장은 best-effort
      const snapshotKey = this.snapshotPath(stcode, isoDate)
      try {
        await uploadWithTimeout(snapshotKey)
      } catch (e) {
        console.warn('어린이집 스냅샷 캐시 저장 실패(무시):', e)
      }

      console.log(`💾 어린이집 상세 캐시 저장: ${stcode}`)
    } catch (e) {
      console.warn('어린이집 상세 캐시 저장 오류:', e)
    }
  }
}

export const childcareDetailCacheManager = new ChildcareDetailCacheManager()


