import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const TermsView = () => {
  const navigate = useNavigate()
  const { type } = useParams<{ type: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [term, setTerm] = useState<{
    title: string
    content: string
  } | null>(null)

  // 약관 타입별 제목 매핑 (기본값)
  const termsTitles: Record<string, string> = {
    service: '맘픽 서비스 이용약관',
    privacy: '개인정보처리방침',
    data: '데이터 활용 동의',
    marketing: '마케팅 정보 수신 및 활용 동의'
  }

  useEffect(() => {
    const fetchTerm = async () => {
      if (!type) {
        setError('잘못된 약관 페이지입니다.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        // 활성화된 약관 조회
        const { data, error: fetchError } = await supabase
          .from('terms')
          .select('title, content')
          .eq('category', type)
          .eq('is_active', true)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError) {
          console.error('약관 조회 오류:', fetchError)
          setError('약관 내용을 불러오는 중 오류가 발생했습니다.')
          return
        }

        if (!data) {
          setError('약관 내용을 찾을 수 없습니다.')
          return
        }

        setTerm(data)
      } catch (err: any) {
        console.error('약관 로드 오류:', err)
        setError('약관 내용을 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchTerm()
  }, [type])

  const handleBack = () => {
    navigate(-1) // 이전 페이지로 돌아가기
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              {type ? termsTitles[type] || '약관' : '약관'}
            </h1>
            <div className="w-10"></div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 h-full">
            <Loader2 className="w-8 h-8 text-[#fb8678] animate-spin mb-4" />
            <p className="text-gray-600">약관 내용을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 h-full">
            <p className="text-red-600 text-center mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#fb8678] text-white rounded-lg hover:bg-[#e67567] transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : term ? (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{term.title}</h2>
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: term.content }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 h-full">
            <p className="text-gray-600 text-center">약관 내용을 찾을 수 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TermsView

