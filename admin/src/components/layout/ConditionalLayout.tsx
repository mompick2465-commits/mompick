'use client'

import { usePathname } from 'next/navigation'
import AdminLayout from './AdminLayout'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return <AdminLayout>{children}</AdminLayout>
}

