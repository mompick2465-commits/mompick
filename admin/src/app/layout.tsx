import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import AdminLayout from "@/components/layout/AdminLayout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MomPick 관리자 페이지",
  description: "MomPick 서비스 관리자 대시보드",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AdminLayout>
          {children}
        </AdminLayout>
      </body>
    </html>
  )
}