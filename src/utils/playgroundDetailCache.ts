// 놀이시설 상세 정보 캐시 매니저
import { supabase } from '../lib/supabase'
import type { PlaygroundRawItem } from './playgroundApi'
import type { KindergartenMapData } from '../types/kakaoMap'

export interface PlaygroundDetailState {
	map: KindergartenMapData
	raw: PlaygroundRawItem | null
}

export interface PlaygroundDetailCache {
	meta: {
		playgroundId: string
		lastSyncedAt: string // ISO
		apiVersion?: string
	}
	data: PlaygroundDetailState
}

export interface DetailCacheMetadata {
	playgroundId: string
	lastUpdated: string
	filePath: string
	isExpired?: boolean
}

export class PlaygroundDetailCacheManager {
	private supabase = supabase
	private bucketName = 'playground-detail-cache'
	private cacheExpiryDays = 7 // 7일 후 만료

	// 놀이시설 상세 정보 캐시 경로
	private detailPath(playgroundId: string): string {
		return `details/${playgroundId}/latest.json`
	}

	private snapshotPath(playgroundId: string, isoDate: string): string {
		return `details/${playgroundId}/${isoDate}.json`
	}

	// 최신 캐시 데이터 조회
	async getCachedDetail(playgroundId: string): Promise<PlaygroundDetailState | null> {
		try {
			const latestKey = this.detailPath(playgroundId)
			
			console.log(`🔍 놀이시설 캐시 조회 시작: ${this.bucketName}/${latestKey}`)
			
			// 파일 존재 여부를 먼저 확인 (오류 로그 방지)
			const { data: fileList, error: listError } = await this.supabase.storage
				.from(this.bucketName)
				.list(`details/${playgroundId}`)

			console.log('📁 폴더 내 파일 목록:', fileList?.map(f => f.name))

			// 디렉토리나 파일이 없는 경우
			if (listError || !fileList || fileList.length === 0) {
				console.log(`📁 Storage에 놀이시설 상세 정보 캐시 없음: ${playgroundId}`)
				return null
			}

			// latest.json 파일이 있는지 확인
			const latestFile = fileList.find(file => file.name === 'latest.json')
			if (!latestFile) {
				console.log(`📁 latest.json 파일 없음: ${playgroundId}`)
				console.log('📁 사용 가능한 파일:', fileList.map(f => f.name))
				return null
			}

			// 파일의 updated_at으로 먼저 TTL 체크 (다운로드 전에)
			const fileUpdatedAt = new Date(latestFile.updated_at).getTime()
			const fileAgeDays = (Date.now() - fileUpdatedAt) / (1000 * 60 * 60 * 24)
			
			if (fileAgeDays > this.cacheExpiryDays) {
				console.log(`⏰ 파일 메타데이터 기준 캐시 만료: ${playgroundId} (${fileAgeDays.toFixed(1)}일 경과)`)
				return null
			}

			console.log(`📄 latest.json 파일 다운로드 시작: ${latestKey} (${fileAgeDays.toFixed(1)}일 전)`)

			// 파일 다운로드
			const { data, error } = await this.supabase.storage
				.from(this.bucketName)
				.download(latestKey)

			if (error || !data) {
				console.log(`놀이시설 상세 정보 캐시 읽기 실패: ${playgroundId}`)
				return null
			}

			const text = await data.text()
			const envelope: PlaygroundDetailCache = JSON.parse(text)

			console.log(`✅ 놀이시설 상세 정보 캐시 사용: ${playgroundId} (${fileAgeDays.toFixed(1)}일 전)`)
			return envelope.data

		} catch (error) {
			// JSON 파싱 오류 등 실제 오류만 로그 출력
			console.error('놀이시설 상세 정보 캐시 조회 오류:', error)
			return null
		}
	}

	// 캐시 저장
	async saveDetailCache(playgroundId: string, detailData: PlaygroundDetailState): Promise<void> {
		try {
			const now = new Date()
			const isoDate = now.toISOString().split('T')[0] // YYYY-MM-DD
			
			const envelope: PlaygroundDetailCache = {
				meta: {
					playgroundId,
					lastSyncedAt: now.toISOString(),
					apiVersion: '1.0'
				},
				data: detailData
			}

			// latest.json 저장
			const latestKey = this.detailPath(playgroundId)
			const latestBlob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
			
			const { error: latestError } = await this.supabase.storage
				.from(this.bucketName)
				.upload(latestKey, latestBlob, {
					cacheControl: '3600',
					upsert: true
				})

			if (latestError) {
				throw latestError
			}

			// 스냅샷 저장 (히스토리용)
			const snapshotKey = this.snapshotPath(playgroundId, isoDate)
			const { error: snapshotError } = await this.supabase.storage
				.from(this.bucketName)
				.upload(snapshotKey, latestBlob, {
					cacheControl: '3600',
					upsert: true
				})

			if (snapshotError) {
				console.warn('스냅샷 저장 실패:', snapshotError)
			}

			console.log(`💾 놀이시설 상세 정보 캐시 저장 완료: ${playgroundId}`)

		} catch (error) {
			console.error('놀이시설 상세 정보 캐시 저장 오류:', error)
			throw error
		}
	}

	// 캐시 메타데이터 조회
	async getCacheMetadata(playgroundId: string): Promise<DetailCacheMetadata | null> {
		try {
			const path = `details/${playgroundId}`
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
				playgroundId,
				lastUpdated: file.updated_at,
				filePath: `${path}/${file.name}`,
				isExpired: ageDays > this.cacheExpiryDays
			}
		} catch (error) {
			console.error('놀이시설 상세 정보 캐시 메타데이터 조회 오류:', error)
			return null
		}
	}

	// 캐시 삭제 (강제 새로고침용)
	async deleteDetailCache(playgroundId: string): Promise<void> {
		try {
			const base = `details/${playgroundId}`
			const { data: files } = await this.supabase.storage
				.from(this.bucketName)
				.list(base)

			if (!files || files.length === 0) {
				console.log(`삭제할 놀이시설 상세 정보 캐시 없음: ${playgroundId}`)
				return
			}

			const targets = files.map(f => `${base}/${f.name}`)
			const { error } = await this.supabase.storage
				.from(this.bucketName)
				.remove(targets)

			if (error) {
				throw error
			}

			console.log(`🗑️ 놀이시설 상세 정보 캐시 삭제 완료: ${playgroundId} (${targets.length}개 파일)`)
		} catch (error) {
			console.error('놀이시설 상세 정보 캐시 삭제 오류:', error)
			throw error
		}
	}

	// 오래된 캐시 정리
	async cleanupOldDetailCache(): Promise<void> {
		try {
			const { data: files } = await this.supabase.storage
				.from(this.bucketName)
				.list('details', { limit: 1000 })

			if (!files) return

			const cutoff = Date.now() - this.cacheExpiryDays * 24 * 60 * 60 * 1000
			const toDelete: string[] = []

			for (const file of files) {
				const updated = new Date(file.updated_at).getTime()
				// latest.json은 제외하고 오래된 파일만 삭제
				if (updated < cutoff && file.name !== 'latest.json') {
					toDelete.push(`details/${file.name}`)
				}
			}

			if (toDelete.length > 0) {
				await this.supabase.storage
					.from(this.bucketName)
					.remove(toDelete)
				console.log(`🧹 오래된 놀이시설 상세 정보 캐시 정리 완료: ${toDelete.length}개 파일 삭제`)
			}
		} catch (error) {
			console.error('놀이시설 상세 정보 캐시 정리 오류:', error)
		}
	}

	// 캐시 통계 조회
	async getDetailCacheStats(): Promise<{
		totalDetails: number
		validCaches: number
		expiredCaches: number
		totalFiles: number
	}> {
		try {
			const { data: files } = await this.supabase.storage
				.from(this.bucketName)
				.list('details', { limit: 1000 })

			if (!files) {
				return { totalDetails: 0, validCaches: 0, expiredCaches: 0, totalFiles: 0 }
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
				totalDetails: latestFiles.length,
				validCaches,
				expiredCaches,
				totalFiles: files.length
			}
		} catch (error) {
			console.error('놀이시설 상세 정보 캐시 통계 조회 오류:', error)
			return { totalDetails: 0, validCaches: 0, expiredCaches: 0, totalFiles: 0 }
		}
	}
}

// 전역 인스턴스
export const playgroundDetailCacheManager = new PlaygroundDetailCacheManager()

