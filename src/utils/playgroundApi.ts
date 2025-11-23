// 전국어린이놀이시설정보서비스 연동 유틸리티 (Supabase Edge 함수 경유)
import { supabase } from '../lib/supabase'
import { getGeocodingWithCache } from './geocodingCache'
import type { KindergartenMapData } from '../types/kakaoMap'

const PLAYGROUND_BUCKET = process.env.REACT_APP_PLAYGROUND_CACHE_BUCKET || 'playground-cache'
const PLAYGROUND_SNAPSHOT_PREFIX = process.env.REACT_APP_PLAYGROUND_SNAPSHOT_PREFIX || 'latest'
const PAGE_DOWNLOAD_CONCURRENCY = 4
const STORAGE_TIMEOUT_MS = 10000
const STORAGE_MAX_RETRIES = 3
const STORAGE_RETRY_DELAY_MS = 600
const REGION_GROUP_MAX_RETRIES = 2
const REGION_GROUP_RETRY_DELAY_MS = 1200

let regionCodeCache: string[] | null = null
let regionCodeCachePromise: Promise<string[]> | null = null
const storageExistenceCache = new Map<string, boolean>()
const missingJsonPathCache = new Set<string>()

export interface PlaygroundRawItem {
	pfctNm?: string
	pfctSn?: string
	roadAddr?: string
	addr?: string
	dtlAddr?: string
	ronaAddr?: string
	ronaDaddr?: string
	instlPlaceCd?: string
	instlPlaceCdNm?: string
	wowaStylRideCd?: string
	wowaStylRideCdNm?: string
	lat?: number | string
	lng?: number | string
	x?: number | string
	y?: number | string
	tel?: string
	latCrtsVl?: string
	lotCrtsVl?: string
	zip?: string
	rgnCd?: string
	rgnCdNm?: string
	operYnCdNm?: string
	prvtPblcYnCdNm?: string
	[extra: string]: any
}

export interface PlaygroundFetchParams {
	pageIndex?: number
	recordCountPerPage?: number
	instlPlaceCd?: string
	pfctNm?: string
	pfctSn?: string
	wowaStylRideCd?: string
	extraParams?: Record<string, string | number | boolean>
}

export interface PlaygroundApiResponse {
	success: boolean
	data: any
	error?: string
}

export interface PlaygroundRegionMeta {
	regionCode?: string
	regionName?: string
	snapshotPrefix?: string
	syncedAt?: string
	itemCount?: number
	[key: string]: any
}

export interface PlaygroundRegionCacheResult {
	items: PlaygroundRawItem[]
	meta: PlaygroundRegionMeta | null
}

function ensureArray<T>(value: unknown): T[] {
	if (Array.isArray(value)) return value as T[]
	if (value === undefined || value === null) return []
	return [value as T]
}

function parseRegionCodes(code?: string | number | null): { sidoCode: number; sggCode: number } {
	const str = String(code ?? '').trim()
	if (!str) return { sidoCode: 0, sggCode: 0 }
	const sido = parseInt(str.slice(0, 2), 10)
	const sgg = parseInt(str.slice(0, 5), 10)
	return {
		sidoCode: Number.isFinite(sido) ? sido : 0,
		sggCode: Number.isFinite(sgg) ? sgg : 0,
	}
}

export async function listPlaygroundRegionCodes(): Promise<string[]> {
	if (regionCodeCache) return regionCodeCache
	if (!regionCodeCachePromise) {
		regionCodeCachePromise = (async () => {
			try {
				const names = await listStorageFiles('regions', 1000)
				return names.filter((name) => /^\d{10}$/.test(name))
			} catch (error) {
				console.error('[PlaygroundCache] 지역 코드 목록 로딩 오류:', error)
				return []
			}
		})()
	}
	const codes = await regionCodeCachePromise
	regionCodeCache = codes
	return codes
}

export async function fetchPlaygroundsFromCache(regionCode: string): Promise<PlaygroundRegionCacheResult | null> {
	const code = String(regionCode || '').trim()
	if (!code) return null

	try {
		const basePath = `regions/${code}`
		const latestPath = `${basePath}/latest.json`
		const exists = await storageFileExists(latestPath)
		if (!exists) {
			console.log('[PlaygroundCache] latest.json 미존재', {
				regionCode: code,
			})
			return null
		}
		const { data, error } = await supabase.storage
			.from(PLAYGROUND_BUCKET)
			.download(latestPath)

		if (error || !data) {
			const status = (error as any)?.statusCode || (error as any)?.status || 'unknown'
			const message = (error as any)?.message || String(error)
			console.log('[PlaygroundCache] latest.json 다운로드 실패', {
				regionCode: code,
				status,
				message,
			})
			return null
		}

		const text = await data.text()
		const parsed = JSON.parse(text) as {
			meta?: PlaygroundRegionMeta
			items?: PlaygroundRawItem[]
			data?: PlaygroundRawItem[]
		}

		const items = ensureArray<PlaygroundRawItem>(parsed.items ?? parsed.data)
		const meta: PlaygroundRegionMeta = {
			regionCode: code,
			itemCount: items.length,
			...(parsed.meta ?? {}),
		}

		console.log('[PlaygroundCache] 지역 캐시 사용:', {
			regionCode: code,
			itemCount: items.length,
			snapshot: meta.snapshotPrefix,
		})

		return { items, meta }
	} catch (error) {
		console.error('[PlaygroundCache] 캐시 로딩 오류:', {
			regionCode: code,
			error,
		})
		return null
	}
}

export async function fetchPlaygrounds(params: PlaygroundFetchParams = {}): Promise<PlaygroundRawItem[]> {
	const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
	const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseKey) {
		throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
	}

	const functionUrl = `${supabaseUrl}/functions/v1/playground-api`
	const resp = await fetch(functionUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${supabaseKey}`,
		},
		body: JSON.stringify({ action: 'fetch', ...params }),
	})

	if (!resp.ok) {
		throw new Error(`Edge Function 호출 실패: ${resp.status}`)
	}

	const json: PlaygroundApiResponse = await resp.json()
	if (!json.success) {
		console.warn('[PlaygroundAPI] 호출 실패:', {
			error: json.error,
			// @ts-ignore
			debug: (json as any).debug,
			// @ts-ignore
			urlTried: (json as any).urlTried,
		})
		return []
	}

	try {
		const summary = Array.isArray((json as any).data?.response?.items)
			? { itemsCount: (json as any).data.response.items.length }
			: undefined
		console.log('[PlaygroundAPI] 원본 응답(JSON):', summary ?? '(no summary)', (json as any).data)
	} catch {}

	const root = json.data
	const candidates: any[] = [
		root?.response?.items,
		root?.response?.body?.items,
		root?.items,
		root?.data,
		Array.isArray(root) ? root : null,
	].filter(Boolean)

	const items: PlaygroundRawItem[] = Array.isArray(candidates[0]) ? candidates[0] : []
	return items
}

export async function fetchPlaygroundsByRegionGroup(options: {
	regionCode?: string
	sggCode?: string | number
	signal?: AbortSignal
	suppressLog?: boolean
}): Promise<{ items: PlaygroundRawItem[]; regionCodes: string[] }> {
	const { signal, suppressLog } = options
	const shouldLog = !suppressLog
	const throwIfAborted = () => {
		if (signal?.aborted) {
			const abortError = new Error('fetchPlaygroundsByRegionGroup aborted')
			abortError.name = 'AbortError'
			throw abortError
		}
	}

	throwIfAborted()
	const targetRegion = String(options.regionCode ?? '').trim()
	const sggPrefix = options.sggCode
		? String(options.sggCode).trim().replace(/\D+/g, '').padStart(5, '0')
		: ''

	const allCodes = await listPlaygroundRegionCodes()

	throwIfAborted()

	const targetCodes = new Set<string>()
	if (targetRegion && /^\d{10}$/.test(targetRegion)) {
		targetCodes.add(targetRegion)
	}

	if (sggPrefix) {
		for (const code of allCodes) {
			if (code.startsWith(sggPrefix)) {
				targetCodes.add(code)
			}
		}
	}

	if (targetCodes.size === 0) {
		console.warn('[PlaygroundCache] 구 단위 대상 코드가 없습니다.', {
			regionCode: targetRegion,
			sggPrefix,
		})
		return { items: [], regionCodes: [] }
	}

	const codes = Array.from(targetCodes)
	const items: PlaygroundRawItem[] = []
	let attempt = 0
	let pendingQueue: string[] = [...codes]
	const failedAfterRetries = new Set<string>()

	while (pendingQueue.length && attempt <= REGION_GROUP_MAX_RETRIES) {
		throwIfAborted()
		const nextRetry = new Set<string>()
	let index = 0
		while (index < pendingQueue.length) {
			throwIfAborted()
			const chunk = pendingQueue.slice(index, index + PAGE_DOWNLOAD_CONCURRENCY)
		const results = await Promise.all(
			chunk.map(async (code) => {
					if (signal?.aborted) return []
				const path = `regions/${code}/latest.json`
				try {
					const json = await downloadStorageJson(path)
						if (signal?.aborted) return []
					const regionItems = ensureArray<PlaygroundRawItem>(json?.items ?? json?.data)
						if (!signal?.aborted && regionItems.length && shouldLog) {
						console.log('[PlaygroundCache] 구 단위 로드', {
							code,
							count: regionItems.length,
						})
					}
						if (!regionItems.length && !missingJsonPathCache.has(path)) {
							nextRetry.add(code)
						}
					return regionItems
				} catch (error) {
						if (signal?.aborted) return []
					console.warn('[PlaygroundCache] 구 단위 로드 실패', {
						path,
						error,
					})
						if (!missingJsonPathCache.has(path)) {
							nextRetry.add(code)
						}
					return []
				}
			}),
		)
			throwIfAborted()
		for (const arr of results) {
			if (Array.isArray(arr) && arr.length) {
				items.push(...arr)
			}
		}
		index += PAGE_DOWNLOAD_CONCURRENCY
	}

		if (nextRetry.size === 0) {
			break
		}

		attempt += 1
		if (attempt > REGION_GROUP_MAX_RETRIES) {
			failedAfterRetries.clear()
			nextRetry.forEach((code) => failedAfterRetries.add(code))
			break
		}

		await delay(REGION_GROUP_RETRY_DELAY_MS * attempt)
		pendingQueue = Array.from(nextRetry)
	}

	if (failedAfterRetries.size && shouldLog) {
		console.warn('[PlaygroundCache] 구 단위 로드 일부 실패 (재시도 한계 초과)', {
			failedCodes: Array.from(failedAfterRetries),
			regionCode: targetRegion,
			retryAttempts: attempt,
		})
	}

	throwIfAborted()

	if (items.length === 0) {
		if (shouldLog) {
		console.warn('[PlaygroundCache] 구 단위 데이터가 비어 있습니다.', {
			regionCode: targetRegion,
			sggPrefix,
		})
		}
		return { items: [], regionCodes: codes }
	}

	throwIfAborted()

	const dedup = new Map<string, PlaygroundRawItem>()
	for (const item of items) {
		const id = String(item.pfctSn ?? item.pfctNm ?? Math.random().toString(36).slice(2))
		if (!dedup.has(id)) {
			dedup.set(id, item)
		}
	}

	throwIfAborted()

	return { items: Array.from(dedup.values()), regionCodes: codes }
}

export async function playgroundToMapData(
	item: PlaygroundRawItem,
	currentLat?: number,
	currentLng?: number,
): Promise<KindergartenMapData> {
	let lat = parseFloat(
		String(item.latCrtsVl ?? item.y ?? item.lat ?? ''),
	)
	let lng = parseFloat(
		String(item.lotCrtsVl ?? item.x ?? item.lng ?? ''),
	)

	const baseAddr = item.ronaAddr || item.roadAddr || item.addr || ''
	const detailAddr = item.ronaDaddr || item.dtlAddr || ''
	const zipRaw = item.zip ? String(item.zip) : ''
	const normalizedZip = zipRaw.replace(/[^\d]/g, '').slice(0, 5)

	const addressParts = [baseAddr, detailAddr]
		.map((part) => (part || '').trim())
		.filter(Boolean)
	const joinedAddress = addressParts.join(' ')

	const displayAddress =
		joinedAddress && normalizedZip
			? `${joinedAddress} (${normalizedZip})`
			: joinedAddress || (normalizedZip ? `우편번호 ${normalizedZip}` : '')

	let geocodeQuery = joinedAddress
	if (!geocodeQuery && normalizedZip) {
		geocodeQuery = normalizedZip
	}

	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		if (geocodeQuery) {
			try {
				const coords = await getGeocodingWithCache(geocodeQuery)
				if (coords) {
					lat = coords.lat
					lng = coords.lng
				}
			} catch {}
		}
	}

	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		lat = 37.5665
		lng = 126.978
	}

	const fallbackId = `${item.pfctNm || 'playground'}_${Math.random().toString(36).slice(2)}`
	const id = String(item.pfctSn ?? fallbackId)
	const name = String(item.pfctNm || '어린이놀이시설')

	let distance = 0
	if (
		Number.isFinite(lat) &&
		Number.isFinite(lng) &&
		Number.isFinite(currentLat ?? NaN) &&
		Number.isFinite(currentLng ?? NaN)
	) {
		distance = haversineDistance(currentLat as number, currentLng as number, lat, lng)
	}

	const { sidoCode, sggCode } = parseRegionCodes(item.rgnCd)
	const statusLabel = item.operYnCdNm ? `운영상태 ${item.operYnCdNm}` : '놀이시설'
	const installLabel = item.instlPlaceCdNm
		? `${item.instlPlaceCdNm}${item.prvtPblcYnCdNm ? ` • ${item.prvtPblcYnCdNm}` : ''}`
		: item.instlPlaceCd
			? `설치장소 ${item.instlPlaceCd}`
			: ''

	return {
		id,
		code: id,
		name,
		address: displayAddress || joinedAddress,
		lat,
		lng,
		type: 'playground' as any,
		establishment: statusLabel,
		officeedu: installLabel,
		telno: item.tel || '',
		opertime: '',
		prmstfcnt: 0,
		ag3fpcnt: 0,
		ag4fpcnt: 0,
		ag5fpcnt: 0,
		hpaddr: '',
		rating: 0.0,
		distance,
		image: undefined,
		sidoCode,
		sggCode,
	}
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
	const R = 6371
	const dLat = ((lat2 - lat1) * Math.PI) / 180
	const dLng = ((lng2 - lng1) * Math.PI) / 180
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) * Math.sin(dLng / 2)
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
	return R * c
}

async function listStorageFiles(prefix: string, limit = 1000): Promise<string[]> {
	const files: string[] = []
	let offset = 0

	while (true) {
		const { data, error } = await supabase.storage.from(PLAYGROUND_BUCKET).list(prefix, {
			limit,
			offset,
		})

		if (error) {
			throw new Error(`Storage 리스트 실패 (${prefix}): ${error.message}`)
		}

		if (!data || data.length === 0) break

		for (const entry of data) {
			if (entry && entry.name) files.push(entry.name)
		}

		if (data.length < limit) break
		offset += data.length
	}

	return files
}

async function storageFileExists(path: string): Promise<boolean> {
	if (missingJsonPathCache.has(path)) return false
	if (storageExistenceCache.has(path)) {
		return storageExistenceCache.get(path) === true
	}
	const segments = path.split('/').filter(Boolean)
	if (segments.length === 0) return false
	const fileName = segments.pop()!
	const dir = segments.join('/') || ''
	const { data, error } = await supabase.storage.from(PLAYGROUND_BUCKET).list(dir, {
		limit: 100,
	})
	if (error) {
		console.warn('[PlaygroundCache] 파일 존재 여부 확인 실패', { path, error })
		storageExistenceCache.set(path, false)
		return false
	}
	const exists = !!data?.some((entry) => entry?.name === fileName)
	storageExistenceCache.set(path, exists)
	if (!exists) missingJsonPathCache.add(path)
	return exists
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(label)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function downloadStorageJson(path: string): Promise<any | null> {
	const exists = await storageFileExists(path)
	if (!exists) {
		console.log('[PlaygroundCache] 스토리지 파일 없음', {
			path,
		})
		return null
	}

	if (missingJsonPathCache.has(path)) {
		return null
	}

	for (let attempt = 0; attempt <= STORAGE_MAX_RETRIES; attempt += 1) {
		try {
			const { data, error } = await withTimeout(
				supabase.storage.from(PLAYGROUND_BUCKET).download(path),
				STORAGE_TIMEOUT_MS,
				`Supabase download timeout (${path})`,
			)
	if (error || !data) {
		const status = (error as any)?.status || (error as any)?.statusCode
		if (status === 400 || status === 404) {
			console.log('[PlaygroundCache] 스토리지 파일 없음', {
				path,
				status,
			})
					missingJsonPathCache.add(path)
					storageExistenceCache.set(path, false)
			return null
		}
				throw error ?? new Error('Unknown storage download error')
	}

	const text = await data.text()
	try {
		return JSON.parse(text)
	} catch (parseError) {
		console.warn('[PlaygroundCache] JSON 파싱 실패', {
			path,
			parseError,
		})
		return null
	}
		} catch (err) {
			if (attempt >= STORAGE_MAX_RETRIES) {
				console.warn('[PlaygroundCache] 스토리지 다운로드 실패', {
					path,
					error: err,
				})
				return null
			}
			await delay(STORAGE_RETRY_DELAY_MS * (attempt + 1))
		}
	}

	return null
}

export async function fetchAllPlaygroundsFromSnapshot(): Promise<PlaygroundRawItem[]> {
	try {
		const snapshotPath = `pages/${PLAYGROUND_SNAPSHOT_PREFIX}`
		const fileNames = await listStorageFiles(snapshotPath, 200)
		const pageFiles = fileNames.filter((name) => /^page-\d{4}\.json$/.test(name)).sort()

		if (pageFiles.length === 0) {
			console.warn('[PlaygroundCache] 스냅샷 페이지 파일이 없습니다.', {
				snapshot: PLAYGROUND_SNAPSHOT_PREFIX,
			})
			return []
		}

		console.log('[PlaygroundCache] 스냅샷 전체 로딩 시작', {
			snapshot: PLAYGROUND_SNAPSHOT_PREFIX,
			pageCount: pageFiles.length,
		})

		const items: PlaygroundRawItem[] = []
		let index = 0
		while (index < pageFiles.length) {
			const chunk = pageFiles.slice(index, index + PAGE_DOWNLOAD_CONCURRENCY)
			const results = await Promise.all(
				chunk.map(async (fileName) => {
					const path = `${snapshotPath}/${fileName}`
					try {
						const json = await downloadStorageJson(path)
						const pageItems = ensureArray<PlaygroundRawItem>(json?.items ?? json?.data)
						console.log('[PlaygroundCache] 페이지 로드', {
							fileName,
							count: pageItems.length,
						})
						return pageItems
					} catch (error) {
						console.warn('[PlaygroundCache] 페이지 로드 실패', {
							path,
							error,
						})
						return []
					}
				}),
			)
			for (const arr of results) {
				if (Array.isArray(arr)) {
					items.push(...arr)
				}
			}
			index += PAGE_DOWNLOAD_CONCURRENCY
		}

		console.log('[PlaygroundCache] 스냅샷 전체 로딩 완료', {
			count: items.length,
		})

		return items
	} catch (error) {
		console.error('[PlaygroundCache] 스냅샷 로딩 오류:', error)
		return []
	}
}

export async function fetchPlaygroundsBySido(sidoCode: string | number): Promise<PlaygroundRawItem[]> {
	const prefix = String(sidoCode ?? '').trim().padStart(2, '0')
	if (!prefix || prefix === '00') {
		return []
	}

	try {
		const regionDirs = await listStorageFiles('regions', 1000)
		const regionCodes = regionDirs.filter((name) => /^\d{10}$/.test(name) && name.startsWith(prefix))

		if (regionCodes.length === 0) {
			console.warn('[PlaygroundCache] 시도 코드에 해당하는 지역이 없습니다.', {
				sidoCode: prefix,
			})
			return []
		}

		console.log('[PlaygroundCache] 시도 단위 캐시 로드 시작', {
			sidoCode: prefix,
			regionCount: regionCodes.length,
		})

		const items: PlaygroundRawItem[] = []
		let index = 0
		while (index < regionCodes.length) {
			const chunk = regionCodes.slice(index, index + PAGE_DOWNLOAD_CONCURRENCY)
			const results = await Promise.all(
				chunk.map(async (code) => {
					const path = `regions/${code}/latest.json`
					try {
						const json = await downloadStorageJson(path)
						const regionItems = ensureArray<PlaygroundRawItem>(json?.items ?? json?.data)
						console.log('[PlaygroundCache] 시도 캐시 로드', {
							code,
							count: regionItems.length,
						})
						return regionItems
					} catch (error) {
						console.warn('[PlaygroundCache] 시도 캐시 로드 실패', {
							path,
							error,
						})
						return []
					}
				}),
			)
			for (const arr of results) {
				if (Array.isArray(arr)) {
					items.push(...arr)
				}
			}
			index += PAGE_DOWNLOAD_CONCURRENCY
		}

		console.log('[PlaygroundCache] 시도 단위 캐시 로드 완료', {
			sidoCode: prefix,
			total: items.length,
		})

		return items
	} catch (error) {
		console.error('[PlaygroundCache] 시도 단위 캐시 로딩 오류:', {
			sidoCode: prefix,
			error,
		})
		return []
	}
}


