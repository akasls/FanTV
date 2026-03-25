'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import Link from 'next/link'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setCurrentUser } = useAppStore()

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
      </div>
    </div>
  )
}
