import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppMode = 'General' | 'Adult'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface User {
  id: string;
  username: string;
  role: string;
  allowAdultMode: boolean;
  sourceOrder: string | null;
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
  [key: string]: any // allow MacCMS native keys like vod_id, vod_name
}

interface AppState {
  currentMode: AppMode
  allowAdultMode: boolean
  searchAllSources: boolean
  selectedSourceGlobal: string
  enableShortcuts: boolean
  enableAdBlock: boolean
  theme: ThemeMode

  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  fetchCurrentUser: () => Promise<{ user: any, config: any }>

  siteConfig: any
  setSiteConfig: (config: any) => void
  
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

  historyData: VideoItem[]
  favoriteData: VideoItem[]
  homeFeedList: VideoItem[]

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
      
      siteConfig: null,
      setSiteConfig: (config) => set({ siteConfig: config }),

      currentUser: null,
      setCurrentUser: (user) => {
        set({ currentUser: user })
        if (user) {
           set({ allowAdultMode: user.allowAdultMode })
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
                 siteLogo: data.config.siteLogo
             }})
          }
          if (data.user) {
             set({ allowAdultMode: data.user.allowAdultMode })
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
      clearCache: () => set({ historyData: [], favoriteData: [], homeFeedList: [] })
    }),
    {
      name: 'fantv-storage',
      partialize: (state) => ({
        currentMode: state.currentMode,
        searchAllSources: state.searchAllSources,
        allowAdultMode: state.allowAdultMode,
        selectedSourceGlobal: state.selectedSourceGlobal,
        enableShortcuts: state.enableShortcuts,
        enableAdBlock: state.enableAdBlock,
        theme: state.theme,
        historyData: state.historyData,
        favoriteData: state.favoriteData,
        userSourceOrder: state.userSourceOrder
      }),
    }
  )
)
