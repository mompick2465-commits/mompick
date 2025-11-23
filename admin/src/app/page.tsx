'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Flag, GraduationCap, Baby } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface DashboardStats {
  totalUsers: number
  parentUsers: number
  teacherUsers: number
  totalReports: number
  pendingReports: number
  resolvedReports: number
  recentReports?: {
    inappropriate: number
    spam: number
    harassment: number
    other: number
  }
  userActivity?: {
    newUsers: number
    activeUsers: number
    newPosts: number
    newReviews: number
    totalPosts: number
    totalReviews: number
  }
  dailyReports?: Array<{
    date: string
    day: string
    count: number
  }>
  dailyReportTypes?: Array<{
    date: string
    부적절한게시글: number
    스팸: number
    괴롭힘: number
    기타: number
  }>
  dailyUsers?: Array<{
    date: string
    '전체가입자[누적]': number
    활성사용자: number
  }>
  dailyContent?: Array<{
    date: string
    '게시글 작성[누적]': number
    '칭찬 작성[누적]': number
  }>
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    parentUsers: 0,
    teacherUsers: 0,
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    recentReports: {
      inappropriate: 0,
      spam: 0,
      harassment: 0,
      other: 0
    },
    userActivity: {
      newUsers: 0,
      activeUsers: 0,
      newPosts: 0,
      newReviews: 0,
      totalPosts: 0,
      totalReviews: 0
    },
      dailyReports: [],
      dailyReportTypes: [],
      dailyUsers: [],
      dailyContent: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch('/api/dashboard')
        if (response.ok) {
          const data = await response.json()
          console.log('대시보드 데이터:', data.stats)
          console.log('일별 사용자 데이터:', data.stats.dailyUsers)
          setStats(data.stats)
        } else {
          console.error('대시보드 데이터 가져오기 실패:', response.statusText)
        }
      } catch (error) {
        console.error('대시보드 API 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
  }, [])

  const statCards = [
    {
      title: '총 사용자',
      value: loading ? '...' : stats.totalUsers.toString(),
      description: '전체 등록 사용자 수',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: '학부모',
      value: loading ? '...' : stats.parentUsers.toString(),
      description: '등록된 학부모 수',
      icon: Baby,
      color: 'text-purple-600'
    },
    {
      title: '교사',
      value: loading ? '...' : stats.teacherUsers.toString(),
      description: '등록된 교사 수',
      icon: GraduationCap,
      color: 'text-green-600'
    }
  ]



  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-600">MomPick 서비스 현황을 한눈에 확인하세요</p>
      </div>

      {/* 사용자 통계 및 활동 섹션 */}
      <Card className="mb-6 border-0 bg-white shadow-none">
        <CardHeader className="pb-2">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-center">
            {/* 왼쪽: 제목 영역 및 총 사용자 카드 */}
            <div className="lg:col-span-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 mb-1">
                <Users className="h-5 w-5 text-blue-600" />
                사용자 통계 및 활동
              </CardTitle>
              <CardDescription className="mb-3">
                전체 사용자 현황 및 최근 7일간 활동 통계
              </CardDescription>
              {/* 총 사용자 카드 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600">총 사용자</p>
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex items-center gap-4">
                  {/* 도넛 차트 */}
                  <div className="flex-shrink-0">
                    {loading ? (
                      <div className="w-24 h-24 flex items-center justify-center text-gray-400 text-xs">...</div>
                    ) : (
                      <ResponsiveContainer width={100} height={100}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: '학부모', value: stats.parentUsers || 0 },
                              { name: '교사', value: stats.teacherUsers || 0 }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={45}
                            paddingAngle={2}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                          >
                            <Cell key="학부모" fill="#a855f7" />
                            <Cell key="교사" fill="#10b981" />
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '11px'
                            }}
                            formatter={(value: number) => `${value}명`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  {/* 사용자 수 정보 */}
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-blue-700">
                      {loading ? '...' : stats.totalUsers}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">전체 등록 사용자 수</p>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <p className="text-[10px] text-gray-600">학부모</p>
                        </div>
                        <p className="text-sm font-semibold text-purple-600">
                          {loading ? '...' : `${stats.parentUsers || 0}명`}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <p className="text-[10px] text-gray-600">교사</p>
                        </div>
                        <p className="text-sm font-semibold text-green-600">
                          {loading ? '...' : `${stats.teacherUsers || 0}명`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* 오른쪽: 사용자 통계 라인 차트 */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              <h3 className="text-xs font-medium text-gray-700 mb-1">전체가입자/활성 사용자 통계</h3>
              {loading ? (
                <div className="h-40 flex items-center justify-center text-gray-400 text-xs">로딩 중...</div>
              ) : stats.dailyUsers && stats.dailyUsers.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={stats.dailyUsers} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={10}
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      fontSize={10}
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '11px'
                      }}
                      labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }}
                      iconType="line"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="전체가입자[누적]" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 5 }}
                      name="전체가입자[누적]"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="활성사용자" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 5 }}
                      name="활성사용자"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-400 border border-gray-200 rounded-lg text-xs">
                  사용자 데이터가 없습니다
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 콘텐츠 작성 섹션 */}
      <Card className="mb-6 border-0 bg-white shadow-none">
        <CardHeader className="pb-2">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-center">
            {/* 왼쪽: 제목 영역 및 콘텐츠 작성 카드 */}
            <div className="lg:col-span-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 mb-1">
                <Users className="h-5 w-5 text-indigo-600" />
                콘텐츠 작성
              </CardTitle>
              <CardDescription className="mb-3">
                최근 7일간 게시글 작성 및 칭찬 작성 누적 통계
              </CardDescription>
              {/* 콘텐츠 작성 카드 */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600">콘텐츠 작성</p>
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex items-center gap-4">
                  {/* 도넛 차트 */}
                  <div className="flex-shrink-0">
                    {loading ? (
                      <div className="w-24 h-24 flex items-center justify-center text-gray-400 text-xs">...</div>
                    ) : (
                      <ResponsiveContainer width={100} height={100}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: '게시글', value: stats.userActivity?.totalPosts || 0 },
                              { name: '칭찬', value: stats.userActivity?.totalReviews || 0 }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={45}
                            paddingAngle={2}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                          >
                            <Cell key="게시글" fill="#6366f1" />
                            <Cell key="칭찬" fill="#8b5cf6" />
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '11px'
                            }}
                            formatter={(value: number) => `${value}개`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  {/* 콘텐츠 수 정보 */}
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-indigo-700">
                      {loading ? '...' : (stats.userActivity?.totalPosts || 0) + (stats.userActivity?.totalReviews || 0)}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">콘텐츠 작성 전체 개수</p>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          <p className="text-[10px] text-gray-600">게시글</p>
                        </div>
                        <p className="text-sm font-semibold text-indigo-600">
                          {loading ? '...' : `${stats.userActivity?.totalPosts || 0}개`}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <p className="text-[10px] text-gray-600">칭찬</p>
                        </div>
                        <p className="text-sm font-semibold text-purple-600">
                          {loading ? '...' : `${stats.userActivity?.totalReviews || 0}개`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* 오른쪽: 게시글 작성/칭찬 작성 누적 점 그래프 */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              <h3 className="text-xs font-medium text-gray-700 mb-1">게시글 작성/칭찬 작성 [누적]</h3>
              {loading ? (
                <div className="h-40 flex items-center justify-center text-gray-400 text-xs">로딩 중...</div>
              ) : stats.dailyContent && stats.dailyContent.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={stats.dailyContent} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={10}
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      fontSize={10}
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '11px'
                      }}
                      labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }}
                      iconType="line"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="게시글 작성[누적]" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                      name="게시글 작성[누적]"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="칭찬 작성[누적]" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                      name="칭찬 작성[누적]"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-400 border border-gray-200 rounded-lg text-xs">
                  콘텐츠 데이터가 없습니다
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 신고 통계 통합 섹션 */}
      <Card className="mb-6 border-0 bg-white shadow-none">
        <CardHeader className="pb-2">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-center">
            {/* 왼쪽: 제목 영역 및 신고 카드들 */}
            <div className="lg:col-span-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 mb-1">
                <Flag className="h-5 w-5 text-orange-600" />
                신고 통계
              </CardTitle>
              <CardDescription className="mb-3">
                전체 신고 현황 및 최근 7일간 신고 통계
              </CardDescription>
              <div className="flex flex-col gap-3">
              {/* 신고 통계 카드 */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-600">신고 통계</p>
                  <Flag className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-700">
                  {loading ? '...' : stats.totalReports}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">전체 신고 건수</p>
                <div className="mt-2 pt-2 border-t border-orange-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-gray-600">대기 신고</p>
                    <p className="text-sm font-semibold text-red-600">
                      {loading ? '...' : `${stats.pendingReports}건`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-600">처리 완료</p>
                    <p className="text-sm font-semibold text-green-600">
                      {loading ? '...' : `${stats.resolvedReports}건`}
                    </p>
                  </div>
                </div>
              </div>

              {/* 최근 신고 상세 통합 카드 */}
              {!loading && stats.recentReports && (
                (stats.recentReports.inappropriate > 0 || 
                 stats.recentReports.spam > 0 || 
                 stats.recentReports.harassment > 0 || 
                 stats.recentReports.other > 0) && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium text-gray-600">최근 신고 상세</p>
                    <Flag className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex items-center gap-3">
                    {/* 도넛 차트 */}
                    <div className="flex-shrink-0">
                      {loading ? (
                        <div className="w-24 h-24 flex items-center justify-center text-gray-400 text-xs">...</div>
                      ) : (
                        <ResponsiveContainer width={100} height={100}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: '부적절한 게시글', value: stats.recentReports.inappropriate || 0 },
                                { name: '스팸', value: stats.recentReports.spam || 0 },
                                { name: '괴롭힘', value: stats.recentReports.harassment || 0 },
                                { name: '기타', value: stats.recentReports.other || 0 }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={45}
                              paddingAngle={2}
                              dataKey="value"
                              startAngle={90}
                              endAngle={-270}
                            >
                              <Cell key="부적절한 게시글" fill="#f59e0b" />
                              <Cell key="스팸" fill="#ef4444" />
                              <Cell key="괴롭힘" fill="#f43f5e" />
                              <Cell key="기타" fill="#6b7280" />
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '11px'
                              }}
                              formatter={(value: number) => `${value}건`}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    {/* 신고 수 정보 */}
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-purple-700">
                        {loading ? '...' : (stats.recentReports.inappropriate + stats.recentReports.spam + stats.recentReports.harassment + stats.recentReports.other)}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">최근 7일간 신고 건수</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <p className="text-[10px] text-gray-600">부적절한 게시글</p>
                          </div>
                          <p className="text-sm font-semibold text-amber-600">
                            {stats.recentReports.inappropriate}건
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <p className="text-[10px] text-gray-600">스팸</p>
                          </div>
                          <p className="text-sm font-semibold text-red-600">
                            {stats.recentReports.spam}건
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            <p className="text-[10px] text-gray-600">괴롭힘</p>
                          </div>
                          <p className="text-sm font-semibold text-rose-600">
                            {stats.recentReports.harassment}건
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                            <p className="text-[10px] text-gray-600">기타</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-600">
                            {stats.recentReports.other}건
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
            {/* 오른쪽: 신고 개수 변화 라인 차트 (누적) */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              <h3 className="text-xs font-medium text-gray-700 mb-1">신고 개수 변화 (누적)</h3>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-400 text-xs">로딩 중...</div>
              ) : stats.dailyReports && stats.dailyReports.length > 0 ? (
                <ResponsiveContainer width="100%" height={256}>
                  <LineChart data={stats.dailyReports} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={10}
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      fontSize={10}
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '11px'
                      }}
                      labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', r: 4, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 border border-gray-200 rounded-lg text-xs">
                  신고 데이터가 없습니다
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}