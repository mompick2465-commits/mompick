// 어린이집 스마트 로더 (캐시 우선, API 폴백)
import { childcareCacheManager } from './childcareCache'
import { fetchChildcareData, ChildcareInfo } from './childcarePortalApi'

export interface LoadResult {
  data: ChildcareInfo[]
  source: 'cache' | 'api' | 'error'
  error?: string
  loadTime?: number
}

export class SmartChildcareLoader {
  private loadingPromises = new Map<string, Promise<LoadResult>>()

  // arcode 기반 어린이집 데이터 로딩 (캐시 우선)
  async loadChildcareData(arcode: string, region?: string): Promise<LoadResult> {
    const cacheKey = arcode
    
    // 동일한 요청이 진행 중이면 기다림 (중복 방지)
    if (this.loadingPromises.has(cacheKey)) {
      console.log(`⏳ 어린이집 로딩 대기 중: ${arcode}`)
      return this.loadingPromises.get(cacheKey)!
    }

    const loadPromise = this._loadChildcareDataInternal(arcode, region)
    this.loadingPromises.set(cacheKey, loadPromise)

    try {
      const result = await loadPromise
      return result
    } finally {
      // 완료되면 Promise 제거
      this.loadingPromises.delete(cacheKey)
    }
  }

  private async _loadChildcareDataInternal(arcode: string, region?: string): Promise<LoadResult> {
    const startTime = Date.now()

    try {
      // arcode를 시도/시군구로 분리 (로그용)
      const sidoCode = arcode.substring(0, 2)
      const regionDisplay = `${sidoCode}/${arcode}`

      // 1. 캐시부터 시도
      console.log(`🔍 어린이집 캐시 조회: ${regionDisplay}`)
      const cachedData = await childcareCacheManager.getCachedDataByCode(arcode)
      
      if (cachedData && cachedData.length > 0) {
        const loadTime = Date.now() - startTime
        console.log(`⚡ 어린이집 캐시 히트: ${regionDisplay} (${cachedData.length}개, ${loadTime}ms)`)
        return {
          data: cachedData,
          source: 'cache',
          loadTime
        }
      }

      // 2. 캐시 미스 - API 호출
      console.log(`🌐 어린이집 API 호출: ${regionDisplay}`)
      const apiData = await fetchChildcareData(arcode)
      
      if (!apiData || apiData.length === 0) {
        console.warn(`⚠️ 어린이집 데이터 없음: ${regionDisplay}`)
        return {
          data: [],
          source: 'api',
          error: '데이터 없음',
          loadTime: Date.now() - startTime
        }
      }

      // 3. API 데이터를 캐시에 저장
      try {
        const regionName = region || `지역코드_${arcode}`
        await childcareCacheManager.saveCachedData(arcode, regionName, apiData)
        console.log(`💾 어린이집 캐시 저장: ${regionDisplay} (${apiData.length}개)`)
      } catch (cacheError) {
        console.warn('어린이집 캐시 저장 실패:', cacheError)
        // 캐시 저장 실패해도 API 데이터는 반환
      }

      const loadTime = Date.now() - startTime
      console.log(`✅ 어린이집 API 로딩 완료: ${regionDisplay} (${apiData.length}개, ${loadTime}ms)`)
      
      return {
        data: apiData,
        source: 'api',
        loadTime
      }

    } catch (error) {
      const loadTime = Date.now() - startTime
      const sidoCode = arcode.substring(0, 2)
      const regionDisplay = `${sidoCode}/${arcode}`
      console.error(`❌ 어린이집 로딩 실패: ${regionDisplay}`, error)
      
      return {
        data: [],
        source: 'error',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        loadTime
      }
    }
  }

  // 여러 지역 병렬 로딩
  async loadMultipleChildcareData(arcodes: string[], regions?: string[]): Promise<Record<string, LoadResult>> {
    console.log(`🔄 여러 어린이집 지역 로딩: ${arcodes.join(', ')}`)
    
    const results = await Promise.allSettled(
      arcodes.map(async (arcode, index) => {
        const region = regions?.[index]
        const result = await this.loadChildcareData(arcode, region)
        return { arcode, result }
      })
    )

    const output: Record<string, LoadResult> = {}
    
    results.forEach((promiseResult, index) => {
      const arcode = arcodes[index]
      
      if (promiseResult.status === 'fulfilled') {
        output[arcode] = promiseResult.value.result
      } else {
        console.error(`어린이집 로딩 실패: ${arcode}`, promiseResult.reason)
        output[arcode] = {
          data: [],
          source: 'error',
          error: promiseResult.reason?.message || '로딩 실패'
        }
      }
    })

    const totalData = Object.values(output).reduce((sum, result) => sum + result.data.length, 0)
    const cacheHits = Object.values(output).filter(result => result.source === 'cache').length
    
    console.log(`📊 어린이집 멀티 로딩 완료: ${totalData}개 데이터, ${cacheHits}/${arcodes.length} 캐시 히트`)
    
    return output
  }

  // 캐시 강제 새로고침
  async forceRefresh(arcode: string, region?: string): Promise<LoadResult> {
    console.log(`🔄 어린이집 캐시 강제 새로고침: ${arcode}`)
    
    try {
      // 기존 캐시 삭제
      await childcareCacheManager.deleteCache(arcode)
      
      // 새로 로딩
      return await this.loadChildcareData(arcode, region)
    } catch (error) {
      console.error(`어린이집 강제 새로고침 실패: ${arcode}`, error)
      return {
        data: [],
        source: 'error',
        error: error instanceof Error ? error.message : '강제 새로고침 실패'
      }
    }
  }

  // 캐시 상태 확인
  async getCacheStatus(arcode: string): Promise<{
    exists: boolean
    metadata?: any
    isExpired?: boolean
  }> {
    try {
      const metadata = await childcareCacheManager.getCacheMetadata(arcode)
      
      return {
        exists: !!metadata,
        metadata,
        isExpired: metadata?.isExpired
      }
    } catch (error) {
      console.error('어린이집 캐시 상태 확인 실패:', error)
      return { exists: false }
    }
  }

  // 로딩 통계
  getLoadingStats(): {
    activeLoads: number
    cacheKeys: string[]
  } {
    return {
      activeLoads: this.loadingPromises.size,
      cacheKeys: Array.from(this.loadingPromises.keys())
    }
  }

  // 모든 로딩 취소 (cleanup)
  cancelAllLoading(): void {
    console.log(`🛑 모든 어린이집 로딩 취소: ${this.loadingPromises.size}개`)
    this.loadingPromises.clear()
  }
}

// 싱글톤 인스턴스
export const smartChildcareLoader = new SmartChildcareLoader()
