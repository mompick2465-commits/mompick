// 어린이집 캐시 매니저
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// 디버깅을 위한 로그
console.log('어린이집 캐시 환경 변수 확인:', {
  supabaseUrl: supabaseUrl ? '설정됨' : '설정되지 않음',
  supabaseKey: supabaseKey ? '설정됨' : '설정되지 않음'
})

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다.')
  throw new Error('Supabase 환경 변수가 필요합니다.')
}

// childcarePortalApi.ts의 ChildcareInfo를 재사용
import type { ChildcareInfo } from './childcarePortalApi'
export type { ChildcareInfo } from './childcarePortalApi'

export interface ChildcareCacheEnvelope {
  meta: {
    arcode: string
    region: string
    lastSyncedAt: string // ISO
    itemCount: number
    apiVersion?: string
  }
  data: ChildcareInfo[]
}

export interface ChildcareCacheMetadata {
  arcode: string
  region: string
  lastUpdated: string
  dataCount: number
  filePath: string
  isExpired?: boolean
}

export class ChildcareCacheManager {
  private supabase = supabase
  private bucketName = 'childcare-cache'
  private cacheExpiryDays = 7 // 7일 후 만료

  // arcode를 시도코드와 시군구코드로 분리
  private parseArcode(arcode: string): { sidoCode: string, sggCode: string } {
    // arcode는 5자리: 11680 -> 11(시도) + 680(시군구)
    if (arcode.length !== 5) {
      throw new Error(`잘못된 arcode 형식: ${arcode}`)
    }
    
    return {
      sidoCode: arcode.substring(0, 2),  // 11
      sggCode: arcode                    // 11680
    }
  }

  // ASCII 전용 경로: regions/{sidoCode}/{sggCode}/... (유치원과 동일)
  private pathPrefixByCode(arcode: string): string {
    const { sidoCode, sggCode } = this.parseArcode(arcode)
    return `regions/${sidoCode}/${sggCode}` // 예: regions/11/11680
  }

  private latestPathByCode(arcode: string): string {
    return `${this.pathPrefixByCode(arcode)}/latest.json`
  }

  private snapshotPathByCode(arcode: string, isoDate: string): string {
    return `${this.pathPrefixByCode(arcode)}/${isoDate}.json`
  }

  // 최신 캐시 데이터 조회 (arcode 기반)
  async getCachedDataByCode(arcode: string): Promise<ChildcareInfo[] | null> {
    try {
      const latestKey = this.latestPathByCode(arcode)
      
      // 파일 존재 여부를 먼저 확인 (오류 로그 방지)
      const { data: fileList, error: listError } = await this.supabase.storage
        .from(this.bucketName)
        .list(this.pathPrefixByCode(arcode))

      // 디렉토리나 파일이 없는 경우
      if (listError || !fileList || fileList.length === 0) {
        const { sidoCode, sggCode } = this.parseArcode(arcode)
        console.log(`📁 어린이집 캐시 없음: ${sidoCode}/${sggCode} (${arcode})`)
        return null
      }

      // latest.json 파일이 있는지 확인
      const hasLatestFile = fileList.some(file => file.name === 'latest.json')
      if (!hasLatestFile) {
        const { sidoCode, sggCode } = this.parseArcode(arcode)
        console.log(`📁 어린이집 캐시 없음: ${sidoCode}/${sggCode} (${arcode})`)
        return null
      }

      // 파일 다운로드
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(latestKey)

      if (error || !data) {
        const { sidoCode, sggCode } = this.parseArcode(arcode)
        console.log(`어린이집 캐시 읽기 실패: ${sidoCode}/${sggCode} (${arcode})`)
        return null
      }

      const text = await data.text()
      const envelope: ChildcareCacheEnvelope = JSON.parse(text)

      // TTL 체크 (내부 메타 기준)
      const lastSynced = new Date(envelope.meta.lastSyncedAt).getTime()
      const ageDays = (Date.now() - lastSynced) / (1000 * 60 * 60 * 24)
      
      if (ageDays > this.cacheExpiryDays) {
        const { sidoCode, sggCode } = this.parseArcode(arcode)
        console.log(`어린이집 캐시 만료: ${sidoCode}/${sggCode} (${arcode}) - ${ageDays.toFixed(1)}일 경과`)
        return null
      }

      const { sidoCode, sggCode } = this.parseArcode(arcode)
      console.log(`✅ 어린이집 캐시 사용: ${sidoCode}/${sggCode} (${arcode}) - ${envelope.data.length}개 데이터, ${ageDays.toFixed(1)}일 전`)
      return envelope.data

    } catch (error) {
      // JSON 파싱 오류 등 실제 오류만 로그 출력
      console.error('어린이집 캐시 조회 오류:', error)
      return null
    }
  }

  // 새로운 데이터를 캐시에 저장
  async saveCachedData(arcode: string, region: string, data: ChildcareInfo[]): Promise<void> {
    try {
      const now = new Date().toISOString()
      
      const envelope: ChildcareCacheEnvelope = {
        meta: {
          arcode,
          region,
          lastSyncedAt: now,
          itemCount: data.length,
          apiVersion: '1.0'
        },
        data
      }

      const jsonContent = JSON.stringify(envelope, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      
      // latest.json으로 저장
      const latestPath = this.latestPathByCode(arcode)
      const { error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(latestPath, blob, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      // 스냅샷도 저장 (선택적)
      const snapshotPath = this.snapshotPathByCode(arcode, now.replace(/[:.]/g, '-'))
      await this.supabase.storage
        .from(this.bucketName)
        .upload(snapshotPath, blob, { upsert: true })

      const { sidoCode, sggCode } = this.parseArcode(arcode)
      console.log(`💾 어린이집 캐시 저장 완료: ${sidoCode}/${sggCode} (${arcode}) - ${data.length}개 데이터`)
      
    } catch (error) {
      console.error('어린이집 캐시 저장 오류:', error)
      throw error
    }
  }

  // 캐시 메타데이터 조회
  async getCacheMetadata(arcode: string): Promise<ChildcareCacheMetadata | null> {
    try {
      const path = this.pathPrefixByCode(arcode)
      const { data: files, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(path, { 
          limit: 1, 
          sortBy: { column: 'updated_at', order: 'desc' } 
        })

      if (error || !files || files.length === 0) {
        return null
      }

      const file = files[0]
      const lastUpdated = new Date(file.updated_at)
      const ageDays = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
      
      return {
        arcode,
        region: '', // 실제로는 latest.json 파싱해서 확인
        lastUpdated: file.updated_at,
        dataCount: 0, // 실제로는 latest.json 파싱해서 확인
        filePath: `${path}/${file.name}`,
        isExpired: ageDays > this.cacheExpiryDays
      }
    } catch (error) {
      console.error('어린이집 캐시 메타데이터 조회 오류:', error)
      return null
    }
  }

  // 캐시 삭제 (강제 새로고침용)
  async deleteCache(arcode: string): Promise<void> {
    try {
      const base = this.pathPrefixByCode(arcode)
      const { data: files } = await this.supabase.storage
        .from(this.bucketName)
        .list(base)

      if (!files || files.length === 0) {
        const { sidoCode, sggCode } = this.parseArcode(arcode)
        console.log(`삭제할 어린이집 캐시 없음: ${sidoCode}/${sggCode} (${arcode})`)
        return
      }

      const targets = files.map(f => `${base}/${f.name}`)
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove(targets)

      if (error) {
        throw error
      }

      const { sidoCode, sggCode } = this.parseArcode(arcode)
      console.log(`🗑️ 어린이집 캐시 삭제 완료: ${sidoCode}/${sggCode} (${arcode}) - ${targets.length}개 파일`)
    } catch (error) {
      console.error('어린이집 캐시 삭제 오류:', error)
      throw error
    }
  }

  // 오래된 캐시 정리
  async cleanupOldCache(arcode?: string): Promise<void> {
    try {
      const root = arcode ? this.pathPrefixByCode(arcode) : 'regions'
      const { data: files } = await this.supabase.storage
        .from(this.bucketName)
        .list(root, { limit: 1000 })

      if (!files) return

      const cutoff = Date.now() - this.cacheExpiryDays * 24 * 60 * 60 * 1000
      const toDelete: string[] = []

      for (const file of files) {
        const updated = new Date(file.updated_at).getTime()
        // latest.json은 제외하고 오래된 파일만 삭제
        if (updated < cutoff && file.name !== 'latest.json') {
          toDelete.push(`${root}/${file.name}`)
        }
      }

      if (toDelete.length > 0) {
        await this.supabase.storage
          .from(this.bucketName)
          .remove(toDelete)
        console.log(`🧹 어린이집 오래된 캐시 정리 완료: ${toDelete.length}개 파일 삭제`)
      }
    } catch (error) {
      console.error('어린이집 캐시 정리 오류:', error)
    }
  }

  // 캐시 통계 조회
  async getCacheStats(): Promise<{
    totalRegions: number
    validCaches: number
    expiredCaches: number
    totalFiles: number
  }> {
    try {
      const { data: files } = await this.supabase.storage
        .from(this.bucketName)
        .list('regions', { limit: 1000 })

      if (!files) {
        return { totalRegions: 0, validCaches: 0, expiredCaches: 0, totalFiles: 0 }
      }

      const latestFiles = files.filter(f => f.name === 'latest.json')
      const cutoff = Date.now() - this.cacheExpiryDays * 24 * 60 * 60 * 1000
      
      let validCaches = 0
      let expiredCaches = 0

      for (const file of latestFiles) {
        const updated = new Date(file.updated_at).getTime()
        if (updated > cutoff) {
          validCaches++
        } else {
          expiredCaches++
        }
      }

      return {
        totalRegions: latestFiles.length,
        validCaches,
        expiredCaches,
        totalFiles: files.length
      }
    } catch (error) {
      console.error('어린이집 캐시 통계 조회 오류:', error)
      return { totalRegions: 0, validCaches: 0, expiredCaches: 0, totalFiles: 0 }
    }
  }
}

// 싱글톤 인스턴스
export const childcareCacheManager = new ChildcareCacheManager()
