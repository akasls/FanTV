'use client'
import { useState, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function HistoryPage() {
  const { currentMode, historyData, setHistoryData } = useAppStore()
  const [search, setSearch] = useState('')

  const displayData = useMemo(() => {
     let data = historyData.filter(v => v.mode === currentMode)
     if (search.trim()) {
        data = data.filter(v => v.videoName?.toLowerCase().includes(search.toLowerCase()))
     }
     return data
  }, [historyData, currentMode, search])

  return (
    <div className="space-y-3 pb-24">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">播放历史</h1>
      </header>
      
      {/* Local Search Component */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-[#1c1c1e] text-gray-900 border-none dark:text-white rounded-full pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-shadow"
          placeholder="在历史中搜索..."
        />
      </div>


      {displayData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 mb-4 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">暂无播放历史</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          {displayData.map((video, idx) => (
             <Link 
               href={`/play?sourceId=${video._sourceId}&id=${video.videoId}${video.epUrl ? `&epName=${encodeURIComponent(video.epName || '')}&epUrl=${encodeURIComponent(video.epUrl)}` : ''}`} 
               key={`${video._sourceId}-${video.videoId}-${idx}`} 
               className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-[20px] md:rounded-[24px] relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-[0_8px_30px_rgb(59,130,246,0.2)] hover:ring-2 hover:ring-blue-500/50 transition-all duration-500 transform hover:-translate-y-1.5 block"
             >
               {video.videoPic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.videoPic} alt={video.videoName} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
               ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-[#1c1c1e]">
                    <span className="text-gray-400 text-xs">暂无封面</span>
                  </div>
               )}
               <div className="absolute inset-x-0 bottom-0 pt-16 pb-3 px-3">
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
                 <p className="relative text-white text-sm font-medium leading-tight line-clamp-2 drop-shadow-lg">{video.videoName}</p>
                 {video.epName && (
                   <p className="relative text-xs text-gray-300 mt-1 flex items-center justify-between">
                     <span className="truncate">{video.epName}</span>
                   </p>
                 )}
                 {(video.duration || 0) > 0 && (video.currentTime || 0) > 0 && (
                   <div className="relative mt-2 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                     <div className="absolute top-0 left-0 h-full bg-blue-500" style={{ width: `${Math.min(100, ((video.currentTime || 0) / (video.duration || 1)) * 100)}%` }} />
                   </div>
                 )}
               </div>
               <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md">
                 <span className="text-xs text-white font-medium">{video._sourceName}</span>
               </div>
             </Link>
          ))}
        </div>
      )}
    </div>
  )
}
