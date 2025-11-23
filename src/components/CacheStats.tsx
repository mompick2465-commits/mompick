// 캐시 통계 표시 컴포넌트
import React, { useState, useEffect } from 'react'
import { 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { SmartKindergartenLoader } from '../utils/smartKindergartenLoader'

interface CacheStatsProps {
  className?: string
}

const CacheStats: React.FC<CacheStatsProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<{
    totalRegions: number
    validCaches: number
    expiredCaches: number
    totalFiles: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const smartLoader = new SmartKindergartenLoader()

  const loadStats = async () => {
    setLoading(true)
    try {
      const cacheStats = await smartLoader.getCacheStats()
      setStats(cacheStats)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('캐시 통계 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const getCacheHealthPercentage = () => {
    if (!stats || stats.totalRegions === 0) return 0
    return Math.round((stats.validCaches / stats.totalRegions) * 100)
  }

  const getHealthColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500'
    if (percentage >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getHealthIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (percentage >= 60) return <AlertCircle className="w-4 h-4 text-yellow-500" />
    return <AlertCircle className="w-4 h-4 text-red-500" />
  }

  if (!stats) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-center space-x-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">캐시 통계 로딩 중...</span>
        </div>
      </div>
    )
  }

  const healthPercentage = getCacheHealthPercentage()

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">캐시 상태</h3>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 전체 상태 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">전체 상태</span>
          <div className="flex items-center space-x-1">
            {getHealthIcon(healthPercentage)}
            <span className={`text-sm font-semibold ${getHealthColor(healthPercentage)}`}>
              {healthPercentage}%
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              healthPercentage >= 80 ? 'bg-green-500' : 
              healthPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${healthPercentage}%` }}
          />
        </div>
      </div>

      {/* 상세 통계 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.totalRegions}</div>
          <div className="text-xs text-gray-500">총 지역</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.validCaches}</div>
          <div className="text-xs text-gray-500">유효 캐시</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.expiredCaches}</div>
          <div className="text-xs text-gray-500">만료 캐시</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalFiles}</div>
          <div className="text-xs text-gray-500">총 파일</div>
        </div>
      </div>

      {/* 마지막 업데이트 */}
      {lastUpdated && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>마지막 업데이트: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      )}

      {/* 성능 지표 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">캐시 히트율</span>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-green-600">
              {healthPercentage >= 80 ? '우수' : healthPercentage >= 60 ? '양호' : '개선 필요'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CacheStats
