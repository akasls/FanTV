'use client'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const { currentMode, setMode, setAllowAdultMode, searchAllSources, setSearchAllSources, setFavoriteData, setHistoryData, theme, setTheme, enableAdBlock, setEnableAdBlock, enableShortcuts, setEnableShortcuts, currentUser, historyData, favoriteData, userSourceOrder, setUserSourceOrder, setCurrentUser } = useAppStore()
  
  const isAdmin = currentUser?.role === 'ADMIN'
  const [allowRegistration, setAllowRegistration] = useState(false)
  const [allowGuestAccess, setAllowGuestAccess] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/system-settings').then(res => res.json()).then(data => {
        if (data && typeof data.allowRegistration === 'boolean') {
          setAllowRegistration(data.allowRegistration)
        }
        if (data && typeof data.allowGuestAccess === 'boolean') {
          setAllowGuestAccess(data.allowGuestAccess)
        }
      })
    }
  }, [isAdmin])

  const toggleRegistration = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.checked
    setAllowRegistration(nextVal)
    await fetch('/api/system-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowRegistration: nextVal })
    })
  }

  const toggleGuestAccess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.checked
    setAllowGuestAccess(nextVal)
    await fetch('/api/system-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowGuestAccess: nextVal })
    })
  }

  const handleSyncData = async (e: React.MouseEvent<HTMLButtonElement>) => {
     if (!currentUser) {
        router.push('/login')
        return
     }
     setSyncing(true)
     const btn = e.currentTarget
     const oldText = btn.innerText
     btn.innerText = '同步中...'
     try {
       if (historyData.length === 0 && favoriteData.length === 0 && userSourceOrder.length === 0) {
          const res = await fetch('/api/users/sync', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ action: 'pull' })
          })
          const data = await res.json()
          if (data.historyData) setHistoryData(data.historyData)
          if (data.favoriteData) setFavoriteData(data.favoriteData)
          if (data.sourceOrder) setUserSourceOrder(data.sourceOrder)
       }
       
       await fetch('/api/users/sync', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ action: 'upsert', historyData, favoriteData, sourceOrder: userSourceOrder })
       })
       
       btn.innerText = '同步完成!'
       btn.className = "whitespace-nowrap flex-shrink-0 text-sm font-medium text-white px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all shadow-md"
       setTimeout(() => { 
          btn.innerText = '立即同步'
          btn.className = "whitespace-nowrap flex-shrink-0 text-sm font-medium text-white px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 rounded-full transition-all shadow-md hover:shadow-lg"
       }, 2500)
     } catch (err) {
       btn.innerText = '失败'
       setTimeout(() => { btn.innerText = oldText }, 2000)
     }
     setSyncing(false)
  }

  const handleLogout = async () => {
     await fetch('/api/auth/logout', { method: 'POST' })
     setCurrentUser(null)
     setHistoryData([])
     setFavoriteData([])
     router.push('/login')
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">设置中心</h1>
      </header>

      {/* 通用 (General) */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 ml-2 mb-2">通用</h2>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800/80 divide-y divide-gray-100 dark:divide-gray-800/80">
          {currentUser?.allowAdultMode && (
          <div className="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <h3 className="font-medium">圣贤模式</h3>
              <p className="text-sm text-gray-500 mt-0.5">未成年人请勿开启此选项</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={currentMode === 'Adult'}
                onChange={(e) => {
                  const isAdult = e.target.checked
                  setAllowAdultMode(isAdult) // ensure background logic works
                  setMode(isAdult ? 'Adult' : 'General')
                }}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500"></div>
            </label>
          </div>
          )}
          
          <div className="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <h3 className="font-medium">跨源搜索</h3>
              <p className="text-sm text-gray-500 mt-0.5">跨越当前源站搜索所有可用源</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={searchAllSources}
                onChange={(e) => setSearchAllSources(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 md:p-6 md:hidden hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <h3 className="font-medium">外观主题</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {theme === 'system' ? '跟随系统' : theme === 'light' ? '日间模式' : '夜间模式'}
              </p>
            </div>
            <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
               <button onClick={() => setTheme('light')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${theme === 'light' ? 'bg-white dark:bg-gray-700 shadow-sm text-amber-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>日间</button>
               <button onClick={() => setTheme('dark')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>黑夜</button>
               <button onClick={() => setTheme('system')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${theme === 'system' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-gray-200' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>自适应</button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <h3 className="font-medium">去除切片广告</h3>
              <p className="text-sm text-gray-500 mt-0.5">实验性功能：开启去除切片广告</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={enableAdBlock}
                onChange={(e) => setEnableAdBlock(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <h3 className="font-medium">快捷播放控制</h3>
              <p className="text-sm text-gray-500 mt-0.5">支持全局键盘快捷键和手机触摸滑动控制体验</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={enableShortcuts}
                onChange={(e) => setEnableShortcuts(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 管理 (Management) */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 ml-2 mb-2">管理</h2>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800/80 divide-y divide-gray-100 dark:divide-gray-800/80">
          
          {isAdmin && (
            <>
              <div className="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div>
                  <h3 className="font-medium">开放注册</h3>
                  <p className="text-sm text-gray-500 mt-0.5">是否允许用户自助注册</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={allowRegistration}
                    onChange={toggleRegistration}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div>
                  <h3 className="font-medium">访客访问</h3>
                  <p className="text-sm text-gray-500 mt-0.5">是否允许免登录使用普通源</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={allowGuestAccess}
                    onChange={toggleGuestAccess}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>

              <Link href="/settings/users" className="flex items-center justify-between p-4 md:p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div>
                  <h3 className="font-medium">用户管理</h3>
                  <p className="text-sm text-gray-500 mt-0.5">新增、编辑、停用、修改用户</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link href="/settings/site" className="flex items-center justify-between p-4 md:p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-t border-gray-100 dark:border-gray-800/80">
                <div>
                  <h3 className="font-medium">网站信息</h3>
                  <p className="text-sm text-gray-500 mt-0.5">修改网站名称、介绍、图标等</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          )}
          <Link href="/settings/sources" className="flex items-center justify-between p-4 md:p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <h3 className="font-medium">源站接口</h3>
              <p className="text-sm text-gray-500 mt-0.5">管理苹果CMS接口(JSON API)</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* 历史 (History) */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 ml-2 mb-2">历史记录与数据</h2>
        <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800/80 divide-y divide-gray-100 dark:divide-gray-800/80">
          
          {/* Cloud Sync Controller */}
          <div className="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors bg-gradient-to-r from-transparent to-blue-50/50 dark:to-blue-900/10">
            <div>
              <h3 className="font-bold flex items-center space-x-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-500">云端同步</span>
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">备份并持久化合并当前设备的收藏夹和播放历史</p>
            </div>
            <button 
              disabled={syncing}
              onClick={handleSyncData}
              className="whitespace-nowrap flex-shrink-0 text-sm font-medium text-white px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 rounded-full transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {currentUser ? '立即同步' : '登录并同步'}
            </button>
          </div>

          {/* Clear Favorites */}
          <div className="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">清空收藏</h3>
              <p className="text-sm text-gray-500 mt-0.5">清空所有的收藏记录</p>
            </div>
            <button 
              onClick={async (e) => {
                setFavoriteData([])
                if (currentUser) {
                  await fetch('/api/users/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'wipe_favorites' }) })
                }
                const target = e.currentTarget
                const oldText = target.innerText
                target.innerText = '已清空!'
                setTimeout(() => { target.innerText = oldText }, 2000)
              }}
              className="text-sm font-medium text-red-500 px-4 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-full transition-colors"
            >
              清空
            </button>
          </div>

          {/* Clear History */}
          <div className="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">清空历史</h3>
              <p className="text-sm text-gray-500 mt-0.5">清除所有的播放记录</p>
            </div>
            <button 
              onClick={async (e) => {
                setHistoryData([])
                if (currentUser) {
                  await fetch('/api/users/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'wipe_history' }) })
                }
                const target = e.currentTarget
                const oldText = target.innerText
                target.innerText = '已清空!'
                setTimeout(() => { target.innerText = oldText }, 2000)
              }}
              className="text-sm font-medium text-red-500 px-4 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-full transition-colors"
            >
              清空
            </button>
          </div>

          {/* Clear Cache */}
          <div className="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">清空缓存</h3>
              <p className="text-sm text-gray-500 mt-0.5">彻底清空设备上的应用偏好与状态</p>
            </div>
            <button 
              onClick={(e) => {
                localStorage.removeItem('fantv-storage');
                const target = e.currentTarget
                target.innerText = '重启中...'
                setTimeout(() => { window.location.reload() }, 500)
              }}
              className="text-sm font-medium text-red-500 px-4 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-full transition-colors"
            >
              清空
            </button>
          </div>

          {currentUser && (
            <div className="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-t border-gray-100 dark:border-gray-800/80">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-gray-200">退出账户</h3>
                <p className="text-sm text-gray-500 mt-0.5">切断当前会话并擦除授权凭证</p>
              </div>
              <button 
                onClick={handleLogout}
                className="text-sm font-medium text-red-500 px-4 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-full transition-colors"
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
