'use client'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ArrowLeftIcon, PlusIcon, TrashIcon, PencilIcon, ChevronUpIcon, ChevronDownIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface Source {
  id: string
  name: string
  apiUrl: string
  mode: string
  isActive: boolean
  order: number
}

export default function SourcesManager() {
  const { currentMode, currentUser, userSourceOrder, setUserSourceOrder, userDisabledSources, setUserDisabledSources } = useAppStore()
  const isAdmin = currentUser?.role === 'ADMIN'
  const canSeeAdult = currentUser?.allowAdultMode === true
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  
  // form state
  const [showAdd, setShowAdd] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState('')
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newMode, setNewMode] = useState('General')
  const [filterMode, setFilterMode] = useState('All')
  
  const fetchSources = async () => {
    setLoading(true)
    const res = await fetch('/api/sources')
    if (res.ok) {
      const rawSources = await res.json()
      if (userSourceOrder && userSourceOrder.length > 0) {
        rawSources.sort((a: Source, b: Source) => {
          const aIdx = userSourceOrder.indexOf(a.id)
          const bIdx = userSourceOrder.indexOf(b.id)
          if (aIdx === -1 && bIdx === -1) return a.order - b.order
          if (aIdx === -1) return 1
          if (bIdx === -1) return -1
          return aIdx - bIdx
        })
      }
      setSources(rawSources)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSources()
  }, [])

  const resetForm = () => {
    setNewName('')
    setNewUrl('')
    setNewMode(currentMode)
    setEditId('')
    setIsEditing(false)
    setShowAdd(false)
  }

  const handleEditClick = (s: Source) => {
    setNewName(s.name)
    setNewUrl(s.apiUrl)
    setNewMode(s.mode)
    setEditId(s.id)
    setIsEditing(true)
    setShowAdd(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newUrl) return
    
    if (isEditing) {
      await fetch('/api/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, name: newName, apiUrl: newUrl, mode: newMode })
      })
    } else {
      await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, apiUrl: newUrl, mode: newMode })
      })
    }
    resetForm()
    fetchSources()
  }

  const handleReorder = async (source: Source, direction: 'up'|'down', index: number) => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === sources.length - 1) return
    
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    
    // Swap linearly
    const newSources = [...sources]
    const temp = newSources[index]
    newSources[index] = newSources[targetIdx]
    newSources[targetIdx] = temp
    
    setSources(newSources)

    if (!isAdmin) {
      setUserSourceOrder(newSources.map(s => s.id))
      return
    }
    
    // Force aggressive chronological indexing to permanently resolve zeroed/duplicate sequences
    newSources.forEach((s, idx) => s.order = idx + 1)
    
    // Execute bulk synchronization
    await Promise.all(
      newSources.map(s => fetch('/api/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, order: s.order })
      }))
    )
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除 ${name} 吗？`)) return
    await fetch(`/api/sources?id=${id}`, { method: 'DELETE' })
    fetchSources()
  }

  const handleExport = () => {
    const dataToExport = {
      General: sources.filter(s => s.mode === 'General').map(s => ({ name: s.name, apiUrl: s.apiUrl })),
      Adult: sources.filter(s => s.mode === 'Adult').map(s => ({ name: s.name, apiUrl: s.apiUrl }))
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "fantv_sources.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        let importedCount = 0
        setLoading(true)
        
        if (Array.isArray(data)) {
           for (const src of data) {
              if (src.name && src.apiUrl && src.mode) {
                 await fetch('/api/sources', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: src.name, apiUrl: src.apiUrl, mode: src.mode })
                 })
                 importedCount++
              }
           }
        } else {
           for (const mode of ['General', 'Adult']) {
             if (Array.isArray(data[mode])) {
               for (const src of data[mode]) {
                 if (src.name && src.apiUrl) {
                   await fetch('/api/sources', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: src.name, apiUrl: src.apiUrl, mode })
                   })
                   importedCount++
                 }
               }
             }
           }
        }
        alert(`成功导入 ${importedCount} 个源站！`)
        fetchSources()
      } catch (err) {
        alert("导入解析失败，请检查文件格式是否为有效的JSON")
      } finally {
        setLoading(false)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center">
          <Link href="/settings" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition">
            <ArrowLeftIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </Link>
          <span className="ml-1 text-lg font-bold text-gray-800 dark:text-gray-200">源站管理</span>
        </div>
        <div className="flex items-center space-x-3 md:space-x-4">
          {isAdmin && (
            <>
              <input type="file" id="import-json" accept=".json" className="hidden" onChange={handleImportFile} />
              <button 
                onClick={() => document.getElementById('import-json')?.click()} 
                title="导入数据"
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400"
               >
                <ArrowUpTrayIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={handleExport} 
                title="导出数据"
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => { if(!showAdd) resetForm(); setShowAdd(!showAdd) }}
                title="添加源站"
                className="p-2 -mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400"
              >
                <PlusIcon className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
          <h2 className="text-lg font-medium hidden sm:block">当前源列表</h2>
          
          <div className="flex bg-[#7d7d7d1f] p-1 rounded-xl self-start sm:self-auto">
             <button 
               className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${filterMode === 'All' ? 'bg-white shadow-sm dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`} 
               onClick={() => setFilterMode('All')}
             >所有源</button>
             <button 
               className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${filterMode === 'General' ? 'bg-white shadow-sm dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`} 
               onClick={() => setFilterMode('General')}
             >普通源</button>
             {canSeeAdult && (
             <button 
               className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${filterMode === 'Adult' ? 'bg-white shadow-sm dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`} 
               onClick={() => setFilterMode('Adult')}
             >圣贤源</button>
             )}
          </div>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1c1c1e] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">源名称 (如: 极速资源)</label>
            <input 
              required
              value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500"
              placeholder="自定义名称"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Apple CMS JSON API</label>
            <input 
              required
              type="url"
              value={newUrl} onChange={e => setNewUrl(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500"
              placeholder="https://api.example.com/api.php/provide/vod/"
            />
          </div>
           <div className="flex space-x-4">
             <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input type="radio" checked={newMode === 'General'} onChange={() => setNewMode('General')} />
                <span>普通源</span>
             </label>
             {canSeeAdult && (
             <label className="flex items-center space-x-2 text-sm text-red-500 cursor-pointer">
                <input type="radio" checked={newMode === 'Adult'} onChange={() => setNewMode('Adult')} />
                <span>圣贤源</span>
             </label>
             )}
           </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={resetForm} className="px-4 py-1.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">取消</button>
            <button type="submit" className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm">{isEditing ? '保存' : '确认添加'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm text-center py-10">加载中...</p>
      ) : sources.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
          <p className="text-gray-500">该模式下暂无可用源</p>
          <button onClick={() => setShowAdd(true)} className="text-blue-500 text-sm mt-2">马上添加</button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sources.filter(s => {
             if (s.mode === 'Adult' && !canSeeAdult) return false;
             return filterMode === 'All' || s.mode === filterMode;
          }).map((src, idx) => (
            <li key={src.id} className="bg-white dark:bg-[#1c1c1e] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/80 flex items-center group transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex flex-col mr-2 space-y-1">
                <button 
                  disabled={idx === 0}
                  onClick={() => handleReorder(src, 'up', idx)}
                  className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-30 transition"
                >
                  <ChevronUpIcon className="w-4 h-4" />
                </button>
                <button 
                  disabled={idx === sources.length - 1}
                  onClick={() => handleReorder(src, 'down', idx)}
                  className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-30 transition"
                >
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col flex-1 overflow-hidden mr-4">
                <span className={`font-medium flex items-center space-x-2 ${userDisabledSources.includes(src.id) ? 'opacity-40 line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                  <span>{src.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${src.mode === 'Adult' ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-500/10' : 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10'}`}>
                    {src.mode === 'Adult' ? '圣贤' : '普通'}
                  </span>
                </span>
                <span className="text-xs text-gray-400 mt-1 truncate">{src.apiUrl}</span>
              </div>

              <div className="flex space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition mr-2">
                <button 
                  onClick={() => {
                     if (userDisabledSources.includes(src.id)) setUserDisabledSources(userDisabledSources.filter(id => id !== src.id));
                     else setUserDisabledSources([...userDisabledSources, src.id]);
                  }}
                  className={`p-2 rounded-full transition ${userDisabledSources.includes(src.id) ? 'text-gray-400 bg-gray-100 dark:bg-gray-800' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10'}`}
                  title={userDisabledSources.includes(src.id) ? '点击启用' : '点击停用'}
                >
                  {userDisabledSources.includes(src.id) ? <EyeSlashIcon className="w-5 h-5 text-red-400" /> : <EyeIcon className="w-5 h-5" />}
                </button>
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => handleEditClick(src)}
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-full transition"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(src.id, src.name)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
