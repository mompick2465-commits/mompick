// 놀이시설 칭찬(리뷰) API
import { supabase } from '../lib/supabase'

export interface PlaygroundReview {
	id: string
	playground_id: string
	user_id: string
	rating: number
	content: string | null
	helpful_count: number
	created_at: string
	updated_at: string | null
	is_deleted: boolean
	is_hidden?: boolean
	playground_name?: string | null
	images?: PlaygroundReviewImage[]
}

export interface PlaygroundReviewImage {
	id: string
	review_id: string
	image_url: string
	image_order: number
	created_at: string
}

export interface PlaygroundReviewStats {
	average_rating: number
	total_reviews: number
	rating_distribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
}

export interface CreatePlaygroundReviewData {
	playground_id: string
	playground_name?: string
	rating: number
	content?: string
	images?: File[]
}

/**
 * 리뷰 작성
 */
export async function createPlaygroundReview(
	data: CreatePlaygroundReviewData,
): Promise<PlaygroundReview> {
	// 로그인 사용자 확인
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser()
	if (userError || !user) {
		throw new Error('로그인이 필요합니다.')
	}

	// 리뷰 생성
	const { data: review, error: insertError } = await supabase
		.from('playground_reviews')
		.insert({
			playground_id: data.playground_id,
			playground_name: data.playground_name ?? null,
			user_id: user.id,
			rating: data.rating,
			content: data.content ?? null,
		})
		.select()
		.single()
	if (insertError || !review) {
		throw insertError || new Error('리뷰 생성 실패')
	}

	// 이미지 업로드 및 DB 저장
	if (data.images && data.images.length > 0) {
		const urls = await uploadPlaygroundReviewImages(review.id, data.images)
		const payload = urls.map((url, idx) => ({
			review_id: review.id,
			image_url: url,
			image_order: idx,
		}))
		const { error: imgError } = await supabase.from('playground_review_images').insert(payload)
		if (imgError) {
			console.warn('리뷰 이미지 저장 오류:', imgError)
		}
	}

	return review as PlaygroundReview
}

/**
 * 리뷰 이미지 업로드
 * 경로 규칙: playground-reviews/{reviewId}/{index_timestamp}.ext
 */
async function uploadPlaygroundReviewImages(reviewId: string, images: File[]): Promise<string[]> {
	const uploadPromises = images.map(async (image, index) => {
		const fileExt = image.name.split('.').pop()
		const fileName = `${reviewId}/${index}_${Date.now()}.${fileExt}`
		const filePath = `playground-reviews/${fileName}`

		const { error: uploadError } = await supabase.storage.from('playground-reviews').upload(filePath, image)
		if (uploadError) throw uploadError

		const { data } = supabase.storage.from('playground-reviews').getPublicUrl(filePath)
		return data.publicUrl
	})
	return Promise.all(uploadPromises)
}

export async function getPlaygroundReviews(
	playgroundId: string,
	page: number = 1,
	pageSize: number = 20,
): Promise<PlaygroundReview[]> {
	const from = (page - 1) * pageSize
	const to = from + pageSize - 1

	// 기본 리뷰 목록
	const { data: reviews, error } = await supabase
		.from('playground_reviews')
		.select('*')
		.eq('playground_id', playgroundId)
		.eq('is_deleted', false)
		.order('created_at', { ascending: false })
		.range(from, to)

	if (error) throw error
	if (!reviews || reviews.length === 0) return []

	const reviewIds = reviews.map((r) => r.id)
	const userIds = Array.from(new Set(reviews.map((r) => r.user_id).filter(Boolean)))

	// 각 리뷰 이미지
	const { data: images, error: imgError } = await supabase
		.from('playground_review_images')
		.select('*')
		.in('review_id', reviewIds)
		.order('image_order', { ascending: true })

	if (imgError) throw imgError

	// 프로필(작성자/자녀 이미지) 가져오기: reviews.user_id는 auth_user_id
	let profilesByAuthId = new Map<
		string,
		{ full_name?: string | null; nickname?: string | null; profile_image_url?: string | null; children_info?: any }
	>()
	if (userIds.length > 0) {
		try {
			const { data: profiles } = await supabase
				.from('profiles')
				.select('auth_user_id, full_name, nickname, profile_image_url, children_info')
				.in('auth_user_id', userIds)
			for (const p of profiles || []) {
				profilesByAuthId.set(p.auth_user_id, {
					full_name: p.full_name,
					nickname: p.nickname,
					profile_image_url: p.profile_image_url,
					children_info: p.children_info,
				})
			}
		} catch {}
	}

	const imagesByReviewId = new Map<string, PlaygroundReviewImage[]>()
	for (const img of images || []) {
		if (!imagesByReviewId.has(img.review_id)) imagesByReviewId.set(img.review_id, [])
		imagesByReviewId.get(img.review_id)!.push(img)
	}

	// user_profile 병합하여 반환
	return reviews.map((r) => {
		const profile = profilesByAuthId.get(r.user_id) || null
		return {
			...r,
			images: imagesByReviewId.get(r.id) || [],
			user_profile: profile,
		} as any
	}) as any
}

export async function getPlaygroundReviewStats(playgroundId: string): Promise<PlaygroundReviewStats> {
	const { data, error } = await supabase
		.from('playground_reviews')
		.select('rating')
		.eq('playground_id', playgroundId)
		.eq('is_deleted', false)

	if (error) throw error

	const dist: PlaygroundReviewStats['rating_distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
	let sum = 0
	for (const row of data || []) {
		const r = Number(row.rating) as 1 | 2 | 3 | 4 | 5
		if (r >= 1 && r <= 5) {
			dist[r] += 1
			sum += r
		}
	}
	const total = (data || []).length
	const avg = total > 0 ? sum / total : 0
	return {
		average_rating: avg,
		total_reviews: total,
		rating_distribution: dist,
	}
}

export async function listUserHelpfulReviewIds(userId: string, playgroundId: string): Promise<Set<string>> {
	if (!userId) return new Set()
	// playgroundId로 먼저 해당 리뷰 id들을 조회
	const { data: reviews, error: rErr } = await supabase
		.from('playground_reviews')
		.select('id')
		.eq('playground_id', playgroundId)
		.eq('is_deleted', false)
	if (rErr) throw rErr
	const reviewIds = (reviews || []).map((r) => r.id)
	if (reviewIds.length === 0) return new Set()

	const { data, error } = await supabase
		.from('playground_review_helpful')
		.select('review_id')
		.eq('user_id', userId)
		.in('review_id', reviewIds)
	if (error) throw error
	return new Set((data || []).map((d) => d.review_id))
}

export async function togglePlaygroundReviewHelpful(
	reviewId: string,
	userId: string,
): Promise<{ isHelpful: boolean; helpfulCount: number }> {
	// 현재 상태 조회
	const { data: existsRow } = await supabase
		.from('playground_review_helpful')
		.select('id')
		.eq('review_id', reviewId)
		.eq('user_id', userId)
		.maybeSingle()

	if (existsRow) {
		// 취소
		await supabase.from('playground_review_helpful').delete().eq('id', existsRow.id)
	} else {
		// 추가
		await supabase.from('playground_review_helpful').insert({ review_id: reviewId, user_id: userId })
	}

	// 최신 카운트 계산
	const { count } = await supabase
		.from('playground_review_helpful')
		.select('id', { count: 'exact', head: true })
		.eq('review_id', reviewId)

	const helpfulCount = count || 0
	// 리뷰 테이블의 helpful_count 동기화
	await supabase
		.from('playground_reviews')
		.update({ helpful_count: helpfulCount })
		.eq('id', reviewId)

	return { isHelpful: !existsRow, helpfulCount }
}

/**
 * 놀이시설 리뷰 도움됨 토글 (알림 기능 포함)
 */
export async function togglePlaygroundReviewHelpfulWithNotification(
	reviewId: string,
	playgroundName: string,
): Promise<{ isHelpful: boolean; helpfulCount: number }> {
	try {
		const { data: { user }, error: userError } = await supabase.auth.getUser()
		if (userError || !user) {
			throw new Error('로그인이 필요합니다.')
		}

		// 먼저 리뷰 작성자 정보를 가져오기
		const { data: reviewData, error: reviewError } = await supabase
			.from('playground_reviews')
			.select('user_id, helpful_count')
			.eq('id', reviewId)
			.single()

		if (reviewError) {
			throw reviewError
		}

		// 현재 사용자의 profile ID 가져오기
		const { data: profileData, error: profileError } = await supabase
			.from('profiles')
			.select('id')
			.eq('auth_user_id', user.id)
			.single()

		if (profileError || !profileData) {
			throw new Error('프로필 정보를 찾을 수 없습니다.')
		}

		const profileId = profileData.id

		// 기존 도움됨 확인 (profile ID 사용)
		const { data: existingHelpful, error: checkError } = await supabase
			.from('playground_review_helpful')
			.select('id')
			.eq('review_id', reviewId)
			.eq('user_id', profileId)
			.maybeSingle()

		let isHelpful = false
		const wasHelpful = !!existingHelpful

		if (checkError && checkError.code !== 'PGRST116') {
			throw checkError
		}

		if (existingHelpful) {
			// 도움됨 제거
			const { error: deleteError } = await supabase
				.from('playground_review_helpful')
				.delete()
				.eq('review_id', reviewId)
				.eq('user_id', profileId)

			if (deleteError) {
				throw deleteError
			}
			isHelpful = false
		} else {
			// 도움됨 추가
			const { error: insertError } = await supabase
				.from('playground_review_helpful')
				.insert({
					review_id: reviewId,
					user_id: profileId,
				})

			if (insertError) {
				throw insertError
			}
			isHelpful = true
		}

		// 도움됨 카운트 조회
		const { count: helpfulCount, error: countError } = await supabase
			.from('playground_review_helpful')
			.select('*', { count: 'exact', head: true })
			.eq('review_id', reviewId)

		if (countError) {
			console.error('도움됨 카운트 조회 오류:', countError)
			return { isHelpful, helpfulCount: helpfulCount || 0 }
		}

		// 리뷰 테이블의 helpful_count 동기화
		await supabase
			.from('playground_reviews')
			.update({ helpful_count: helpfulCount || 0 })
			.eq('id', reviewId)

		// 알림 처리 (동적 import로 알림 함수 가져오기)
		if (isHelpful && !wasHelpful) {
			// 좋아요를 새로 눌렀을 때만 알림 생성
			try {
				const { createReviewLikeNotification } = await import('./notifications')

				// 현재 사용자 프로필 정보 가져오기
				const { data: currentProfileData, error: currentProfileError } = await supabase
					.from('profiles')
					.select('full_name, nickname, profile_image_url')
					.eq('auth_user_id', user.id)
					.single()

				if (!currentProfileError && currentProfileData) {
					// 리뷰 작성자의 profile ID 가져오기
					const { data: reviewAuthorProfile, error: reviewAuthorError } = await supabase
						.from('profiles')
						.select('id')
						.eq('auth_user_id', reviewData.user_id)
						.single()

					if (!reviewAuthorError && reviewAuthorProfile) {
						// 리뷰 작성자에게 알림 생성 (자기 자신이 아닌 경우에만)
						if (profileId !== reviewAuthorProfile.id) {
							await createReviewLikeNotification(
								reviewId,
								playgroundName,
								profileId, // fromUserId는 현재 사용자의 profile ID
								currentProfileData.nickname || currentProfileData.full_name,
								currentProfileData.profile_image_url || '',
								reviewAuthorProfile.id, // toUserId는 리뷰 작성자의 profile ID
							)
						}
					}
				}
			} catch (notificationError) {
				console.error('놀이시설 리뷰 좋아요 알림 생성 오류:', notificationError)
				// 알림 생성 실패해도 좋아요 기능은 정상 작동
			}
		}

		return { isHelpful, helpfulCount: helpfulCount || 0 }
	} catch (error) {
		console.error('놀이시설 리뷰 도움됨 토글 오류:', error)
		throw error
	}
}

/**
 * 놀이시설 리뷰 삭제 (관리자 승인 후 삭제)
 */
export async function deletePlaygroundReview(reviewId: string): Promise<void> {
	try {
		const { data: { user }, error: userError } = await supabase.auth.getUser()
		if (userError || !user) {
			throw new Error('로그인이 필요합니다.')
		}

		const { error } = await supabase
			.from('playground_reviews')
			.update({ is_deleted: true })
			.eq('id', reviewId)
			.eq('user_id', user.id)

		if (error) {
			console.error('놀이시설 리뷰 삭제 오류:', error)
			throw error
		}
	} catch (error) {
		console.error('놀이시설 리뷰 삭제 실패:', error)
		throw error
	}
}

/**
 * 놀이시설 리뷰 삭제요청 생성
 */
export async function requestPlaygroundReviewDeletion(reviewId: string, requestReason?: string): Promise<void> {
	try {
		const { data: { user }, error: userError } = await supabase.auth.getUser()
		if (userError || !user) {
			throw new Error('로그인이 필요합니다.')
		}

		// 현재 사용자의 profile ID 가져오기
		const { data: profileData, error: profileError } = await supabase
			.from('profiles')
			.select('id')
			.eq('auth_user_id', user.id)
			.single()

		if (profileError || !profileData) {
			throw new Error('프로필 정보를 찾을 수 없습니다.')
		}

		// 리뷰가 존재하고 본인 리뷰인지 확인
		const { data: reviewData, error: reviewError } = await supabase
			.from('playground_reviews')
			.select('id, user_id')
			.eq('id', reviewId)
			.eq('user_id', user.id)
			.single()

		if (reviewError || !reviewData) {
			throw new Error('리뷰를 찾을 수 없거나 삭제 권한이 없습니다.')
		}

		// 중복 요청 확인
		const { data: existingRequest } = await supabase
			.from('review_delete_requests')
			.select('id')
			.eq('review_id', reviewId)
			.eq('review_type', 'playground')
			.eq('requester_id', profileData.id)
			.eq('status', 'pending')
			.maybeSingle()

		if (existingRequest) {
			throw new Error('이미 삭제요청이 접수되었습니다.')
		}

		// 삭제요청 생성
		const { error: insertError } = await supabase
			.from('review_delete_requests')
			.insert({
				review_id: reviewId,
				review_type: 'playground',
				requester_id: profileData.id,
				status: 'pending',
				request_reason: requestReason?.trim() || null,
			})

		if (insertError) {
			console.error('삭제요청 생성 오류:', insertError)
			throw insertError
		}
	} catch (error) {
		console.error('삭제요청 생성 실패:', error)
		throw error
	}
}

/**
 * 여러 놀이시설의 평점 조회 (지도 페이지용)
 */
export async function getMultiplePlaygroundRatings(playgroundIds: string[]): Promise<Record<string, number>> {
	try {
		if (!playgroundIds || playgroundIds.length === 0) return {}

		const { data, error } = await supabase
			.from('playground_reviews')
			.select('playground_id, rating')
			.in('playground_id', playgroundIds)
			.eq('is_deleted', false)

		if (error) {
			console.error('놀이시설 평점 조회 오류:', error)
			return {}
		}

		// 놀이시설별 평점 계산
		const ratings: Record<string, { total: number; count: number }> = {}

		data?.forEach((review: any) => {
			if (!ratings[review.playground_id]) {
				ratings[review.playground_id] = { total: 0, count: 0 }
			}
			ratings[review.playground_id].total += review.rating
			ratings[review.playground_id].count += 1
		})

		// 평균 계산
		const result: Record<string, number> = {}
		Object.keys(ratings).forEach(id => {
			const { total, count } = ratings[id]
			result[id] = Number((total / count).toFixed(1))
		})

		return result
	} catch (error) {
		console.error('놀이시설 평점 조회 실패:', error)
		return {}
	}
}


