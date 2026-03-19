'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { HomeIcon, HeartIcon, ClockIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { HomeIcon as HomeSolid, HeartIcon as HeartSolid, ClockIcon as ClockSolid, Cog6ToothIcon as CogSolid } from '@heroicons/react/24/solid'
import ThemeToggle from '@/components/ThemeToggle'

export default function Sidebar() {
  const pathname = usePathname()
  const { siteConfig } = useAppStore()
  const [activeRoot, setActiveRoot] = useState('/')

  useEffect(() => {
    if (['/', '/favorites', '/history', '/settings'].includes(pathname)) {
      setActiveRoot(pathname)
    }
  }, [pathname])

  const tabs = [
    { name: '首页推荐', href: '/', icon: HomeIcon, activeIcon: HomeSolid },
    { name: '我的收藏', href: '/favorites', icon: HeartIcon, activeIcon: HeartSolid },
    { name: '播放历史', href: '/history', icon: ClockIcon, activeIcon: ClockSolid }
  ]

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-white/85 dark:bg-[#1c1c1e]/90 backdrop-blur-md border-r border-gray-200/50 dark:border-gray-800/50 p-6 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-12 mt-2">
        <div className="flex items-center space-x-3">
           {siteConfig?.siteLogo ? (
             <img src={siteConfig.siteLogo} alt={siteConfig?.siteName || 'FanTv'} className="w-9 h-9 object-cover rounded-xl shadow-sm" />
           ) : null}
           <div className="text-[1.65rem] truncate max-w-[130px] leading-none font-extrabold text-gray-900 dark:text-white drop-shadow-sm tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-300">
             {siteConfig?.siteName || 'FanTv'}
           </div>
        </div>
        <div className="hover:scale-110 transition-transform flex-shrink-0"><ThemeToggle /></div>
      </div>
      <nav className="flex-1 space-y-3">
        {tabs.map((tab) => {
           const currentContext = pathname.startsWith('/play') || pathname.startsWith('/video') ? activeRoot : pathname;
           const isActive = tab.href === '/' ? currentContext === '/' : currentContext.startsWith(tab.href);
           const Icon = isActive ? tab.activeIcon : tab.icon;
           return (
              <Link key={tab.name} href={tab.href} className={`flex items-center space-x-4 p-3.5 rounded-2xl transition-all duration-300 font-medium ${isActive ? 'bg-[#ededed] dark:bg-[#1e2939] text-[#1e2939] dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-[#1e2939] dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/40'}`}>
                <Icon className="w-6 h-6" />
                <span className="text-[15px]">{tab.name}</span>
              </Link>
           )
        })}
      </nav>
      <div className="mt-auto mb-4">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent mb-5 w-full"></div>
        {(() => {
           const isActive = pathname && pathname.startsWith('/settings');
           const Icon = isActive ? CogSolid : Cog6ToothIcon;
           return (
              <Link href="/settings" className={`flex items-center space-x-4 p-3.5 rounded-2xl transition-all duration-300 font-medium ${isActive ? 'bg-[#ededed] dark:bg-[#1e2939] text-[#1e2939] dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-[#1e2939] dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/40'}`}>
                <Icon className="w-6 h-6" />
                <span className="text-[15px]">设置中心</span>
              </Link>
           )
        })()}
      </div>
    </aside>
  )
}
