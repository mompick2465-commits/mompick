import { Building2, Stethoscope, MapPin, FileText, Users, Star, Clock, Phone, ChevronRight, Heart, Award, Shield } from 'lucide-react'

const Services = () => {
  const featuredFacilities = [
    {
      id: 1,
      name: '행복한 어린이집',
      type: '어린이집',
      location: '강남구 역삼동',
      rating: 4.8,
      reviews: 127,
      image: '🏠',
      price: '월 45만원',
      features: ['영어교육', '체육활동', '예술활동']
    },
    {
      id: 2,
      name: '사랑의 소아과',
      type: '소아과',
      location: '서초구 서초동',
      rating: 4.9,
      reviews: 89,
      image: '🏥',
      price: '진료비 3만원',
      features: ['예약제', '야간진료', '주차가능']
    },
    {
      id: 3,
      name: '미래 어린이집',
      type: '어린이집',
      location: '송파구 문정동',
      rating: 4.7,
      reviews: 95,
      image: '🏠',
      price: '월 42만원',
      features: ['자연친화', '농작물체험', '동물교감']
    }
  ]

  const quickServices = [
    { icon: Clock, title: '실시간 정보', desc: '최신 시설 정보', color: 'blue' },
    { icon: Shield, title: '검증된 시설', desc: '안전한 선택', color: 'green' },
    { icon: Award, title: '우수 시설', desc: '인증된 품질', color: 'orange' },
    { icon: Heart, title: '즐겨찾기', desc: '관심 시설 저장', color: 'red' }
  ]

  return (
    <section className="bg-gray-50 py-6">
      <div className="max-w-md mx-auto px-4">
        {/* Featured Facilities */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">⭐ 추천 시설</h2>
            <button className="text-orange-500 text-sm font-medium">더보기</button>
          </div>
          
          <div className="space-y-3">
            {featuredFacilities.map((facility) => (
              <div key={facility.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{facility.image}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{facility.name}</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {facility.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{facility.location}</p>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium text-gray-900">{facility.rating}</span>
                        <span className="text-xs text-gray-500">({facility.reviews})</span>
                      </div>
                      <span className="text-sm font-semibold text-orange-500">{facility.price}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {facility.features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <button className="flex-1 bg-orange-500 text-white py-2 px-3 rounded-lg text-xs font-medium">
                        상세보기
                      </button>
                      <button className="px-3 py-2 text-gray-500 hover:text-red-500">
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Services */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-3">🚀 빠른 서비스</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickServices.map((service, index) => {
              const Icon = service.icon
              const colorClasses = {
                blue: 'bg-blue-50 border-blue-200 text-blue-600',
                green: 'bg-green-50 border-green-200 text-green-600',
                orange: 'bg-orange-50 border-orange-200 text-orange-600',
                red: 'bg-red-50 border-red-200 text-red-600'
              }
              return (
                <button key={index} className={`p-3 rounded-lg border ${colorClasses[service.color as keyof typeof colorClasses]} hover:shadow-sm transition-shadow`}>
                  <div className="flex flex-col items-center text-center">
                    <Icon className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">{service.title}</span>
                    <span className="text-xs opacity-75">{service.desc}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Services
