'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ChevronUpIcon, HomeIcon, HeartIcon, ClockIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { HomeIcon as HomeSolid, HeartIcon as HeartSolid, ClockIcon as ClockSolid, Cog6ToothIcon as CogSolid } from '@heroicons/react/24/solid'

export default function Sidebar() {
  const pathname = usePathname()
  const { siteConfig, isFilterExpanded, setIsFilterExpanded, searchTerm } = useAppStore()
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
    <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-white/95 dark:bg-[#0a0a0a]/80 backdrop-blur-3xl border-r border-black/5 dark:border-white/5 p-6 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.03)]">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-shimmer {
          animation: shimmer 4s linear infinite;
        }
      `}</style>
      <div className="flex items-center justify-between mb-12 mt-2">
        <div className="flex items-center space-x-3 w-full">
           {siteConfig?.siteLogo ? (
             <img src={siteConfig.siteLogo} alt={siteConfig?.siteName || 'FanTv'} className="w-9 h-9 object-cover rounded-xl shadow-sm shrink-0" />
           ) : null}
           <div className="text-[1.65rem] truncate max-w-[130px] leading-none font-extrabold drop-shadow-sm tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-400 to-gray-900 dark:from-white dark:via-gray-400 dark:to-white bg-[length:200%_auto] animate-shimmer shrink-0">
             {siteConfig?.siteName || 'FanTv'}
           </div>
           
           {pathname === '/' && !searchTerm && (
             <button
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="ml-auto flex items-center space-x-1 px-2 py-1 bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-[11px] font-medium text-gray-600 dark:text-gray-300 transition shrink-0"
             >
                <span>{isFilterExpanded ? '收起筛选' : '展开筛选'}</span>
                <ChevronUpIcon className={`w-3.5 h-3.5 transform transition-transform ${isFilterExpanded ? '' : 'rotate-180'}`} />
             </button>
           )}
        </div>
      </div>
      <nav className="flex-1 space-y-3">
        {tabs.map((tab) => {
           const currentContext = pathname.startsWith('/play') || pathname.startsWith('/video') ? activeRoot : pathname;
           const isActive = tab.href === '/' ? currentContext === '/' : currentContext.startsWith(tab.href);
           const Icon = isActive ? tab.activeIcon : tab.icon;
           return (
              <Link key={tab.name} href={tab.href} className={`flex items-center space-x-4 p-3.5 rounded-2xl transition-all duration-300 font-medium ${isActive ? 'bg-[#ededed] dark:bg-[#2c2c2e] text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/40'}`}>
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
              <Link href="/settings" className={`flex items-center space-x-4 p-3.5 rounded-2xl transition-all duration-300 font-medium ${isActive ? 'bg-[#ededed] dark:bg-[#2c2c2e] text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/40'}`}>
                <Icon className="w-6 h-6" />
                <span className="text-[15px]">设置中心</span>
              </Link>
           )
        })()}
      </div>
    </aside>
  )
}
