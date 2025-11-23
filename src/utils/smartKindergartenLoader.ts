// 스마트 유치원 데이터 로더 (캐시 우선, API 백업)
import { KindergartenCacheManager, KindergartenInfo } from './kindergartenCache'
import { fetchKindergartenData, findRegionCodes } from './kindergartenApi'
import { supabase } from '../lib/supabase'

export interface LoadResult {
  data: KindergartenInfo[]
  source: 'cache' | 'api'
  region: string
  loadTime: number
  error?: string
}

export class SmartKindergartenLoader {
  public cacheManager = new KindergartenCacheManager()

  // 단일 지역 데이터 로딩 (캐시 우선)
  async loadKindergartenData(sido: string, sgg: string): Promise<LoadResult> {
    const startTime = Date.now()
    const region = `${sido}/${sgg}`
    
    try {
      // 1. 캐시에서 데이터 확인
      const cachedData = await this.cacheManager.getCachedData(sido, sgg)
      if (cachedData && cachedData.length > 0) {
        const loadTime = Date.now() - startTime
        console.log(`✅ 캐시에서 로드: ${region} (${cachedData.length}개, ${loadTime}ms)`)
        return {
          data: cachedData,
          source: 'cache',
          region,
          loadTime
        }
      }

      // 2. 캐시에 없으면 API 호출 (모든 페이지 수집)
      console.log(`🔄 API에서 로드: ${region}`)
      const apiData = await this.fetchAllPagesFromAPI(sido, sgg)
      
      if (apiData.length === 0) {
        throw new Error('API에서 데이터를 받지 못했습니다.')
      }

      const loadTime = Date.now() - startTime
      console.log(`📡 API에서 로드 완료: ${region} (${apiData.length}개, ${loadTime}ms)`)
      
      return {
        data: apiData,
        source: 'api',
        region,
        loadTime
      }

    } catch (error) {
      const loadTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      console.error(`❌ 로딩 실패: ${region}`, error)
      
      return {
        data: [],
        source: 'api',
        region,
        loadTime,
        error: errorMessage
      }
    }
  }

  // API에서 모든 페이지 수집
  private async fetchAllPagesFromAPI(sido: string, sgg: string): Promise<KindergartenInfo[]> {
    try {
      const { sidoCode, sggCode } = findRegionCodes(sido, sgg)
      let page = 1
      const pageSize = 100
      const allData: KindergartenInfo[] = []

      while (true) {
        console.log(`📄 페이지 ${page} 로딩 중...`)
        const response = await fetchKindergartenData(sidoCode, sggCode, pageSize, page)
        
        if (response.status !== 'SUCCESS' || !response.kinderInfo?.length) {
          break
        }

        allData.push(...response.kinderInfo)
        
        // 마지막 페이지인지 확인
        if (response.kinderInfo.length < pageSize) {
          break
        }
        
        page++
        
        // 무한 루프 방지 (최대 50페이지)
        if (page > 50) {
          console.warn(`⚠️ 최대 페이지 수 도달: ${sido}/${sgg}`)
          break
        }
      }

      console.log(`📊 총 ${allData.length}개 데이터 수집 완료: ${sido}/${sgg}`)
      
      // Edge Function을 통한 캐시 저장
      await this.saveToCacheViaEdgeFunction(sido, sgg, allData)
      
      return allData

    } catch (error) {
      console.error(`API 호출 오류: ${sido}/${sgg}`, error)
      throw error
    }
  }

  // Edge Function을 통한 캐시 저장
  private async saveToCacheViaEdgeFunction(sido: string, sgg: string, data: KindergartenInfo[]): Promise<void> {
    try {
      console.log('🚀 Edge Function invoke 시작: sync-kindergartens')
      const { data: result, error } = await supabase.functions.invoke('sync-kindergartens', {
        body: { sido, sgg }
      })
      if (error) {
        console.error('❌ Edge Function 오류:', error)
        return
      }
      console.log('📋 Edge Function 응답:', result)
      if ((result as any)?.success) {
        console.log(`💾 Edge Function을 통한 캐시 저장 완료: ${sido}/${sgg} (${data.length}개 데이터)`)
      } else if ((result as any)?.error) {
        console.warn(`⚠️ Edge Function 캐시 저장 실패: ${(result as any).error}`)
      }
    } catch (error) {
      console.error(`❌ Edge Function 호출 실패:`, error)
      // Edge Function 실패해도 API 데이터는 반환
    }
  }

  // 여러 지역 동시 로딩
  async loadMultipleRegions(regions: Array<{sido: string, sgg: string}>): Promise<Record<string, LoadResult>> {
    console.log(`🚀 ${regions.length}개 지역 동시 로딩 시작`)
    const startTime = Date.now()

    const results: Record<string, LoadResult> = {}
    
    // 병렬로 처리하되 Promise.allSettled로 일부 실패해도 계속 진행
    const promises = regions.map(async ({sido, sgg}) => {
      const regionKey = `${sido}/${sgg}`
      try {
        const result = await this.loadKindergartenData(sido, sgg)
        results[regionKey] = result
      } catch (error) {
        console.error(`${regionKey} 로딩 실패:`, error)
        results[regionKey] = {
          data: [],
          source: 'api',
          region: regionKey,
          loadTime: 0,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        }
      }
    })

    await Promise.allSettled(promises)
    
    const totalTime = Date.now() - startTime
    const successCount = Object.values(results).filter(r => r.data.length > 0).length
    
    console.log(`✅ 다중 지역 로딩 완료: ${successCount}/${regions.length} 성공 (${totalTime}ms)`)
    
    return results
  }

  // 캐시 상태 확인
  async getCacheStatus(regions: Array<{sido: string, sgg: string}>): Promise<Record<string, any>> {
    return await this.cacheManager.getMultipleCacheStatus(regions)
  }

  // 캐시 강제 새로고침
  async refreshCache(sido: string, sgg: string): Promise<LoadResult> {
    console.log(`🔄 캐시 강제 새로고침: ${sido}/${sgg}`)
    
    try {
      // 1. 기존 캐시 삭제
      await this.cacheManager.deleteCache(sido, sgg)
      
      // 2. API에서 새 데이터 로드
      const result = await this.loadKindergartenData(sido, sgg)
      
      console.log(`✅ 캐시 새로고침 완료: ${sido}/${sgg}`)
      return result
      
    } catch (error) {
      console.error(`❌ 캐시 새로고침 실패: ${sido}/${sgg}`, error)
      throw error
    }
  }

  // 캐시 통계 조회
  async getCacheStats() {
    return await this.cacheManager.getCacheStats()
  }

  // 오래된 캐시 정리
  async cleanupOldCache(sido?: string, sgg?: string) {
    return await this.cacheManager.cleanupOldCache(sido, sgg)
  }

  // 특정 지역의 캐시가 유효한지 확인
  async isCacheValid(sido: string, sgg: string): Promise<boolean> {
    const metadata = await this.cacheManager.getCacheMetadata(sido, sgg)
    return metadata !== null && !metadata.isExpired
  }

  // 로딩 성능 분석
  analyzePerformance(results: Record<string, LoadResult>) {
    const cacheHits = Object.values(results).filter(r => r.source === 'cache').length
    const apiCalls = Object.values(results).filter(r => r.source === 'api').length
    const totalData = Object.values(results).reduce((sum, r) => sum + r.data.length, 0)
    const avgLoadTime = Object.values(results).reduce((sum, r) => sum + r.loadTime, 0) / Object.keys(results).length

    return {
      totalRegions: Object.keys(results).length,
      cacheHits,
      apiCalls,
      cacheHitRate: (cacheHits / Object.keys(results).length * 100).toFixed(1) + '%',
      totalDataCount: totalData,
      averageLoadTime: Math.round(avgLoadTime) + 'ms',
      trafficSaved: apiCalls === 0 ? '100%' : ((cacheHits / Object.keys(results).length) * 100).toFixed(1) + '%'
    }
  }
}
