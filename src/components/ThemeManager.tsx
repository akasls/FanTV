'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export default function ThemeManager() {
  const theme = useAppStore(state => state.theme)
  
  useEffect(() => {
    const root = document.documentElement
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])
  
  return null
}
