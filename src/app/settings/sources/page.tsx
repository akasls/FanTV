'use client'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ArrowLeftIcon, PlusIcon, TrashIcon, PencilIcon, ChevronUpIcon, ChevronDownIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, EyeIcon, EyeSlashIcon, BoltIcon } from '@heroicons/react/24/outline'
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
  const { 
    currentMode, currentUser, userSourceOrder, setUserSourceOrder, userDisabledSources, setUserDisabledSources,
    siteConfig
  } = useAppStore()
  const isAdmin = currentUser?.role === 'ADMIN'
  const canSeeAdult = currentUser?.allowAdultMode === true
  const [localDramaUrl, setLocalDramaUrl] = useState("")
  const [localDramaCats, setLocalDramaCats] = useState<{name: string, url: string}[]>([])
  const [isDramaSaving, setIsDramaSaving] = useState(false)
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

  const [isSpeedTestingAll, setIsSpeedTestingAll] = useState(false)
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null)
  const [testingIndex, setTestingIndex] = useState(0)

  const handleSpeedTestAndSort = async () => {
    if (isSpeedTestingAll) return;
    if (!confirm('这将会自动拉取所有站点的影片进行下载速度测试并重新排序（可能需要数秒至数十秒）。确认继续吗？')) return;
    
    setIsSpeedTestingAll(true);
    setTestingIndex(0);
    
    try {
      const currentSources = [...sources];
      const results: {src: Source, score: number}[] = [];
      const getBestM3u8List = (vodPlayFrom?: string, vodPlayUrl?: string): string | null => {
        if (!vodPlayUrl) return null;
        const froms = vodPlayFrom ? vodPlayFrom.split("$$$") : [];
        const urls = vodPlayUrl.split("$$$");
        for (let i = 0; i < froms.length; i++) {
          if (froms[i].toLowerCase().includes("m3u8")) {
            if (urls[i]) return urls[i];
          }
        }
        for (let i = 0; i < urls.length; i++) {
          if (urls[i] && urls[i].includes(".m3u8")) return urls[i];
        }
        return urls.length > 0 ? urls[0] : null;
      };

      let activeCount = 0;
      for (const src of currentSources) {
         if (!src.isActive) {
            results.push({ src, score: -99999 });
            continue;
         }
         
         activeCount++;
         setTestingIndex(activeCount);
         setTestingSourceId(src.id);
         
         try {
            const vRes = await fetch(`/api/videos?sourceId=${src.id}&pg=1`);
            const vData = await vRes.json();
            const firstVideo = vData.list?.[0];
            if (!firstVideo || (!firstVideo.vod_play_url && !firstVideo.vod_pic)) {
               results.push({ src, score: -99998 });
               continue;
            }

            let urlToTest = '';
            if (firstVideo.vod_play_url) {
               const playSync = getBestM3u8List(firstVideo.vod_play_from, firstVideo.vod_play_url);
               if (playSync) {
                  const firstEp = playSync.split("#")[0].split("$");
                  if (firstEp[1]) urlToTest = firstEp[1];
               }
            } else if (firstVideo.vod_pic) {
               urlToTest = firstVideo.vod_pic;
            }
            
            if (!urlToTest) {
               results.push({ src, score: -99998 });
               continue;
            }

            const startInit = performance.now();
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000); 
            
            let finalScore = -50000;
            try {
              const res = await fetch(urlToTest, { signal: controller.signal });
              const latency = Math.round(performance.now() - startInit);
              const text = await res.text();
              
              let nextUrl = urlToTest;
              const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
              if (lines.length > 0) {
                 let n1 = lines[0].trim();
                 nextUrl = n1.startsWith('http') ? n1 : new URL(n1, urlToTest).href;
              }
              
              if (nextUrl.includes('.m3u8')) {
                 const res2 = await fetch(nextUrl, { signal: controller.signal });
                 const text2 = await res2.text();
                 const lines2 = text2.split('\n').filter(l => l.trim() && !l.startsWith('#'));
                 if (lines2.length > 0) {
                     let n2 = lines2[0].trim();
                     nextUrl = n2.startsWith('http') ? n2 : new URL(n2, nextUrl).href;
                 }
              }

              const tsRes = await fetch(nextUrl, { signal: controller.signal });
              let receivedLength = 0;
              if (tsRes.body) {
                  const reader = tsRes.body.getReader();
                  const streamStart = performance.now();
                  try {
                      while(true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          if (value) receivedLength += value.length;
                          // Read up to 512KB
                          if (receivedLength > 512 * 1024) {
                              reader.cancel().catch(() => {});
                              break;
                          }
                      }
                  } catch(e) {}
                  const streamEnd = performance.now();
                  const streamDuration = (streamEnd - streamStart) / 1000;
                  const speedKbps = receivedLength > 0 && streamDuration > 0 ? (receivedLength / 1024) / streamDuration : 0;
                  
                  // Sort Score = speed * 10 - latency
                  finalScore = Math.round((speedKbps * 10) - latency);
              } else {
                  throw new Error('No body stream');
              }
            } catch(e) {
               // Fallback: ping only via HEAD no-cors
               const fallbackStart = performance.now();
               await fetch(urlToTest, { method: "HEAD", mode: "no-cors", signal: controller.signal }).catch(() => null);
               const latency = Math.round(performance.now() - fallbackStart);
               finalScore = -latency;
            }
            clearTimeout(timeout);
            results.push({ src, score: finalScore });

         } catch(e) {
            results.push({ src, score: -99999 });
         }
      }

      results.sort((a, b) => b.score - a.score);
      const sortedSources = results.map(r => r.src);
      
      setSources(sortedSources);
      if (!isAdmin) {
        useAppStore.getState().setUserSourceOrder(sortedSources.map(s => s.id));
      } else {
        sortedSources.forEach((s, idx) => s.order = idx + 1);
        await Promise.all(
          sortedSources.map(s => fetch('/api/sources', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: s.id, order: s.order })
          }))
        );
        useAppStore.getState().setUserSourceOrder([]);
      }
      alert('测速排序完成!');
    } finally {
      setIsSpeedTestingAll(false);
      setTestingSourceId(null);
    }
  }

  const handleSaveDramaUrl = async () => {
    setIsDramaSaving(true)
    try {
      if (currentUser?.role === 'ADMIN') {
        const res = await fetch('/api/system-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            shortDramaApiUrl: localDramaUrl, 
            shortDramaCategories: JSON.stringify(localDramaCats)
          })
        })
        if (res.ok) {
           useAppStore.setState({ siteConfig: { ...siteConfig, shortDramaApiUrl: localDramaUrl, shortDramaCategories: JSON.stringify(localDramaCats) } as any })
        }
      }
    } finally {
      setIsDramaSaving(false)
    }
  }

  useEffect(() => {
    fetchSources()
  }, [])

  useEffect(() => {
    if (siteConfig) {
      if (siteConfig.shortDramaApiUrl) setLocalDramaUrl(siteConfig.shortDramaApiUrl)
      if ((siteConfig as any).shortDramaCategories) {
        try {
          setLocalDramaCats(JSON.parse((siteConfig as any).shortDramaCategories))
        } catch(e) {}
      }
    }
  }, [siteConfig])

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
    setUserSourceOrder([]);
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除 ${name} 吗？`)) return
    await fetch(`/api/sources?id=${id}`, { method: 'DELETE' })
    fetchSources()
  }

  const handleExport = () => {
    const dataToExport = {
      General: sources.filter(s => s.mode === 'General').map(s => ({ name: s.name, apiUrl: s.apiUrl })),
      Adult: sources.filter(s => s.mode === 'Adult').map(s => ({ name: s.name, apiUrl: s.apiUrl })),
      Config: {
        shortDramaApiUrl: localDramaUrl,
        shortDramaCategories: JSON.stringify(localDramaCats)
      }
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
        
        const existingUrls = new Set(sources.map((s: Source) => s.apiUrl))
        if (Array.isArray(data)) {
           for (const src of data) {
              if (src.name && src.apiUrl && src.mode && !existingUrls.has(src.apiUrl)) {
                 existingUrls.add(src.apiUrl)
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
                 if (src.name && src.apiUrl && !existingUrls.has(src.apiUrl)) {
                   existingUrls.add(src.apiUrl)
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
            
            if (data.Config) {
              const { shortDramaApiUrl, shortDramaCategories } = data.Config;
              if (shortDramaApiUrl !== undefined || shortDramaCategories !== undefined) {
                 await fetch('/api/system-settings', {
                   method: 'PUT',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ shortDramaApiUrl, shortDramaCategories })
                 });
                 const currentConfig = useAppStore.getState().siteConfig || {};
                 useAppStore.setState({ siteConfig: { ...currentConfig, shortDramaApiUrl, shortDramaCategories } as any });
                 if (shortDramaApiUrl !== undefined) setLocalDramaUrl(shortDramaApiUrl || "");
                 if (shortDramaCategories) {
                    try { setLocalDramaCats(JSON.parse(shortDramaCategories)); } catch(e){}
                 }
              }
            }
        }
        alert(`成功导入 ${importedCount} 个源站及相关配置！`)
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
    <>
      {isSpeedTestingAll && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[24px] shadow-2xl flex flex-col items-center w-full max-w-sm mx-4 transform animate-in zoom-in-95 duration-300">
             <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
                <BoltIcon className="w-8 h-8 text-blue-500 animate-pulse" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">正在测速排序中</h3>
             <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6 w-full px-4 leading-relaxed">
               自动拉取节点分片并测试真实下载带宽...<br/>这可能需要数十秒的时间，请勿关闭页面
             </p>
             <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-4 overflow-hidden shadow-inner">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-300 relative overflow-hidden" 
                     style={{ width: `${Math.round(((testingIndex) / Math.max(1, sources.filter(s => s.isActive).length)) * 100)}%` }}>
                   <div className="absolute inset-x-0 top-0 bottom-0 bg-white/20 w-full animate-[shimmer_1s_infinite] -skew-x-12 transform scale-x-150"></div>
                </div>
             </div>
             <div className="text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center justify-between w-full px-2">
               <span className="truncate max-w-[150px]">{testingSourceId ? sources.find(s => s.id === testingSourceId)?.name : '初始化...'}</span>
               <span>{testingIndex} / {sources.filter(s => s.isActive).length}</span>
             </div>
          </div>
        </div>
      )}
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center">
          <Link href="/settings" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition">
            <ArrowLeftIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </Link>
          <span className="ml-1 text-lg font-bold text-gray-800 dark:text-gray-200">源站管理</span>
        </div>
        <div className="flex items-center space-x-3 md:space-x-4">
          <button 
            onClick={handleSpeedTestAndSort} 
            disabled={isSpeedTestingAll}
            title="一键测速排序"
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 disabled:opacity-50"
           >
            <BoltIcon className={`w-5 h-5 ${isSpeedTestingAll ? 'text-blue-500' : ''}`} />
          </button>
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
        <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
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
            <li key={src.id} className="bg-white dark:bg-white/5 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/80 flex items-center group transition hover:-translate-y-0.5 hover:shadow-md">
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
                <span className={`font-medium flex items-center space-x-2 ${userDisabledSources.includes(src.id) || !src.isActive ? 'opacity-40 line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                  <span>{src.name} {!src.isActive && !src.name.includes('(无法提取m3u8地址)') ? ' (全域禁用)' : ''}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${src.mode === 'Adult' ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-500/10' : 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10'}`}>
                    {src.mode === 'Adult' ? '圣贤' : '普通'}
                  </span>
                </span>
                <span className="text-xs text-gray-400 mt-1 truncate">{src.apiUrl}</span>
              </div>

              <div className="flex space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition mr-2">
                <button 
                  onClick={() => {
                     if (!src.isActive) {
                         alert("该源被安全系统全局封禁，无法通过此处启用。如果要恢复，请删除后重新添加源。");
                         return;
                     }
                     if (userDisabledSources.includes(src.id)) setUserDisabledSources(userDisabledSources.filter(id => id !== src.id));
                     else setUserDisabledSources([...userDisabledSources, src.id]);
                  }}
                  className={`p-2 rounded-full transition ${userDisabledSources.includes(src.id) || !src.isActive ? 'text-gray-400 bg-gray-100 dark:bg-gray-800' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10'}`}
                  title={!src.isActive ? '系统彻底封禁' : userDisabledSources.includes(src.id) ? '点击启用' : '点击停用'}
                >
                  {userDisabledSources.includes(src.id) || !src.isActive ? <EyeSlashIcon className="w-5 h-5 text-red-400" /> : <EyeIcon className="w-5 h-5" />}
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

      {/* Short Drama Configuration Section */}
      {isAdmin && (
      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-medium mb-4">短剧接口及分类配置</h2>
        <div className="bg-white dark:bg-white/5 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">默认短剧接口地址</label>
            <p className="text-xs text-gray-500 mb-3">当首页点击&quot;短剧&quot;频道时，展示由此 API URL 提供的数据。如果不配置将不会在首页展示短剧模块。</p>
            <div className="flex gap-2">
              <input 
                value={localDramaUrl}
                onChange={(e) => setLocalDramaUrl(e.target.value)}
                placeholder="请输入短剧 API 接口完整的 URL (如 https://api.example.com/api.php/provide/vod)"
                className="flex-1 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500"
              />
              <button
                onClick={handleSaveDramaUrl}
                disabled={isDramaSaving}
                className="shrink-0 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isDramaSaving ? "保存中" : "保存"}
              </button>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">二级分类配置</label>
              <button
                onClick={() => setLocalDramaCats([...localDramaCats, { name: "", url: "" }])}
                className="text-xs flex items-center text-blue-500 hover:text-blue-600 font-medium"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                新增分类
              </button>
            </div>
            
            {localDramaCats.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 dark:bg-black/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                暂未配置短剧二级分类，点击右上角新增
              </div>
            ) : (
              <div className="space-y-3">
                {localDramaCats.map((cat, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input 
                      value={cat.name}
                      onChange={(e) => {
                        const newCats = [...localDramaCats];
                        newCats[idx].name = e.target.value;
                        setLocalDramaCats(newCats);
                      }}
                      placeholder="分类名称 (如: 甜宠)"
                      className="w-1/4 shrink-0 bg-white dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <input 
                      value={cat.url}
                      onChange={(e) => {
                        const newCats = [...localDramaCats];
                        newCats[idx].url = e.target.value;
                        setLocalDramaCats(newCats);
                      }}
                      placeholder="API URL (如: https://.../vod/?t=37)"
                      className="flex-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => {
                        const newCats = [...localDramaCats];
                        newCats.splice(idx, 1);
                        setLocalDramaCats(newCats);
                      }}
                      className="shrink-0 p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              * 分类名称将显示在首页短剧频道的二级菜单中。
              <br/>* 对应的 API URL 必须完整填写，包含目标站点的全路径与分类参数（例如 `?ac=videolist&t=37`），分页参数 `&pg=x` 会由核心流自动附加。
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
    </>
  )
}
