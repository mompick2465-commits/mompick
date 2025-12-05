'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Users,
  Flag,
  GraduationCap,
  Baby,
  BarChart3,
  Settings,
  Home,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  FileText,
  Image,
  MapPin,
  AlertCircle,
  Megaphone,
  Bell,
  HelpCircle,
  FileCheck
} from 'lucide-react'

const navigation = [
  { name: '대시보드', href: '/', icon: Home },
  { divider: true, label: '광고배너 관리' },
  { name: '스플래시 광고', href: '/banners/splash', icon: Image },
  { name: '모달 광고', href: '/banners/modal', icon: Image },
  { divider: true, label: '커뮤니티' },
  { name: '사용자 관리', href: '/users', icon: Users },
  { name: '게시글 관리', href: '/posts', icon: FileText },
  { divider: true, label: '메인기능 관리' },
  { name: '유치원 관리', href: '/kindergartens', icon: GraduationCap },
  { name: '어린이집 관리', href: '/childcare', icon: Baby },
  { name: '놀이시설 관리', href: '/playgrounds', icon: MapPin },
  { 
    name: '칭찬 관리', 
    icon: AlertCircle,
    children: [
      { name: '칭찬 관리', href: '/review-delete-requests' },
      { name: '전체 칭찬', href: '/reviews/all' }
    ]
  },
  { divider: true, label: '기타 관리' },
  { name: '공지 사항', href: '/notices', icon: Megaphone },
  { name: '약관 사항', href: '/terms', icon: FileCheck },
  { 
    name: '알림 사항', 
    icon: Bell,
    children: [
      { name: '전체 알림', href: '/notifications/all' },
      { name: '개별 알림', href: '/notifications/individual' },
      { name: '예약 알림', href: '/notifications/scheduled' }
    ]
  },
  { name: '신고 관리', href: '/reports', icon: Flag },
  { name: '문의 사항', href: '/contacts', icon: HelpCircle },
  { name: '통계', href: '/analytics', icon: BarChart3 },
  { name: '설정', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    // 현재 경로에 해당하는 부모 메뉴가 있으면 초기 상태로 열어둠
    const expanded: string[] = []
    if (pathname.startsWith('/review-delete-requests') || pathname.startsWith('/reviews')) {
      expanded.push('칭찬 관리')
    }
    if (pathname.startsWith('/notifications') || pathname.startsWith('/send-notification')) {
      expanded.push('알림 사항')
    }
    return expanded
  })

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName)
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    )
  }

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">MomPick Admin</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {navigation.map((item, index) => {
          // 구분선인 경우
          if ((item as any).divider) {
            return (
              <div key={`divider-${index}`} className="pt-4 pb-2">
                <div className="px-3">
                  <p className="text-sm font-bold text-gray-300 uppercase tracking-wide">
                    {(item as any).label}
                  </p>
                  <div className="mt-2 border-t border-gray-700"></div>
                </div>
              </div>
            )
          }
          
          // 서브메뉴가 있는 경우
          if ((item as any).children) {
            const isExpanded = expandedMenus.includes(item.name)
            const hasActiveChild = (item as any).children.some((child: any) => pathname === child.href)
            const IconComponent = item.icon
            
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={cn(
                    'group flex items-center w-full px-2 py-2 font-medium rounded-md transition-colors text-xs ml-2',
                    hasActiveChild
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                >
                  {IconComponent && (
                    <IconComponent
                      className={cn(
                        'mr-3 flex-shrink-0 h-4 w-4',
                        hasActiveChild ? 'text-white' : 'text-gray-400 group-hover:text-white'
                      )}
                      aria-hidden="true"
                    />
                  )}
                  {item.name}
                  {isExpanded ? (
                    <ChevronDown className="ml-auto h-4 w-4" />
                  ) : (
                    <ChevronRight className="ml-auto h-4 w-4" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {(item as any).children.map((child: any) => {
                      const isActive = pathname === child.href
                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={cn(
                            'flex items-center px-2 py-2 text-xs font-medium rounded-md transition-colors',
                            isActive
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          )}
                        >
                          {child.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }
          
          // 일반 메뉴 항목
          const isActive = pathname === item.href
          
          // 대시보드만 상위 메뉴, 나머지는 모두 하위 메뉴
          const isSubMenu = item.name !== '대시보드'
          
          const IconComponent = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href!}
              className={cn(
                'group flex items-center px-2 py-2 font-medium rounded-md transition-colors',
                isSubMenu ? 'text-xs ml-2' : 'text-sm',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              {IconComponent && (
                <IconComponent
                  className={cn(
                    'mr-3 flex-shrink-0',
                    isSubMenu ? 'h-4 w-4' : 'h-5 w-5',
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                  )}
                  aria-hidden="true"
                />
              )}
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

