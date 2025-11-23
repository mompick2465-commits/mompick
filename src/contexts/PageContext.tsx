import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { useLocation } from 'react-router-dom'

interface PageContextType {
  currentPage: string
  setCurrentPage: (page: string) => void
}

const PageContext = createContext<PageContextType | undefined>(undefined)

export const usePageContext = () => {
  const context = useContext(PageContext)
  if (context === undefined) {
    throw new Error('usePageContext must be used within a PageProvider')
  }
  return context
}

interface PageProviderProps {
  children: ReactNode
}

export const PageProvider: React.FC<PageProviderProps> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<string>('home')

  return (
    <PageContext.Provider value={{ currentPage, setCurrentPage }}>
      {children}
    </PageContext.Provider>
  )
}

// URL과 동기화하는 훅
export const usePageSync = () => {
  const { currentPage, setCurrentPage } = usePageContext()
  const location = useLocation()
  const isUpdatingRef = useRef(false)
  const lastUpdateRef = useRef<string>('')
  const userSelectedPageRef = useRef<string>('')

  useEffect(() => {
    // 이미 업데이트 중이면 무시
    if (isUpdatingRef.current) {
      return
    }
    
    // URL 경로에 따라 currentPage 설정
    const path = location.pathname
    const search = location.search
    const currentLocation = `${path}${search}`
    
    // 마지막 업데이트와 동일한 위치면 무시
    if (currentLocation === lastUpdateRef.current) {
      return
    }
    
    let newPage = 'home' // 기본값
    
    if (path === '/main') {
      const searchParams = new URLSearchParams(search)
      const category = searchParams.get('category')
      if (category) {
        newPage = 'community'
      } else {
        // 카테고리가 없어도 사용자가 선택한 페이지가 있으면 유지
        if (userSelectedPageRef.current && userSelectedPageRef.current !== 'home') {
          newPage = userSelectedPageRef.current
        } else {
          newPage = 'home'
        }
      }
    } else if (path === '/community') {
      newPage = 'community'
    } else if (path === '/profile') {
      newPage = 'home'
    } else if (path.startsWith('/community/post/')) {
      newPage = 'community'
    } else if (path === '/post/write') {
      newPage = 'community'
    } else if (path === '/') {
      newPage = 'home'
    }
    
    // 현재 페이지와 다를 때만 업데이트
    if (newPage !== currentPage) {
      console.log('PageContext: Updating currentPage from', currentPage, 'to', newPage)
      isUpdatingRef.current = true
      lastUpdateRef.current = currentLocation
      setCurrentPage(newPage)
      
      // 다음 렌더링 사이클에서 플래그 리셋
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 0)
    } else {
      // 페이지가 같아도 위치 정보는 업데이트
      lastUpdateRef.current = currentLocation
    }
  }, [location.pathname, location.search])

  // 사용자가 페이지를 선택했을 때 호출되는 함수
  const setUserSelectedPage = (page: string) => {
    userSelectedPageRef.current = page
    setCurrentPage(page)
  }

  return { currentPage, setCurrentPage: setUserSelectedPage }
}

