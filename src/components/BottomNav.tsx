'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { HomeIcon, HeartIcon, ClockIcon, Cog6ToothIcon, ArrowUpIcon } from '@heroicons/react/24/outline'
import { HomeIcon as HomeSolid, HeartIcon as HeartSolid, ClockIcon as ClockSolid, Cog6ToothIcon as CogSolid } from '@heroicons/react/24/solid'

export default function BottomNav() {
  const pathname = usePathname()
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [activeRoot, setActiveRoot] = useState('/')

  useEffect(() => {
    if (['/', '/favorites', '/history', '/settings'].includes(pathname)) {
      setActiveRoot(pathname)
    }
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > window.innerHeight)
    }
    const handleCustomScroll = (e: any) => {
      setShowBackToTop(e.detail > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('custom-scroll', handleCustomScroll as EventListener)
    return () => {
       window.removeEventListener('scroll', handleScroll)
       window.removeEventListener('custom-scroll', handleCustomScroll as EventListener)
    }
  }, [])

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.dispatchEvent(new CustomEvent('custom-scroll-top'))
  }

  const tabs = [
    { name: '首页', href: '/', icon: HomeIcon, activeIcon: HomeSolid },
    { name: '收藏', href: '/favorites', icon: HeartIcon, activeIcon: HeartSolid },
    { name: '历史', href: '/history', icon: ClockIcon, activeIcon: ClockSolid },
    { name: '设置', href: '/settings', icon: Cog6ToothIcon, activeIcon: CogSolid },
  ]

  return (
    <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto bg-white/85 dark:bg-[#1c1c1e]/85 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full px-4 py-2 flex items-center space-x-2 transition-all">
        {tabs.map((tab) => {
           const currentContext = pathname.startsWith('/play') || pathname.startsWith('/video') ? activeRoot : pathname;
           const isActive = tab.href === '/' ? currentContext === '/' : currentContext.startsWith(tab.href);
           const isHomeContext = currentContext === '/';
          let IconStyle = isActive ? tab.activeIcon : tab.icon
          let displayName = tab.name
          let isBackToTop = false

          if (tab.name === '首页' && showBackToTop && isHomeContext) {
             IconStyle = ArrowUpIcon
             displayName = '顶部'
             isBackToTop = true
          }

          return (
            <Link 
              key={tab.name} 
              href={tab.href} 
              onClick={isBackToTop ? scrollToTop : undefined}
              className={`flex flex-col items-center justify-center transition-all duration-300 ease-out px-4 py-1.5 rounded-full ${isActive && !isBackToTop ? 'bg-[#ededed] dark:bg-[#1e2939] text-[#1e2939] dark:text-white' : isBackToTop ? 'bg-black/80 dark:bg-white/90 text-white dark:text-black shadow-lg scale-110' : 'text-gray-400 dark:text-gray-500 hover:text-[#1e2939] dark:hover:text-white'}`}
            >
              <IconStyle className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium leading-none">{displayName}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
