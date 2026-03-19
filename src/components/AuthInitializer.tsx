'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useRouter, usePathname } from 'next/navigation'

export default function AuthInitializer() {
  const { fetchCurrentUser } = useAppStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetchCurrentUser().then((data) => {
      if (!data?.user && data?.config && data.config.allowGuestAccess === false) {
         if (pathname !== '/login' && pathname !== '/register') {
            router.push('/login')
         }
      }
    })
  }, [fetchCurrentUser, pathname, router])

  return null
}
