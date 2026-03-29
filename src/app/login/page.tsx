'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import Link from 'next/link'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setCurrentUser, theme, setTheme } = useAppStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || '登录失败')
      
      setCurrentUser(data)

      try {
        const syncRes = await fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pull' })
        })
        if (syncRes.ok) {
          const cloudData = await syncRes.json()
          useAppStore.getState().setHistoryData(cloudData.historyData || [])
          useAppStore.getState().setFavoriteData(cloudData.favoriteData || [])
          if (cloudData.sourceOrder) useAppStore.getState().setUserSourceOrder(cloudData.sourceOrder)
        }
      } catch (err) {}

      router.push('/')
      router.refresh()
    } catch(err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center -mt-16 px-4 relative z-10">
      <div className="w-full max-w-sm p-8 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-gray-100/50 dark:border-gray-800/50">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-500 tracking-tight">FanTv</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-3">欢迎回来，即刻登录</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-2xl text-center font-medium">{error}</div>}
          
          <div>
            <input 
              type="text" 
              placeholder="账号" 
              className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-[#2c2c2e] focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all placeholder:text-gray-400 dark:text-white"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="密码" 
              className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-[#2c2c2e] focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all placeholder:text-gray-400 dark:text-white"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 text-white font-bold tracking-wide rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 focus:ring-4 focus:ring-blue-500/30 transition-all shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? '正在验证...' : '登 录'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          还没有账号？ 
          <Link href="/register" className="text-blue-600 dark:text-blue-400 font-bold hover:underline ml-1">前往注册</Link>
        </div>

        <div className="flex items-center justify-center space-x-6 mt-10 text-gray-400 dark:text-gray-500">
          <button
            onClick={() => {
              if (theme === "system") setTheme("light");
              else if (theme === "light") setTheme("dark");
              else setTheme("system");
            }}
            className="hover:text-blue-500 hover:scale-110 transition-all focus:outline-none"
            title="切换主题"
          >
            {theme === "light" && <SunIcon className="w-6 h-6" />}
            {theme === "dark" && <MoonIcon className="w-6 h-6" />}
            {theme === "system" && <ComputerDesktopIcon className="w-6 h-6" />}
          </button>
          
          <a
            href="https://github.com/akasls/FanTV"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-900 dark:hover:text-white hover:scale-110 transition-all focus:outline-none"
            title="查看源码"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
