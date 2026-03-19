'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import BackToTop from '@/components/BackToTop'
import ThemeManager from '@/components/ThemeManager'

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const { fetchCurrentUser } = useAppStore()
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  const isAuthPage = pathname === '/login' || pathname === '/register'

  useEffect(() => {
    fetchCurrentUser().then((data) => {
      if (!data?.user && data?.config && data.config.allowGuestAccess === false) {
         if (!isAuthPage) {
            router.replace('/login')
         }
      }
      setLoading(false)
    })
  }, [fetchCurrentUser, isAuthPage, router])

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-[#111111] transition-colors duration-300 flex items-center justify-center"></div>
  }

  if (isAuthPage) {
    return (
       <>
         <ThemeManager />
         <main className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#111111] transition-colors duration-300">
           {children}
         </main>
       </>
    )
  }

  return (
    <>
      <ThemeManager />
      <Sidebar />
      <main className="md:pl-64 pb-16 md:pb-0 min-h-screen transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-950">
        <div className="p-4 md:p-8 md:pt-6 max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>
      <BottomNav />
      <BackToTop />
    </>
  )
}
