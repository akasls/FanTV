'use client'
import { useAppStore } from '@/store/useAppStore'
import { useEffect, useState, useRef, useCallback } from 'react'
import { ArrowLeftIcon, ArrowPathIcon, EllipsisHorizontalIcon, HeartIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { VideoItem } from '@/store/useAppStore' // Assuming VideoItem is exported from useAppStore file

interface Source {
  id: string
  name: string
}

interface Category {
  type_id: string | number
  type_name: string
  type_pid?: string | number
}

export default function Home() {
  const { 
    currentMode, homeFeedList, setHomeFeedList, searchAllSources, selectedSourceGlobal, setSelectedSourceGlobal, setSearchAllSources,
    searchTerm, setSearchTerm, inputTerm, setInputTerm, selectedCategoryId, setSelectedCategoryId, drillDownSourceId, setDrillDownSourceId,
    selectedSourceId, setSelectedSourceId
  } = useAppStore()
  
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null) // Added error state
  
  // Search state
  const [sources, setSources] = useState<Source[]>([])
  
  // Category state
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  // Custom Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const closeDropdown = () => {
     setIsDropdownOpen(false)
  }

  // Infinite Scroll state
  const [page, setPage] = useState(() => Math.max(1, Math.ceil(homeFeedList.length / 50)))
  const [hasMore, setHasMore] = useState(true)
  const observerTarget = useRef<HTMLDivElement>(null)
  
  // Safe ref to avoid closure staleness or passing unsupported setter functions to Zustand
  const feedRef = useRef(homeFeedList)
  useEffect(() => { feedRef.current = homeFeedList }, [homeFeedList])

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close custom dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Desktop Drag-to-Scroll Kinematics for Sources
  const sourceScrollRef = useRef<HTMLDivElement>(null)
  const isDraggingSource = useRef(false)
  const startXSource = useRef(0)
  const scrollLeftSource = useRef(0)
  const hasDraggedSource = useRef(false)

  const handleSourceMouseDown = (e: React.MouseEvent) => {
    isDraggingSource.current = true
    hasDraggedSource.current = false
    if (sourceScrollRef.current) {
      startXSource.current = e.pageX - sourceScrollRef.current.offsetLeft
      scrollLeftSource.current = sourceScrollRef.current.scrollLeft
    }
  }
  const handleSourceMouseLeave = () => { isDraggingSource.current = false }
  const handleSourceMouseUp = () => { isDraggingSource.current = false }
  const handleSourceMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSource.current || !sourceScrollRef.current) return
    e.preventDefault()
    const x = e.pageX - sourceScrollRef.current.offsetLeft
    const walk = (x - startXSource.current) * 1.5 // moderate velocity
    if (Math.abs(walk) > 5) hasDraggedSource.current = true
    sourceScrollRef.current.scrollLeft = scrollLeftSource.current - walk
  }

  // Fetch available sources for dropdown
  useEffect(() => {
    if (!mounted) return
    fetch(`/api/sources?mode=${currentMode}`).then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) {
         setSources(data)
         const matched = data.find(s => s.id === selectedSourceGlobal)
         if (!matched) {
            setSelectedSourceGlobal(data[0].id)
            setSelectedSourceId(data[0].id)
         } else {
            setSelectedSourceId(selectedSourceGlobal)
         }
      } else {
         setSources([])
         setSelectedSourceId('')
      }
    }).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, currentMode])

  // Reset function
  const resetAndFetch = useCallback(() => {
    setPage(1)
    setHasMore(true)
    setHomeFeedList([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHomeFeedList]) // Added setHomeFeedList to deps

  // Priority Fetch for Categories (Solves category load bottleneck)
  useEffect(() => {
    if (!mounted || !selectedSourceId || selectedSourceId === 'all') return
    const fetchCats = async () => {
      setLoadingCategories(true)
      try {
        const res = await fetch(`/api/categories?sourceId=${selectedSourceId}`)
        const data = await res.json()
        setCategories(data.categories || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCats()
  }, [selectedSourceId, mounted])

  // Trigger reset when source or mode changes (SKIP INITIAL MOUNT TO PRESERVE ZUSTAND CACHE)
  const isFirstMount1 = useRef(true)
  useEffect(() => {
    if (!mounted) return
    if (isFirstMount1.current) {
      isFirstMount1.current = false
      return
    }
    setCategories([])
    setSelectedCategoryId('')
    setDrillDownSourceId(null)
    // Deliberately preserving searchTerm so jumping across sources during Search mode retains query states!
    resetAndFetch()
  }, [currentMode, selectedSourceId, mounted, resetAndFetch])

  // Trigger reset when category or search term changes
  const isFirstMount2 = useRef(true)
  useEffect(() => {
    if (!mounted) return
    if (isFirstMount2.current) {
      isFirstMount2.current = false
      return
    }
    resetAndFetch()
  }, [searchTerm, selectedCategoryId, mounted, resetAndFetch])

  // Fetch Videos Effect (triggered by page, term, category, source changes)
  useEffect(() => {
    if (!mounted) return
    
    const fetchVideos = async () => {
      // Prevent refetch if we already have the list and categories cached
      if (page === 1 && feedRef.current.length > 0 && categories.length > 0 && !searchTerm && !selectedCategoryId && selectedSourceId === 'all') return

      setLoading(true)
      setError(null) // Reset error on new fetch
      try {
        const queryParams = new URLSearchParams()
        queryParams.append('mode', currentMode)
        queryParams.append('pg', page.toString())
        
        const activeSourceId = drillDownSourceId || selectedSourceId
        if (activeSourceId && activeSourceId !== 'all') {
          queryParams.append('sourceId', activeSourceId)
        }
        if (searchTerm.trim() !== '') {
          queryParams.append('wd', searchTerm.trim())
        }
        if (selectedCategoryId) {
          queryParams.append('t', selectedCategoryId)
        }
        if (searchAllSources && !drillDownSourceId) { // Only append searchAll when not drilling down
          queryParams.append('searchAll', 'true')
        }
        
        const res = await fetch(`/api/videos?${queryParams.toString()}`)
        const data = await res.json()
        
        // Ensure backend returned categories serve as fallback
        if (data.categories && data.categories.length > 0 && categories.length === 0) {
          setCategories(data.categories)
        }

        // Setup lists
        if (data.list && data.list.length > 0) {
          if (searchTerm && searchAllSources && !drillDownSourceId) {
             setHomeFeedList(data.list)
             setHasMore(false)
          } else if (page === 1) {
             setHomeFeedList(data.list)
             if (data.list.length < 20) setHasMore(false)
          } else {
            // Safely spread the current feedRef and the new data list
            setHomeFeedList([...feedRef.current, ...data.list])
            if (data.list.length < 20) setHasMore(false)
          }
        } else {
          if (page === 1) setHomeFeedList([])
          setHasMore(false)
        }
      } catch (e) {
        console.error("Failed to load home feed", e)
        setError("Failed to load videos. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    
    // Using a tiny timeout prevents React StrictMode double invocation issues
    const timeout = setTimeout(fetchVideos, 50)
    return () => clearTimeout(timeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, currentMode, selectedSourceId, selectedCategoryId, searchTerm, page, searchAllSources, drillDownSourceId])  

  const handleCategoryClick = (id: string) => {
    setSelectedCategoryId(id)
    closeDropdown() // Close dropdown after category selection
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setSelectedCategoryId('')
      setSearchTerm(inputTerm) // Commit search term
    }
  }

  // Intersection Observer implementation
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          setPage(p => p + 1)
        }
      },
      { threshold: 0.1 }
    )
    if (observerTarget.current) observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [loading, hasMore])

  // Scroll Restoration Logic
  useEffect(() => {
    if (mounted && feedRef.current.length > 0) {
      const savedScroll = sessionStorage.getItem('homeScrollY')
      if (savedScroll) {
        // Larger delay needed to guarantee images and DOM nodes are painted
        setTimeout(() => {
          window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' })
          
          // Hydrate horizontal scrolls!
          const hScrollsStr = sessionStorage.getItem('homeHorizontalScrolls')
          if (hScrollsStr) {
            try {
               const hScrolls = JSON.parse(hScrollsStr)
               Object.entries(hScrolls).forEach(([source, left]) => {
                  const el = document.getElementById(`scroll-row-${source}`)
                  if (el) el.scrollLeft = left as number
               })
            } catch(e){}
            sessionStorage.removeItem('homeHorizontalScrolls')
          }
        }, 150)
        
        // Remove slightly later to prevent layout shifts overriding it
        setTimeout(() => {
           sessionStorage.removeItem('homeScrollY')
        }, 500)
      }
    }
  }, [mounted, feedRef.current.length])

  const saveScrollPos = () => {
    sessionStorage.setItem('homeScrollY', window.scrollY.toString())
  }

  if (!mounted) return null

  // Category Multi-tier logics
  const primaryCats = categories.filter(c => !c.type_pid || Number(c.type_pid) === 0)
  
  const getSelectedParentId = () => {
     if (!selectedCategoryId) return ''
     const activeCat = categories.find(c => String(c.type_id) === String(selectedCategoryId))
     if (!activeCat) return ''
     return (!activeCat.type_pid || Number(activeCat.type_pid) === 0) ? String(activeCat.type_id) : String(activeCat.type_pid)
  }
  const activeParentId = getSelectedParentId()
  const secondaryCats = activeParentId ? categories.filter(c => String(c.type_pid) === activeParentId) : []

  // Blacklist for category names
  const categoryBlacklist = ['资讯','新闻资讯','影视资讯','预告资讯','明星资讯']

  return (
    <div className="space-y-3 pb-24">
      {/* Top Header Wrap (Static, not sticky) */}
      <div className="pt-0 pointer-events-none relative z-40 w-full max-w-3xl mx-auto my-4 md:my-8 px-4 md:px-0">
        {/* Search Bar with Integrated Category/Source Dropdown */}
        <div className="relative flex items-center bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-md rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.06)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.4)] border border-gray-200/50 dark:border-gray-800/50 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all duration-300 pr-3 pointer-events-auto">
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => { setIsDropdownOpen(!isDropdownOpen); }}
              className="flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap"
            >
              <span className="truncate max-w-[80px] md:max-w-[120px]">
                {sources.find(s => s.id === selectedSourceId)?.name || '未选定'}
              </span>
              <svg className={`w-4 h-4 ml-1 flex-shrink-0 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-3 w-[270px] bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-gray-800 rounded-3xl shadow-xl z-50 py-3 flex flex-col max-h-[70vh] md:max-h-[600px]">
                 
                 {/* STICKY HEADER PART */}
                 <div className="px-3 flex-none border-b border-gray-100 dark:border-gray-800/60 pb-3 mb-2 pointer-events-auto">
                    <div className="text-[11px] font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wider">切换当前源站</div>
                    <div 
                      ref={sourceScrollRef}
                      onMouseDown={handleSourceMouseDown}
                      onMouseLeave={handleSourceMouseLeave}
                      onMouseUp={handleSourceMouseUp}
                      onMouseMove={handleSourceMouseMove}
                      className="flex overflow-x-auto hide-scrollbar space-x-2 cursor-grab active:cursor-grabbing pb-1"
                    >
                       {sources.map(s => (
                         <button
                           key={s.id}
                           onClick={(e) => { 
                               if (hasDraggedSource.current) {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  hasDraggedSource.current = false
                                  return
                               }
                               setSelectedSourceId(s.id)
                               setSelectedSourceGlobal(s.id)
                           }}
                           className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all border ${selectedSourceId === s.id ? 'border-transparent bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                         >{s.name}</button>
                       ))}
                    </div>
                 </div>

                 {/* SCROLLABLE CATEGORIES PART */}
                 <div className="px-3 flex-1 overflow-y-auto hide-scrollbar flex flex-col pointer-events-auto pt-1">
                    <div className="text-[11px] font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wider flex items-center justify-between">
                       <span>影片分类</span>
                       {categories.length === 0 && loadingCategories && <span className="text-blue-500 animate-pulse text-[10px] font-medium px-2 bg-blue-50 dark:bg-blue-900/40 rounded-full">快速加载中...</span>}
                    </div>
                    <button
                       onClick={() => { setSelectedCategoryId(''); closeDropdown() }}
                       className={`w-full text-left py-2.5 px-3 rounded-2xl text-sm transition-colors mb-1 ${selectedCategoryId === '' ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                     >所有影片</button>
                     {categories.filter(c => !c.type_pid || Number(c.type_pid) === 0).filter(c => !categoryBlacklist.includes(c.type_name)).map(cat => {
                       const isParentSelected = activeParentId === String(cat.type_id)
                       const catSecondaryCats = categories.filter(c => String(c.type_pid) === String(cat.type_id)).filter(c => !categoryBlacklist.includes(c.type_name))
                       return (
                         <div key={cat.type_id} className="mb-1">
                           <div className={`flex items-center rounded-2xl transition-colors ${isParentSelected ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                             <button
                               onClick={() => { handleCategoryClick(String(cat.type_id)) }}
                               className={`flex-1 text-left py-2.5 px-3 text-sm transition-colors ${selectedCategoryId === String(cat.type_id) ? 'text-blue-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                             >{cat.type_name}</button>
                           </div>
                           
                           {catSecondaryCats.length > 0 && (
                              <div className="ml-4 pl-2 border-l-2 border-gray-100 dark:border-gray-800 mt-1 mb-2 grid grid-cols-2 gap-1">
                                {catSecondaryCats.map(sub => (
                                   <button
                                     key={sub.type_id}
                                     onClick={() => { handleCategoryClick(String(sub.type_id)) }}
                                     className={`py-1.5 px-2 text-left text-[11px] rounded-xl transition-all truncate ${selectedCategoryId === String(sub.type_id) ? 'text-blue-600 bg-blue-100/50 dark:text-blue-400 dark:bg-blue-900/40 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                   >{sub.type_name}</button>
                                ))}
                              </div>
                           )}
                         </div>
                       )
                     })}
                 </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-800 flex-shrink-0 mr-3 hidden sm:block"></div>
          
          <div className="flex items-center flex-1 min-w-0 relative">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mr-2" />
            <input 
              type="text" 
              placeholder="输入关键词回车搜索..." 
              className="bg-transparent border-none outline-none w-full py-2.5 pr-8 text-[15px] font-medium placeholder-gray-400 dark:text-white"
              value={inputTerm}
              onChange={(e) => setInputTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchTerm(inputTerm)
                }
              }}
            />
            {(inputTerm || searchTerm) && (
              <button 
                onClick={() => { setInputTerm(''); setSearchTerm(''); setDrillDownSourceId(null); resetAndFetch() }} 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Video Grid */}
      {homeFeedList.length === 0 && !loading && !error ? (
        <div className="text-center py-24 text-gray-500 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
             <MagnifyingGlassIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="font-medium text-gray-600 dark:text-gray-400">暂无影片数据，请前往设置配置数据源。</p>
        </div>
      ) : error ? (
        <div className="text-center py-24 text-red-500 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-800/50 rounded-full flex items-center justify-center mb-4">
             <XMarkIcon className="w-8 h-8 text-red-300 dark:text-red-600" />
          </div>
          <p className="font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : (
        <>
          {/* Search Layout Grouping or Video Grid */}
          {searchTerm && searchAllSources && !drillDownSourceId ? (
            <div className="space-y-8">
               {Object.entries(
                 homeFeedList.reduce((acc, video) => {
                   if(!acc[video._sourceName]) acc[video._sourceName] = []
                   acc[video._sourceName].push(video)
                   return acc
                 }, {} as Record<string, VideoItem[]>)
               ).map(([sourceName, videos]) => (
                 <div key={sourceName}>
                   <div className="flex items-center justify-between mb-3 px-1">
                     <h3 className="font-bold text-lg dark:text-gray-200 text-gray-800 flex items-center">
                        <span className="w-1.5 h-5 bg-blue-500 rounded-full mr-2"></span>
                        {sourceName}
                     </h3>
                     <button onClick={() => {
                        setDrillDownSourceId(videos[0]._sourceId)
                        setPage(1)
                        setHasMore(true)
                        setHomeFeedList([])
                        window.scrollTo({ top: 0, behavior: 'instant' })
                     }} className="text-sm text-blue-500 font-medium hover:text-blue-600 transition-colors">查看更多</button>
                   </div>
                   <div id={`scroll-row-${sourceName}`} className="flex overflow-x-auto hide-scrollbar space-x-4 md:space-x-5 lg:space-x-6 pb-6 items-stretch px-1 pointer-events-auto">
                     {videos.map((video, idx) => (
                        <div key={`${video.vod_id}-${idx}`} className="w-[125px] md:w-[150px] flex-shrink-0">
                          <Link href={`/play?sourceId=${video._sourceId}&id=${video.vod_id}`} onClick={() => {
                             saveScrollPos()
                             const rowEl = document.getElementById(`scroll-row-${sourceName}`)
                             if (rowEl) {
                                const scrolls = JSON.parse(sessionStorage.getItem('homeHorizontalScrolls') || '{}')
                                scrolls[sourceName] = rowEl.scrollLeft
                                sessionStorage.setItem('homeHorizontalScrolls', JSON.stringify(scrolls))
                             }
                          }}>
                            <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-[20px] md:rounded-[24px] relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-[0_8px_30px_rgb(59,130,246,0.2)] hover:ring-2 hover:ring-blue-500/50 transition-all duration-500 transform hover:-translate-y-1.5">
                              {video.vod_pic ? (
                                 // eslint-disable-next-line @next/next/no-img-element
                                 <img src={video.vod_pic} alt={video.vod_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-400">无封面</div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 transition-opacity duration-300"></div>
                              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                                <h3 className="text-white font-bold text-[13px] md:text-sm line-clamp-2 leading-tight drop-shadow-md">{video.vod_name}</h3>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[11px] text-gray-300 font-medium truncate">{video.vod_remarks || video.vod_year}</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </div>
                     ))}
                   </div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Drill-down specific source header */}
              {drillDownSourceId && searchTerm && searchAllSources && (
                 <div className="flex items-center justify-between mb-4 px-1 pb-2 border-b border-gray-100 dark:border-gray-800">
                   <h3 className="font-bold text-lg dark:text-gray-200 text-gray-800 flex items-center">
                      <span className="w-1.5 h-6 bg-blue-500 rounded-full mr-2"></span>
                      {homeFeedList.length > 0 && homeFeedList[0]?._sourceName ? homeFeedList[0]._sourceName : (sources.find(s => s.id === drillDownSourceId)?.name || '搜索结果')}
                   </h3>
                   <button onClick={() => {
                      setDrillDownSourceId(null)
                      setPage(1)
                      setHasMore(true)
                      setHomeFeedList([])
                   }} className="text-[13px] font-medium px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors flex items-center">
                      返回聚合
                   </button>
                 </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
                {homeFeedList.map((video, idx) => (
              <Link 
                onClick={saveScrollPos}
                href={`/play?sourceId=${video._sourceId}&id=${video.vod_id}`} 
                key={`${video._sourceId}-${video.vod_id}-${idx}`} 
                className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-[20px] md:rounded-[24px] relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-[0_8px_30px_rgb(59,130,246,0.2)] hover:ring-2 hover:ring-blue-500/50 transition-all duration-500 transform hover:-translate-y-1.5"
              >
                {video.vod_pic ? (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img src={video.vod_pic} alt={video.vod_name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                ) : (
                   <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-[#1c1c1e]">
                     <span className="text-gray-400 text-xs">暂无封面</span>
                   </div>
                )}
                <div className="absolute inset-x-0 bottom-0 pt-16 pb-3 px-3">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
                  <p className="relative text-white text-sm font-medium leading-tight line-clamp-2 drop-shadow-lg">{video.vod_name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

          {/* Infinite Scroll Observer Target */}
          {hasMore && (
            <div ref={observerTarget} className="py-6 flex justify-center">
              {loading && (
                 <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
