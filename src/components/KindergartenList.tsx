import React, { useState, useEffect } from 'react'
import { MapPin, Phone, Clock, Users, Star, ChevronRight, Search, Filter } from 'lucide-react'
import { fetchKindergartenData, findRegionCodes, KindergartenInfo } from '../utils/kindergartenApi'

interface KindergartenListProps {
  onClose: () => void
}

const KindergartenList: React.FC<KindergartenListProps> = ({ onClose }) => {
  const [kindergartens, setKindergartens] = useState<KindergartenInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchRegion, setSearchRegion] = useState({ sido: '서울특별시', sgg: '강남구' })
  const [searchTerm, setSearchTerm] = useState('')

  // 지역 옵션
  const regionOptions = {
    '서울특별시': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    '경기도': ['수원시', '성남시', '의정부시', '안양시', '부천시', '광명시', '평택시', '과천시', '오산시', '시흥시', '군포시', '의왕시', '하남시', '용인시', '파주시', '이천시', '안성시', '김포시', '화성시', '광주시', '여주시', '양평군', '고양시', '동두천시', '가평군', '연천군'],
    '인천광역시': ['계양구', '남구', '남동구', '동구', '부평구', '서구', '연수구', '옹진군', '중구'],
    '부산광역시': ['강서구', '금정구', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구', '기장군'],
    '대구광역시': ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
    '광주광역시': ['광산구', '남구', '동구', '북구', '서구'],
    '대전광역시': ['대덕구', '동구', '서구', '유성구', '중구'],
    '울산광역시': ['남구', '동구', '북구', '울주군', '중구'],
    '세종특별자치시': ['세종특별자치시'],
    '강원도': ['춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군', '양구군', '인제군', '고성군', '양양군'],
    '충청북도': ['청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군'],
    '충청남도': ['천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'],
    '전라북도': ['전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군'],
    '전라남도': ['목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'],
    '경상북도': ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '군위군', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'],
    '경상남도': ['창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군'],
    '제주특별자치도': ['제주시', '서귀포시']
  }

  // 유치원 데이터 로드
  const loadKindergartens = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { sidoCode, sggCode } = findRegionCodes(searchRegion.sido, searchRegion.sgg)
      const response = await fetchKindergartenData(sidoCode, sggCode, 20, 1)
      
      if (response.status !== 'SUCCESS') {
        throw new Error(`API 오류: ${response.status}`)
      }
      
      setKindergartens(response.kinderInfo || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.')
      console.error('유치원 데이터 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadKindergartens()
  }, [searchRegion])

  // 검색 필터링
  const filteredKindergartens = kindergartens.filter(kindergarten =>
    kindergarten.kindername.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kindergarten.addr.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 설립유형 한글 변환
  const getEstablishmentType = (establish: string) => {
    const types: { [key: string]: string } = {
      '1': '국공립',
      '2': '사립',
      '3': '법인',
      '4': '민간',
      '5': '직장',
      '6': '가정',
      '7': '부모협동',
      '8': '사회복지법인',
      '9': '기타'
    }
    return types[establish] || establish
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full h-4/5 rounded-t-3xl shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-[#fb8678] to-[#e67567] text-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">어린이집 & 유치원</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          
          {/* 검색바 */}
          <div className="relative mb-3">
            <div className="flex items-center bg-white rounded-lg p-2">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="시설명 또는 주소로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 text-gray-900 placeholder-gray-500 outline-none text-sm"
              />
              <button className="ml-2 p-1 text-gray-400">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* 지역 선택 */}
          <div className="flex space-x-2">
            <select
              value={searchRegion.sido}
              onChange={(e) => setSearchRegion({ ...searchRegion, sido: e.target.value, sgg: Object.keys(regionOptions[e.target.value as keyof typeof regionOptions])[0] })}
              className="flex-1 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm"
            >
              {Object.keys(regionOptions).map(sido => (
                <option key={sido} value={sido}>{sido}</option>
              ))}
            </select>
            <select
              value={searchRegion.sgg}
              onChange={(e) => setSearchRegion({ ...searchRegion, sgg: e.target.value })}
              className="flex-1 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm"
            >
              {regionOptions[searchRegion.sido as keyof typeof regionOptions].map(sgg => (
                <option key={sgg} value={sgg}>{sgg}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678]"></div>
              <span className="ml-2 text-gray-600">로딩 중...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={loadKindergartens}
                className="mt-4 bg-[#fb8678] text-white px-4 py-2 rounded-lg text-sm"
              >
                다시 시도
              </button>
            </div>
          ) : filteredKindergartens.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">🏫</div>
              <p className="text-gray-600">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredKindergartens.map((kindergarten, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">
                        {kindergarten.kindername}
                      </h3>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                          {getEstablishmentType(kindergarten.establish)}
                        </span>
                        <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full">
                          {kindergarten.officeedu}
                        </span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-[#fb8678]">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{kindergarten.addr}</span>
                    </div>
                    {kindergarten.telno && (
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{kindergarten.telno}</span>
                      </div>
                    )}
                    {kindergarten.opertime && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{kindergarten.opertime}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>
                        총 {kindergarten.prmstfcnt}명 정원 
                        (3세: {kindergarten.ag3fpcnt}명, 4세: {kindergarten.ag4fpcnt}명, 5세: {kindergarten.ag5fpcnt}명)
                      </span>
                    </div>
                  </div>
                  
                  {kindergarten.hpaddr && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <a
                        href={kindergarten.hpaddr}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#fb8678] text-xs hover:underline"
                      >
                        홈페이지 방문 →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default KindergartenList
