'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Filter, MapPin, Phone, Clock, Star, Edit, Trash2, Plus, Calendar } from 'lucide-react'

interface PediatricClinic {
  id: string
  name: string
  address: string
  phone: string
  doctor: string
  specialty: string[]
  operatingHours: {
    weekdays: string
    weekends: string
    lunchBreak: string
  }
  rating: number
  reviewCount: number
  isActive: boolean
  type: 'hospital' | 'clinic' | 'specialist'
  insuranceAccepted: boolean
  emergencyService: boolean
  createdAt: string
  updatedAt: string
}

export default function PediatricPage() {
  const [clinics, setClinics] = useState<PediatricClinic[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterType, setFilterType] = useState<'all' | 'hospital' | 'clinic' | 'specialist'>('all')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchClinics()
  }, [])

  const fetchClinics = async () => {
    try {
      setLoading(true)
      // TODO: 실제 API 연동
      setClinics([])
    } catch (error) {
      console.error('소아과 목록 조회 오류:', error)
      setClinics([])
    } finally {
      setLoading(false)
    }
  }

  const filteredClinics = clinics.filter(clinic => {
    const matchesSearch = clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clinic.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clinic.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clinic.specialty.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatusFilter = filterStatus === 'all' || 
                               (filterStatus === 'active' && clinic.isActive) ||
                               (filterStatus === 'inactive' && !clinic.isActive)
    const matchesTypeFilter = filterType === 'all' || clinic.type === filterType
    return matchesSearch && matchesStatusFilter && matchesTypeFilter
  })

  const handleToggleStatus = async (id: string) => {
    try {
      setClinics(clinics.map(clinic => 
        clinic.id === id ? { ...clinic, isActive: !clinic.isActive } : clinic
      ))
    } catch (error) {
      console.error('소아과 상태 업데이트 오류:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('정말로 이 소아과를 삭제하시겠습니까?')) {
      try {
        setClinics(clinics.filter(clinic => clinic.id !== id))
      } catch (error) {
        console.error('소아과 삭제 오류:', error)
      }
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'hospital':
        return '병원'
      case 'clinic':
        return '의원'
      case 'specialist':
        return '전문의원'
      default:
        return '알 수 없음'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'hospital':
        return 'bg-blue-100 text-blue-800'
      case 'clinic':
        return 'bg-green-100 text-green-800'
      case 'specialist':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">소아과 관리</h1>
          <p className="text-sm text-gray-600">등록된 소아과 정보를 관리하세요</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="text-sm">
          <Plus className="h-4 w-4 mr-1" />
          소아과 추가
        </Button>
      </div>

      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">소아과 목록</CardTitle>
          <div className="flex items-center space-x-3 mt-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="소아과명, 주소, 의사명, 전문과목으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">전체 상태</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'hospital' | 'clinic' | 'specialist')}
                className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">전체 유형</option>
                <option value="hospital">병원</option>
                <option value="clinic">의원</option>
                <option value="specialist">전문의원</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClinics.map((clinic) => (
              <div key={clinic.id} className="rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{clinic.name}</h3>
                    <div className="flex items-center space-x-1.5 text-xs text-gray-500 mb-1.5">
                        <MapPin className="h-3 w-3" />
                        <span>{clinic.address}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getTypeColor(clinic.type)}`}>
                          {getTypeLabel(clinic.type)}
                        </span>
                        {clinic.emergencyService && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            응급실
                          </span>
                        )}
                        {clinic.insuranceAccepted && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            건강보험
                          </span>
                        )}
                      </div>
                    </div>
                  <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                    clinic.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {clinic.isActive ? '활성' : '비활성'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span>{clinic.phone}</span>
                  </div>
                  
                  <div className="text-xs">
                    <span className="font-medium">담당의:</span> {clinic.doctor}
                  </div>
                  
                  <div className="text-xs">
                    <span className="font-medium">전문과목:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {clinic.specialty.map((spec, index) => (
                        <span key={index} className="inline-flex px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 text-xs">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span>평일: {clinic.operatingHours.weekdays}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span>{clinic.rating}</span>
                      <span className="text-gray-500 text-[10px]">({clinic.reviewCount})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 pt-2 mt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => console.log('진료시간:', clinic.id)}
                      className="text-xs px-2 py-1"
                    >
                      <Calendar className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => console.log('수정:', clinic.id)}
                      className="text-xs px-2 py-1"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(clinic.id)}
                      className="text-[11px] px-2 py-1"
                    >
                      {clinic.isActive ? '비활성화' : '활성화'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(clinic.id)}
                      className="text-xs px-2 py-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredClinics.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 소아과 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">새 소아과 추가</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  소아과명
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="소아과명을 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  유형
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">유형을 선택하세요</option>
                  <option value="hospital">병원</option>
                  <option value="clinic">의원</option>
                  <option value="specialist">전문의원</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주소
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="주소를 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  전화번호
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="전화번호를 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당의
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="담당의를 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  전문과목
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="전문과목을 쉼표로 구분하여 입력하세요"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    평일 진료시간
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="09:00 - 18:00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주말 진료시간
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="09:00 - 13:00"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm text-gray-700">건강보험 적용</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm text-gray-700">응급실 운영</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                취소
              </Button>
              <Button onClick={() => setShowAddModal(false)}>
                추가
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
