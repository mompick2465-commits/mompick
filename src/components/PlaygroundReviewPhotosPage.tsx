import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { getPlaygroundReviews } from '../utils/playgroundReviewApi'

const PlaygroundReviewPhotosPage: React.FC = () => {
	const { playgroundId } = useParams<{ playgroundId: string }>()
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	const [loading, setLoading] = useState<boolean>(true)
	const [error, setError] = useState<string | null>(null)
	const [reviews, setReviews] = useState<any[]>([])

	const normalizedId = useMemo(() => {
		if (!playgroundId) return ''
		try {
			return decodeURIComponent(playgroundId)
		} catch {
			return playgroundId
		}
	}, [playgroundId])

	const facilityName = useMemo(() => searchParams.get('name') || '칭찬 사진', [searchParams])

	useEffect(() => {
		let cancelled = false
		const run = async () => {
			if (!normalizedId) {
				setError('대상 놀이시설을 찾을 수 없습니다.')
				setLoading(false)
				return
			}
			setLoading(true)
			setError(null)
			try {
				const list = await getPlaygroundReviews(normalizedId, 1, 200)
				if (!cancelled) setReviews(list)
			} catch (e) {
				if (!cancelled) setError('칭찬 사진을 불러오지 못했습니다.')
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		run()
		return () => {
			cancelled = true
		}
	}, [normalizedId])

	const photos = useMemo(() => {
		const items: Array<{ id: string; url: string; rating: number }> = []
		for (const r of reviews) {
			const imgs = (r?.images || []) as Array<{ id: string; image_url: string }>
			for (const img of imgs) {
				items.push({ id: img.id, url: img.image_url, rating: Number((r as any)?.rating || 0) })
			}
		}
		return items
	}, [reviews])

	const handleBack = () => {
		const params = new URLSearchParams()
		const name = searchParams.get('name')
		const sidoCode = searchParams.get('sidoCode')
		const sggCode = searchParams.get('sggCode')
		if (name) params.set('name', name)
		if (sidoCode) params.set('sidoCode', sidoCode)
		if (sggCode) params.set('sggCode', sggCode)
		navigate(`/playground/${encodeURIComponent(normalizedId)}?${params.toString()}`, { state: { activeTab: 'praise' } })
	}

	return (
		<div className="min-h-screen bg-white">
			<div className="sticky top-0 z-10 bg-white border-b border-gray-100">
				<div className="flex items-center justify-between px-4 py-3">
					<button onClick={handleBack} className="p-2 rounded-lg hover:bg-gray-100">
						<ChevronLeft className="w-5 h-5 text-gray-700" />
					</button>
					<h1 className="text-base font-semibold text-gray-900">{facilityName}</h1>
					<div className="w-9" />
				</div>
			</div>
			{loading ? (
				<div className="flex items-center justify-center py-16 text-gray-600">불러오는 중...</div>
			) : error ? (
				<div className="px-4 py-8 text-center text-red-600">{error}</div>
			) : photos.length === 0 ? (
				<div className="px-4 py-12 text-center text-gray-600">등록된 사진이 없습니다</div>
			) : (
				<div className="px-4 py-4 grid grid-cols-3 gap-3">
					{photos.map((p) => (
						<div key={p.id} className="relative rounded-lg overflow-hidden bg-gray-100">
							<div className="w-full" style={{ paddingTop: '100%' }} />
							<img src={p.url} alt="칭찬 사진" className="absolute inset-0 w-full h-full object-cover" />
							<div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 py-0.5 rounded">
								{`${Math.max(0, Math.min(5, Math.round(p.rating)))}점`}
							</div>
						</div>
					))}
				</div>
			)}
			<div className="h-4" />
		</div>
	)
}

export default PlaygroundReviewPhotosPage








