'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import ThemeManager from '@/components/ThemeManager'

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const { fetchCurrentUser } = useAppStore()
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  const isAuthPage = pathname === '/login' || pathname === '/register'

  useEffect(() => {
    fetchCurrentUser().then((data) => {
      // Set Document Title overrides from DB
      if (data?.config?.siteName) {
         document.title = data.config.siteName;
      }
      
      if (!data?.user && data?.config && data.config.allowGuestAccess === false) {
         if (!isAuthPage) {
            router.replace('/login')
            return // CRITICAL: Stop loading from finishing. Wait for the Next.js transition to /login
         }
      }
      // AUTO-PULL ON LOGIN
      if (data?.user) {
         const { historyData, favoriteData, userSourceOrder, setHistoryData, setFavoriteData, setUserSourceOrder } = useAppStore.getState()
         if (historyData.length === 0 && favoriteData.length === 0 && userSourceOrder.length === 0) {
            fetch('/api/users/sync', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ action: 'pull' })
            }).then(res => res.json()).then(cloudData => {
               if (cloudData.historyData !== undefined) setHistoryData(cloudData.historyData || [])
               if (cloudData.favoriteData !== undefined) setFavoriteData(cloudData.favoriteData || [])
               if (cloudData.sourceOrder) setUserSourceOrder(cloudData.sourceOrder)
            }).catch(console.error)
         }
      }

      setLoading(false)
    })
  }, [fetchCurrentUser, isAuthPage, router])

  // Zustand Subscribe for Auto-Push (Debounced 3s)
  useEffect(() => {
     let timeoutId: NodeJS.Timeout;
     const unsub = useAppStore.subscribe((state, prevState) => {
        if (!state.currentUser) return;
        
        const historyChanged = state.historyData !== prevState.historyData
        const favoriteChanged = state.favoriteData !== prevState.favoriteData
        const orderChanged = state.userSourceOrder !== prevState.userSourceOrder
        
        if (historyChanged || favoriteChanged || orderChanged) {
           clearTimeout(timeoutId)
           timeoutId = setTimeout(() => {
              const prefixedOrder = state.userSourceOrder.map(id => state.userDisabledSources.includes(id) ? '!' + id : id);
              fetch('/api/users/sync', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ 
                    action: 'upsert', 
                    historyData: state.historyData, 
                    favoriteData: state.favoriteData, 
                    sourceOrder: prefixedOrder 
                 })
              }).catch(() => {})
           }, 3000)
        }
     })
     
     return () => {
        unsub()
        clearTimeout(timeoutId)
     }
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-[#1c1c1e] transition-colors duration-300 flex items-center justify-center"></div>
  }

  if (isAuthPage) {
    return (
       <>
         <ThemeManager />
         <main className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#1c1c1e] transition-colors duration-300">
           {children}
         </main>
       </>
    )
  }

  return (
    <>
      <ThemeManager />
      <Sidebar />
      <main className="md:pl-64 pb-16 md:pb-0 min-h-screen transition-all duration-300 ease-in-out bg-gray-50 dark:bg-[#1c1c1e]">
        <div className="p-4 md:p-8 md:pt-6 max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>
      <BottomNav />
    </>
  )
}
