import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppMode = 'General' | 'Adult'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface SiteConfig {
  allowRegistration?: boolean
  allowGuestAccess?: boolean
  siteName?: string
  siteDescription?: string
  siteLogo?: string
  doubanDataProxy?: string
  doubanImageProxy?: string
  allowSpeedTest?: boolean
  speedTestPlayback?: boolean
  removeTsAd?: boolean
  shortDramaApiUrl?: string | null
  shortDramaCategories?: string | null;
}

export interface User {
  id: string;
  username: string;
  role: string;
  allowAdultMode: boolean;
  sourceOrder: string | null;
  doubanDataProxy?: string | null;
  doubanImageProxy?: string | null;
  speedTestPlayback?: boolean | null;
}

export interface VideoItem {
  id?: string
  videoId?: string
  videoName?: string
  videoPic?: string | null
  mode?: string
  epName?: string
  epUrl?: string
  currentTime?: number
  duration?: number
  [key: string]: any
}

export interface SearchHistoryItem {
  term: string
  mode: string
  timestamp: number
}

interface AppState {
  currentMode: AppMode
  allowAdultMode: boolean
  searchAllSources: boolean
  selectedSourceGlobal: string
  enableShortcuts: boolean
  enableAdBlock: boolean
  theme: ThemeMode

  // User-Overridable Global Configs
  isFilterExpanded: boolean;
  setIsFilterExpanded: (expanded: boolean) => void;
  speedTestPlayback: boolean;
  setSpeedTestPlayback: (enabled: boolean) => void;
  doubanDataProxy: string;
  setDoubanDataProxy: (proxy: string) => void;
  doubanImageProxy: string;
  setDoubanImageProxy: (proxy: string) => void;

  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  fetchCurrentUser: () => Promise<{ user: any, config: any }>

  siteConfig: SiteConfig | null
  setSiteConfig: (config: SiteConfig | null) => void
  
  userSourceOrder: string[]
  setUserSourceOrder: (order: string[]) => void
  userDisabledSources: string[]
  setUserDisabledSources: (sources: string[]) => void

  // Transient Session Search states
  selectedSourceId: string
  searchTerm: string
  inputTerm: string
  selectedCategoryId: string
  drillDownSourceId: string | null
  drillDownCustomApiUrl: string | null
  drillDownCategoryId: string | null

  activeStaticChannel: string;
  setActiveStaticChannel: (channel: string) => void;
  activeStaticSubCat: string;
  setActiveStaticSubCat: (subcat: string) => void;
  doubanTag: string;
  setDoubanTag: (tag: string) => void;
  doubanSubcat: string;
  setDoubanSubcat: (subcat: string) => void;
  doubanGenre: string;
  setDoubanGenre: (genre: string) => void;
  doubanCountry: string;
  setDoubanCountry: (country: string) => void;
  doubanYear: string;
  setDoubanYear: (year: string) => void;
  doubanSort: string;
  setDoubanSort: (sort: string) => void;
  targetSearchSource: string;
  setTargetSearchSource: (source: string) => void;

  setDrillDownCustomApiUrl: (url: string | null) => void
  setDrillDownCategoryId: (id: string | null) => void

  historyData: VideoItem[]
  favoriteData: VideoItem[]
  homeFeedList: VideoItem[]
  categoriesCache: Record<string, any[]>
  setCategoriesCache: (sourceId: string, cats: any[]) => void
  searchHistory: SearchHistoryItem[]

  setAllowAdultMode: (allow: boolean) => void
  setSearchAllSources: (all: boolean) => void
  setSelectedSourceGlobal: (id: string) => void
  setEnableShortcuts: (enabled: boolean) => void
  setEnableAdBlock: (enabled: boolean) => void
  setTheme: (theme: ThemeMode) => void
  setMode: (mode: AppMode) => void
  
  setSearchTerm: (term: string) => void
  setInputTerm: (term: string) => void
  setSelectedCategoryId: (id: string) => void
  setSelectedSourceId: (id: string) => void
  setDrillDownSourceId: (id: string | null) => void
  
  setHistoryData: (data: VideoItem[]) => void
  updateHistoryRecord: (videoId: string, sourceId: string, epName: string, epUrl: string, currentTime: number, duration: number) => void
  setFavoriteData: (data: VideoItem[]) => void
  setHomeFeedList: (data: VideoItem[]) => void
  addSearchHistory: (term: string, mode: string) => void
  clearSearchHistory: (mode: string) => void
  
  clearCache: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentMode: 'General',
      allowAdultMode: false,
      searchAllSources: false,
      selectedSourceGlobal: '',
      enableShortcuts: true,
      enableAdBlock: true,
      theme: 'system',
      isFilterExpanded: true,
      setIsFilterExpanded: (v) => set({ isFilterExpanded: v }),
      
      speedTestPlayback: false,
      setSpeedTestPlayback: (v) => set({ speedTestPlayback: v }),
      doubanDataProxy: '',
      setDoubanDataProxy: (v) => set({ doubanDataProxy: v }),
      doubanImageProxy: '',
      setDoubanImageProxy: (v) => set({ doubanImageProxy: v }),

      siteConfig: null,
      setSiteConfig: (config) => set({ siteConfig: config }),

      currentUser: null,
      setCurrentUser: (user) => {
        set({ currentUser: user })
        if (user) {
           set({ allowAdultMode: user.allowAdultMode })
           
           // Apply user-level preferred settings
           if (user.speedTestPlayback !== null && user.speedTestPlayback !== undefined) {
             set({ speedTestPlayback: user.speedTestPlayback });
           }
           if (user.doubanDataProxy !== null && user.doubanDataProxy !== undefined) {
             set({ doubanDataProxy: user.doubanDataProxy });
           }
           if (user.doubanImageProxy !== null && user.doubanImageProxy !== undefined) {
             set({ doubanImageProxy: user.doubanImageProxy });
           }

           if (user.sourceOrder) {
             try { 
               const parsed = JSON.parse(user.sourceOrder) as string[]
               const order = parsed.map((id: string) => id.startsWith('!') ? id.slice(1) : id)
               const disabled = parsed.filter((id: string) => id.startsWith('!')).map((id: string) => id.slice(1))
               set({ userSourceOrder: order, userDisabledSources: disabled })
             } catch(e){}
           }
        }
      },
      fetchCurrentUser: async () => {
        try {
          const res = await fetch('/api/auth/me', { cache: 'no-store' })
          const data = await res.json()
          set({ currentUser: data.user || null })
          if (data.config) {
             set({ siteConfig: {
                 siteName: data.config.siteName,
                 siteDescription: data.config.siteDescription,
                 siteLogo: data.config.siteLogo,
                 allowSpeedTest: data.config.allowSpeedTest,
                 speedTestPlayback: data.config.speedTestPlayback,
                 removeTsAd: data.config.removeTsAd,
                 shortDramaApiUrl: data.config.shortDramaApiUrl,
                 shortDramaCategories: data.config.shortDramaCategories
             }})
             
             // Baseline fallback configurations
             if (!data.user || data.user.speedTestPlayback === null) {
                set({ speedTestPlayback: data.config.speedTestPlayback ?? false });
             }
             if (!data.user || data.user.doubanDataProxy === null) {
                set({ doubanDataProxy: data.config.doubanDataProxy || '' });
             }
             if (!data.user || data.user.doubanImageProxy === null) {
                set({ doubanImageProxy: data.config.doubanImageProxy || '' });
             }
          }
          if (data.user) {
             set({ allowAdultMode: data.user.allowAdultMode })
             
             if (data.user.speedTestPlayback !== null && data.user.speedTestPlayback !== undefined) {
               set({ speedTestPlayback: data.user.speedTestPlayback });
             }
             if (data.user.doubanDataProxy) {
               set({ doubanDataProxy: data.user.doubanDataProxy });
             } else if (data.config?.doubanDataProxy) {
               set({ doubanDataProxy: data.config.doubanDataProxy });
             }
             
             if (data.user.doubanImageProxy) {
               set({ doubanImageProxy: data.user.doubanImageProxy });
             } else if (data.config?.doubanImageProxy) {
               set({ doubanImageProxy: data.config.doubanImageProxy });
             }
             if (data.user.sourceOrder) {
               try { 
                 const parsed = JSON.parse(data.user.sourceOrder) as string[]
                 const order = parsed.map((id: string) => id.startsWith('!') ? id.slice(1) : id)
                 const disabled = parsed.filter((id: string) => id.startsWith('!')).map((id: string) => id.slice(1))
                 set({ userSourceOrder: order, userDisabledSources: disabled })
               } catch(e){}
             }
          } else {
             set({ allowAdultMode: false })
          }
          return { user: data.user, config: data.config }
        } catch {
          set({ currentUser: null, allowAdultMode: false })
          return { user: null, config: null }
        }
      },
      
      userSourceOrder: [],
      setUserSourceOrder: (order) => set({ userSourceOrder: order }),
      userDisabledSources: [],
      setUserDisabledSources: (sources) => set({ userDisabledSources: sources }),
      
      selectedSourceId: '',
      searchTerm: '',
      inputTerm: '',
      selectedCategoryId: '',
      drillDownSourceId: null,
      historyData: [],
      favoriteData: [],
      homeFeedList: [],
      searchHistory: [],
      drillDownCustomApiUrl: null,
      drillDownCategoryId: null,
      
      activeStaticChannel: "movie",
      setActiveStaticChannel: (c) => set({ activeStaticChannel: c }),
      activeStaticSubCat: "全部",
      setActiveStaticSubCat: (s) => set({ activeStaticSubCat: s }),
      doubanTag: "电影",
      setDoubanTag: (t) => set({ doubanTag: t }),
      doubanSubcat: "全部",
      setDoubanSubcat: (s) => set({ doubanSubcat: s }),
      doubanGenre: "",
      setDoubanGenre: (g) => set({ doubanGenre: g }),
      doubanCountry: "",
      setDoubanCountry: (c) => set({ doubanCountry: c }),
      doubanYear: "",
      setDoubanYear: (y) => set({ doubanYear: y }),
      doubanSort: "U",
      setDoubanSort: (s) => set({ doubanSort: s }),
      targetSearchSource: "all",
      setTargetSearchSource: (s) => set({ targetSearchSource: s }),
      
      setDrillDownCustomApiUrl: (url) => set({ drillDownCustomApiUrl: url }),
      setDrillDownCategoryId: (id) => set({ drillDownCategoryId: id }),

      setAllowAdultMode: (allow) => set({ allowAdultMode: allow }),
      setSearchAllSources: (all) => set({ searchAllSources: all }),
      setSelectedSourceGlobal: (id) => set({ selectedSourceGlobal: id }),
      setEnableShortcuts: (enabled) => set({ enableShortcuts: enabled }),
      setEnableAdBlock: (enabled) => set({ enableAdBlock: enabled }),
      setTheme: (theme) => set({ theme }),
      
      setSearchTerm: (term) => set({ searchTerm: term }),
      setInputTerm: (term) => set({ inputTerm: term }),
      setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
      setSelectedSourceId: (id) => set({ selectedSourceId: id }),
      setDrillDownSourceId: (id) => set({ drillDownSourceId: id }),

      setMode: (mode) => {
        if (mode === 'Adult' && !get().allowAdultMode) {
          console.warn("Permission denied: You do not have access to this mode.")
          set({ currentMode: 'General' }) 
          return
        }

        set({
          currentMode: mode,
          homeFeedList: [],
          selectedSourceId: '',
          searchTerm: '',
          inputTerm: '',
          selectedCategoryId: '',
          drillDownSourceId: null,
        })
      },

      setHistoryData: (data) => set({ historyData: data }),
      updateHistoryRecord: (videoId, sourceId, epName, epUrl, currentTime, duration) => {
        set(state => {
          const newHistory = [...state.historyData]
          const hIdx = newHistory.findIndex(v => String(v.videoId) === String(videoId) && String(v._sourceId) === String(sourceId))
          if (hIdx !== -1) {
            const oldTime = newHistory[hIdx].currentTime || 0;
            if (currentTime < 5 && oldTime > currentTime + 10 && newHistory[hIdx].epUrl === epUrl) {
               currentTime = oldTime;
            }
            newHistory[hIdx] = { ...newHistory[hIdx], epName, epUrl, currentTime, duration }
            const [item] = newHistory.splice(hIdx, 1)
            newHistory.unshift(item)
          }

          const newFavs = [...state.favoriteData]
          const fIdx = newFavs.findIndex(v => String(v.videoId) === String(videoId) && String(v._sourceId) === String(sourceId))
          if (fIdx !== -1) {
            const oldFavTime = newFavs[fIdx].currentTime || 0;
            if (currentTime < 5 && oldFavTime > currentTime + 10 && newFavs[fIdx].epUrl === epUrl) {
               currentTime = oldFavTime;
            }
            newFavs[fIdx] = { ...newFavs[fIdx], epName, epUrl, currentTime, duration }
          }
          
          return { historyData: newHistory, favoriteData: newFavs }
        })
      },
      setFavoriteData: (data) => set({ favoriteData: data }),
      setHomeFeedList: (data) => set({ homeFeedList: data }),
      addSearchHistory: (term, mode) => set(state => {
         const filtered = state.searchHistory.filter(h => !(h.term === term && h.mode === mode))
         filtered.unshift({ term, mode, timestamp: Date.now() })
         return { searchHistory: filtered.slice(0, 50) } // keep last 50
      }),
      clearSearchHistory: (mode) => set(state => ({
         searchHistory: state.searchHistory.filter(h => h.mode !== mode)
      })),
      categoriesCache: {},
      setCategoriesCache: (sourceId, cats) => set(state => ({ categoriesCache: { ...state.categoriesCache, [sourceId]: cats } })),
      clearCache: () => set({ historyData: [], favoriteData: [], homeFeedList: [], searchHistory: [], categoriesCache: {} })
    }),
    {
      name: 'fantv-storage',
      partialize: (state) => ({
        currentMode: state.currentMode,
        allowAdultMode: state.allowAdultMode,
        selectedSourceGlobal: state.selectedSourceGlobal,
        enableShortcuts: state.enableShortcuts,
        enableAdBlock: state.enableAdBlock,
        theme: state.theme,
        speedTestPlayback: state.speedTestPlayback,
        doubanDataProxy: state.doubanDataProxy,
        doubanImageProxy: state.doubanImageProxy,
        historyData: state.historyData,
        favoriteData: state.favoriteData,
        searchHistory: state.searchHistory,
        userSourceOrder: state.userSourceOrder,
        userDisabledSources: state.userDisabledSources,
        activeStaticChannel: state.activeStaticChannel,
        activeStaticSubCat: state.activeStaticSubCat,
        doubanTag: state.doubanTag,
        doubanSubcat: state.doubanSubcat,
        doubanGenre: state.doubanGenre,
        doubanCountry: state.doubanCountry,
        doubanYear: state.doubanYear,
        doubanSort: state.doubanSort,
        targetSearchSource: state.targetSearchSource,
        drillDownCustomApiUrl: state.drillDownCustomApiUrl,
        drillDownCategoryId: state.drillDownCategoryId
      }),
    }
  )
)
