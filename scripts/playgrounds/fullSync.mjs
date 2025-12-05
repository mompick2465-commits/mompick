import { createClient } from '@supabase/supabase-js'

// 환경 변수에서만 가져오기 (하드코딩 금지)
const SUPABASE_URL =
	process.env.SUPABASE_URL ||
	process.env.REACT_APP_SUPABASE_URL ||
	process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_SERVICE_KEY
const DATA_GOV_API_KEY =
	process.env.DATA_GOV_API_KEY ||
	process.env.PLAYGROUND_API_KEY ||
	process.env.DATA_GOV_ENCODING_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DATA_GOV_API_KEY) {
	console.error(
		'[playground-sync] 환경 변수가 부족합니다. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATA_GOV_API_KEY를 설정해주세요.',
	)
	process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const BUCKET = process.env.PLAYGROUND_CACHE_BUCKET || 'playground-cache'
const MODE = (process.env.PLAYGROUND_MODE || '').toLowerCase().trim() // '', 'regions-only'
const BASE_URL = 'https://apis.data.go.kr/1741000/pfc3/getPfctInfo3'
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-')

const PAGE_SIZE = Number(process.env.PLAYGROUND_PAGE_SIZE || 1000)
const START_PAGE = Number(process.env.PLAYGROUND_START_PAGE || 1)
const MAX_PAGES = Number(process.env.PLAYGROUND_MAX_PAGES || 0) // 0 => 전체
const DELAY_MS = Number(process.env.PLAYGROUND_DELAY_MS || 200)
const SKIP_REGION_UPLOAD = (process.env.PLAYGROUND_SKIP_REGION_UPLOAD || '').toLowerCase() === 'true'
const SKIP_EXISTING_REGIONS = (process.env.PLAYGROUND_SKIP_EXISTING ?? 'true').toLowerCase() === 'true'
const REGION_START_INDEX = Number(process.env.PLAYGROUND_REGION_START || 0)

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function ensureArray(value) {
	if (Array.isArray(value)) return value
	if (value === undefined || value === null) return []
	return [value]
}

async function fetchPage(pageNo) {
	const params = new URLSearchParams({
		serviceKey: DATA_GOV_API_KEY,
		// GW 스타일 파라미터 (pageIndex/recordCountPerPage)가 실제로 1000건까지 허용됨
		pageIndex: String(pageNo),
		recordCountPerPage: String(PAGE_SIZE),
		// 혹시 모를 호환성을 위해 pageNo/numOfRows도 함께 전달
		pageNo: String(pageNo),
		numOfRows: String(PAGE_SIZE),
		returnType: 'json',
	})

	const url = `${BASE_URL}?${params.toString()}`
	const response = await fetch(url)

	if (!response.ok) {
		const text = await response.text().catch(() => '')
		throw new Error(`API 호출 실패 (status ${response.status}) url=${url}, body=${text.slice(0, 200)}...`)
	}

	const json = await response.json()
	const body = json?.response?.body ?? {}
	const items = ensureArray(body.items)

	return {
		items,
		totalCount: Number(body.totalCnt || items.length),
		totalPageCount: Number(body.totalPageCnt || body.pageCnt || 0),
		recordCountPerPage: Number(body.recordCountPerPage || body.numOfRows || PAGE_SIZE),
		raw: json,
		url,
	}
}

async function listStorageEntries(prefix) {
	const entries = []
	let offset = 0

	while (true) {
		const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
			limit: 100,
			offset,
			sortBy: { column: 'name', order: 'asc' },
		})

		if (error) {
			throw new Error(`Storage 목록 조회 실패 (${prefix}): ${error.message}`)
		}

		if (!data || data.length === 0) break

		for (const item of data) {
			entries.push(item)
		}

		offset += data.length
		if (data.length < 100) break
	}

	return entries
}

async function downloadJson(path) {
	const { data, error } = await supabase.storage.from(BUCKET).download(path)
	if (error) {
		throw new Error(`Storage 다운로드 실패 (${path}): ${error.message}`)
	}
	const text = await data.text()
	return JSON.parse(text)
}

function groupItemsByRegion(items) {
	const map = new Map()
	for (const item of items) {
		const code = String(item.rgnCd || '').trim()
		if (!code) continue
		if (!map.has(code)) {
			map.set(code, { name: item.rgnCdNm || null, items: [] })
		}
		map.get(code).items.push(item)
	}
	return map
}

function makeBlob(data) {
	const json = JSON.stringify(data, null, 2)
	return new Blob([json], { type: 'application/json' })
}

async function uploadJson(path, data, cacheControl = '3600') {
	const { error } = await supabase.storage.from(BUCKET).upload(path, makeBlob(data), {
		cacheControl,
		contentType: 'application/json',
		upsert: true,
	})

	if (error) {
		const err = new Error(`Storage 업로드 실패 (${path}): ${error.message}`)
		// @ts-ignore
		err.code = error.statusCode
		// @ts-ignore
		err.context = error
		throw err
	}
}

async function uploadJsonWithRetry(path, data, cacheControl = '3600', retries = 3, delayMs = 500) {
	let attempt = 0
	while (true) {
		try {
			await uploadJson(path, data, cacheControl)
			if (attempt > 0) {
				console.log(`   ↪︎ 업로드 재시도 성공: ${path} (attempt ${attempt + 1})`)
			}
			return
		} catch (error) {
			attempt += 1
			const message = error instanceof Error ? error.message : String(error)
			const status = error?.code ?? error?.context?.statusCode ?? 'unknown'
			if (attempt > retries) {
				console.error(`   ❌ 업로드 재시도 초과 (${path}) - status:${status} message:${message}`)
				throw error
			}
			const wait = delayMs * attempt
			console.warn(`   ⚠️ 업로드 재시도 예정 (${path}) attempt:${attempt} status:${status} message:${message} → ${wait}ms 대기`)
			await sleep(wait)
		}
	}
}

async function uploadPageSnapshots(meta, pageChunks) {
	console.log('💾 Storage 업로드 시작 (페이지 단위)')
	for (const chunk of pageChunks) {
		const data = {
			meta: {
				...meta,
				page: chunk.page,
				itemCount: chunk.items.length,
			},
			items: chunk.items,
		}

		const paddedPage = String(chunk.page).padStart(4, '0')
		const basePath = `pages/${TIMESTAMP}`
		await uploadJsonWithRetry(`${basePath}/page-${paddedPage}.json`, data, '86400')
		await uploadJsonWithRetry(`pages/latest/page-${paddedPage}.json`, data, '600')
		console.log(`   • 페이지 ${chunk.page} 저장 (items=${chunk.items.length})`)
	}
}

async function uploadRegionSnapshots(meta, regionEntries, options = {}) {
	const { snapshotPrefix = TIMESTAMP, logInterval = 20 } = options
	console.log('💾 Storage 업로드 (지역 단위)')

	const total = regionEntries.length
	const startIndex = REGION_START_INDEX > 0 ? Math.min(REGION_START_INDEX, total) : 0
	if (startIndex > 0) {
		console.log(`   - REGION_START_INDEX 적용: ${startIndex}부터 재개 (총 ${total}개)`)
	}

	for (let idx = 0; idx < startIndex; idx += 1) {
		const [code] = regionEntries[idx]
		if (idx % logInterval === 0) {
			console.log(`   • (건너뜀) 지역 ${idx}/${total} (code=${code})`)
		}
	}

	for (let idx = startIndex; idx < total; idx += 1) {
		const [code, { name, items }] = regionEntries[idx]
		const processed = idx + 1

		if (SKIP_EXISTING_REGIONS) {
			try {
				const exists = await regionHasLatest(code)
				if (exists) {
					if (processed % logInterval === 0 || processed === total) {
						console.log(`   • (이미 존재) 지역 ${processed}/${total} 건너뜀 (code=${code})`)
					}
					continue
				}
			} catch (err) {
				console.warn(`   ⚠️ 지역 존재 검사 실패 (code=${code})`, err)
			}
		}

		const regionMeta = {
			...meta,
			snapshotPrefix,
			regionCode: code,
			regionName: name,
			itemCount: items.length,
		}
		const regionData = { meta: regionMeta, items }
		const regionPath = `regions/${code}`
		await uploadJsonWithRetry(`${regionPath}/${TIMESTAMP}.json`, regionData, '86400')
		await uploadJsonWithRetry(`${regionPath}/latest.json`, regionData, '600')
		if (processed % logInterval === 0 || processed === total) {
			console.log(`   • 지역 ${processed}/${total} 저장 (code=${code}, items=${items.length})`)
		}
	}

	console.log(`   • 총 ${total}개 지역 파일 저장 완료 (${startIndex > 0 ? `재개 지점 ${startIndex}` : '처음부터'})`)
}

async function uploadMeta(metaInfo) {
	const summaryPath = `meta/${TIMESTAMP}.json`
	const latestPath = `meta/latest.json`
	await uploadJsonWithRetry(summaryPath, metaInfo, '86400')
	await uploadJsonWithRetry(latestPath, metaInfo, '300')
}

async function runFullSync() {
	let currentPage = START_PAGE
	let processedPages = 0
	let totalPages = Infinity
	let totalCount = 0

	const allItems = []
	const regionMap = new Map()
	const pageChunks = []

	while (currentPage <= totalPages) {
		if (MAX_PAGES > 0 && processedPages >= MAX_PAGES) {
			break
		}

		console.log(`📄 페이지 ${currentPage} 호출 중...`)
		const pageResult = await fetchPage(currentPage)
		const { items, totalCount: fetchedTotalCount, totalPageCount } = pageResult

		if (items.length === 0) {
			console.log(`⚠️ 페이지 ${currentPage}에서 더 이상 항목이 없습니다. 중단합니다.`)
			break
		}

		allItems.push(...items)
		pageChunks.push({ page: currentPage, items })
		totalCount = fetchedTotalCount || totalCount
		totalPages = totalPageCount || totalPages

		for (const item of items) {
			const code = String(item.rgnCd || '0000000000').trim()
			if (!regionMap.has(code)) {
				regionMap.set(code, { name: item.rgnCdNm || null, items: [] })
			}
			regionMap.get(code).items.push(item)
		}

		processedPages += 1
		currentPage += 1

		if (currentPage <= totalPages) {
			await sleep(DELAY_MS)
		}
	}

	console.log(`✅ 페이지 수집 완료: ${processedPages}페이지, ${allItems.length}건`)
	console.log(`   - API totalCnt: ${totalCount}, totalPageCnt: ${totalPages}`)

	const meta = {
		syncedAt: new Date().toISOString(),
		pageSize: PAGE_SIZE,
		startPage: START_PAGE,
		endPage: currentPage - 1,
		pagesFetched: processedPages,
		totalPageCount: totalPages,
		totalCount: totalCount || allItems.length,
		source: 'getPfctInfo3',
		url: BASE_URL,
	}

	await uploadPageSnapshots(meta, pageChunks)

	if (!SKIP_REGION_UPLOAD) {
		const regionEntries = Array.from(regionMap.entries())
		await uploadRegionSnapshots(meta, regionEntries)
	} else {
		console.log('⚠️ PLAYGROUND_SKIP_REGION_UPLOAD 옵션으로 지역 업로드를 건너뜁니다.')
	}

	const summary = {
		meta,
		pageChunks: pageChunks.length,
		regionChunks: regionMap.size,
		snapshotPrefix: TIMESTAMP,
	}
	await uploadMeta(summary)
	console.log('🎉 놀이시설 캐시 동기화 완료')

	return { meta, regionMap, pageChunks }
}

async function syncRegionsOnly() {
	console.log('♻️ 저장된 페이지 스냅샷을 활용하여 지역 파일만 갱신합니다.')
	const pageDirs = await listStorageEntries('pages')
	const snapshotFolders = pageDirs
		.map((entry) => (entry && typeof entry.name === 'string' ? entry.name.trim() : ''))
		.filter((name) => !!name)

	if (snapshotFolders.length === 0) {
		throw new Error('pages/ 디렉터리에 스냅샷이 존재하지 않습니다.')
	}

	let targetPrefix = (process.env.PLAYGROUND_SNAPSHOT_PREFIX || '').trim()
	if (!targetPrefix) {
		if (snapshotFolders.includes('latest')) {
			targetPrefix = 'latest'
		} else {
			targetPrefix = snapshotFolders.sort((a, b) => a.localeCompare(b)).pop() || ''
		}
	}

	if (!targetPrefix) {
		throw new Error('사용할 스냅샷을 결정할 수 없습니다.')
	}

	if (!snapshotFolders.includes(targetPrefix)) {
		console.warn(`   - 지정된 스냅샷 '${targetPrefix}'이 목록에 없지만 진행합니다.`)
	}

	console.log(`   - 사용 스냅샷 폴더: pages/${targetPrefix}`)
	const pageEntries = await listStorageEntries(`pages/${targetPrefix}`)
	const pageJsonFiles = pageEntries
		.map((entry) => entry.name)
		.filter((name) => /^page-\d{4}\.json$/.test(name))

	if (pageJsonFiles.length === 0) {
		throw new Error(`pages/${targetPrefix} 에 JSON 페이지 파일이 없습니다.`)
	}
	console.log(`   - 페이지 파일 수: ${pageJsonFiles.length}`)

	let masterMeta = null
	const regionMap = new Map()

	for (const fileName of pageJsonFiles) {
		const path = `pages/${targetPrefix}/${fileName}`
		const json = await downloadJson(path)
		if (!masterMeta) {
			masterMeta = json.meta || {}
		}
		const items = ensureArray(json.items)
		for (const item of items) {
			const code = String(item.rgnCd || '').trim()
			if (!code) continue
			if (!regionMap.has(code)) {
				regionMap.set(code, { name: item.rgnCdNm || null, items: [] })
			}
			regionMap.get(code).items.push(item)
		}
	}

	if (!masterMeta) {
		throw new Error('페이지 메타 정보를 찾을 수 없습니다.')
	}

	console.log(`   - 수집된 지역 수: ${regionMap.size}`)
	const regionEntries = Array.from(regionMap.entries())
	await uploadRegionSnapshots(masterMeta, regionEntries, {
		snapshotPrefix: targetPrefix,
		logInterval: 20,
	})

	const summary = {
		meta: {
			...masterMeta,
			snapshotPrefix: targetPrefix,
			regionsGenerated: regionEntries.length,
			regionsSyncedAt: new Date().toISOString(),
		},
		sourceSnapshot: targetPrefix,
		regionChunks: regionEntries.length,
		mode: 'regions-only',
	}

	await uploadJsonWithRetry(`meta/${TIMESTAMP}-regions.json`, summary, '86400')
	await uploadJsonWithRetry(`meta/latest-regions.json`, summary, '300')

	console.log('🎉 지역 파일 갱신 완료')
}

async function main() {
	console.log('▶️ 놀이시설 캐시 작업 시작')
	console.log(
		`   - mode: ${MODE || 'full'}, pageSize: ${PAGE_SIZE}, startPage: ${START_PAGE}, maxPages: ${
			MAX_PAGES || '전체'
		}, delay: ${DELAY_MS}ms`,
	)

	if (MODE === 'regions-only') {
		await syncRegionsOnly()
	} else {
		await runFullSync()
	}
}

main().catch((error) => {
	console.error('❌ 동기화 실패:', error)
	process.exit(1)
})

