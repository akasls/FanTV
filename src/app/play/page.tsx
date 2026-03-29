'use client'
import DOMPurify from 'isomorphic-dompurify';
import { useEffect, useRef, Suspense, useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ArrowLeftIcon, 
  HeartIcon, 
  InformationCircleIcon,
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon, 
  ArrowsPointingOutIcon, 
  ArrowsPointingInIcon, 
  ForwardIcon,
  BackwardIcon,
  SunIcon,
  LockClosedIcon,
  LockOpenIcon,
  ListBulletIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid'
import { useAppStore } from '@/store/useAppStore'
import { SiteConfig } from '@/store/useAppStore'

export function getBestM3u8List(vodPlayFrom?: string, vodPlayUrl?: string): string | null {
  if (!vodPlayUrl) return null;
  
  const froms = vodPlayFrom ? vodPlayFrom.split("$$$") : [];
  const urls = vodPlayUrl.split("$$$");
  
  // Prioritize sources explicitly marked as m3u8
  for (let i = 0; i < froms.length; i++) {
    if (froms[i].toLowerCase().includes("m3u8")) {
      if (urls[i] && urls[i].includes(".m3u8")) return urls[i];
      if (urls[i]) return urls[i]; // Trust explicit source naming even if unstructured URL
    }
  }

  // Fallback to the first URL that implies m3u8 via extensions
  for (let i = 0; i < urls.length; i++) {
    if (urls[i] && urls[i].includes(".m3u8")) {
      return urls[i];
    }
  }

  // Ultimate Fallback: Just return the first available playlist layer (e.g. mp4 arrays)
  if (urls.length > 0 && urls[0].trim() !== "") {
     return urls[0];
  }

  // If literally empty, return null
  return null;
}

function formatTime(time: number) {
  if (isNaN(time) || !isFinite(time)) return '00:00'
  const m = Math.floor(time / 60)
  const s = Math.floor(time % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function PlayerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const epName = searchParams.get('epName')
  const rawUrl = searchParams.get('epUrl')
  const sourceId = searchParams.get('sourceId')
  const id = searchParams.get('id')
  
  const { currentMode, favoriteData, setFavoriteData } = useAppStore()
  
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const [video, setVideo] = useState<any>(null)
  const [episodes, setEpisodes] = useState<{name: string, url: string}[]>([])
  const [showInfo, setShowInfo] = useState(false)
  const [speedTestError, setSpeedTestError] = useState<string | null>(null)
  
  const [altSources, setAltSources] = useState<any[]>([])
  const [showAltSources, setShowAltSources] = useState(false)
  const [showSkipConfig, setShowSkipConfig] = useState(false)
  const [introSkip, setIntroSkip] = useState<number | string>(0)
  const [outroSkip, setOutroSkip] = useState<number | string>(0)
  const hasSkippedIntro = useRef(false)
  const hasSkippedOutro = useRef(false)

  useEffect(() => {
     try {
       const saved = localStorage.getItem('global_skip_config')
       if (saved) {
          const s = JSON.parse(saved)
          setIntroSkip(s.intro || 0)
          setOutroSkip(s.outro || 0)
       }
     } catch (e) {}
  }, [])

  useEffect(() => {
     hasSkippedIntro.current = false
     hasSkippedOutro.current = false
  }, [rawUrl])

  const [pingResults, setPingResults] = useState<Record<string, {ping: number, speed: number | null}>>({})
  const pingedRefs = useRef<Set<string>>(new Set())

  const formatSpeed = (kbps: number | null) => {
     if (!kbps) return ''
     if (kbps > 1024) return `${(kbps / 1024).toFixed(1)}MB/s`
     return `${Math.round(kbps)}KB/s`
  }

  useEffect(() => {
     if (showAltSources) {
        const sourcesToPing = [...altSources];
        if (video && sourceId) {
           sourcesToPing.push({ ...video, _sourceId: sourceId });
        }
        
        sourcesToPing.forEach(alt => {
           if (pingedRefs.current.has(alt._sourceId)) return;
           pingedRefs.current.add(alt._sourceId);
           
           try {
             let urlToTest = '';
             if (alt.vod_play_url) {
                const playListSync = getBestM3u8List(alt.vod_play_from, alt.vod_play_url);
                if (playListSync) {
                   const firstEp = playListSync.split('#')[0].split('$');
                   if (firstEp[1]) urlToTest = firstEp[1];
                }
             } else if (alt.vod_pic) {
                urlToTest = alt.vod_pic;
             }
             
             if (!urlToTest) return;
             
             const startInit = performance.now();
             const controller = new AbortController();
             const timeout = setTimeout(() => controller.abort(), 8000);
             
             (async () => {
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
                                 
                                 if (receivedLength > 512 * 1024) {
                                     reader.cancel().catch(() => {});
                                     break;
                                 }
                             }
                         } catch(e) {}
                         const streamEnd = performance.now();
                         const streamDuration = (streamEnd - streamStart) / 1000;
                         const speedKbps = receivedLength > 0 && streamDuration > 0 ? (receivedLength / 1024) / streamDuration : null;
                         
                         clearTimeout(timeout);
                         setPingResults(prev => ({ ...prev, [alt._sourceId]: { ping: latency, speed: speedKbps } }));
                     } else {
                         throw new Error('No body stream');
                     }
                     
                 } catch(err) {
                    const fallbackStart = performance.now();
                    fetch(urlToTest, { method: 'HEAD', mode: 'no-cors' })
                    .then(() => {
                       clearTimeout(timeout);
                       setPingResults(prev => ({ ...prev, [alt._sourceId]: { ping: Math.round(performance.now() - fallbackStart), speed: null } }));
                    })
                    .catch(() => {
                       clearTimeout(timeout);
                       setPingResults(prev => ({ ...prev, [alt._sourceId]: { ping: -1, speed: null } }));
                    });
                 }
             })();
           } catch(e) {}
        });
     }
  }, [altSources, showAltSources, video, sourceId])

  const sortedAltSources = useMemo(() => {
     return [...altSources].sort((a, b) => {
        const resA = pingResults[a._sourceId];
        const resB = pingResults[b._sourceId];
        
        const scoreA = resA ? (resA.ping === -1 ? -99999 : (resA.speed || 0) * 10 - resA.ping) : -50000;
        const scoreB = resB ? (resB.ping === -1 ? -99999 : (resB.speed || 0) * 10 - resB.ping) : -50000;
        
        return scoreB - scoreA;
     });
  }, [altSources, pingResults]);
  
  const bestSourceId = sortedAltSources.length > 0 && pingResults[sortedAltSources[0]._sourceId] && pingResults[sortedAltSources[0]._sourceId].ping !== -1 ? sortedAltSources[0]._sourceId : null;
  
  const isFavorite = favoriteData.some(v => v.videoId === String(id) && v._sourceId === sourceId)

  // Custom Player States
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isWebFullscreen, setIsWebFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isVerticalVideo, setIsVerticalVideo] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isManualWebFullscreen, setIsManualWebFullscreen] = useState(false)
  const [isPortrait, setIsPortrait] = useState(true)
  const [volumeDelta, setVolumeDelta] = useState<number | null>(null)
  const [brightnessDelta, setBrightnessDelta] = useState<number | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [showMobileEpisodes, setShowMobileEpisodes] = useState(false)

  const isAnyFullscreen = isFullscreen || isWebFullscreen || isManualWebFullscreen;

  const lastTimeRef = useRef(0)
  const lastDurRef = useRef(0)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const episodesContainerRef = useRef<HTMLDivElement>(null)

  // Web Fullscreen and Screen Lock
  useEffect(() => {
    const handleResize = () => {
      const portrait = typeof window !== 'undefined' ? window.matchMedia("(orientation: portrait)").matches : true
      setIsPortrait(portrait)
      
      const currentIsIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

      if (window.innerWidth < 1024 && !portrait && currentIsIOS) {
        setIsWebFullscreen(true)
      } else {
        setIsWebFullscreen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const shouldSimulateLandscape = Boolean(isManualWebFullscreen && isPortrait && !isVerticalVideo)

  const originalThemeColorsRef = useRef<{meta: Element, content: string, media?: string}[]>([])

  useEffect(() => {
    const isAnyFull = isFullscreen || isWebFullscreen || isManualWebFullscreen;
    if (isAnyFull) {
      document.body.style.overflow = 'hidden'
      document.documentElement.classList.add('pwa-fullscreen')
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=false, viewport-fit=cover');
      
      const metaTags = document.querySelectorAll('meta[name="theme-color"]');
      if (metaTags.length > 0) {
         if (originalThemeColorsRef.current.length === 0) {
             metaTags.forEach(m => {
                 originalThemeColorsRef.current.push({ meta: m, content: m.getAttribute('content') || '', media: m.getAttribute('media') || '' });
             });
         }
         metaTags.forEach(m => {
             m.removeAttribute('media'); // Override iOS media query locking
             m.setAttribute('content', '#000000');
         });
      } else {
        if (!document.getElementById('temp-theme-color')) {
            const meta = document.createElement('meta');
            meta.name = 'theme-color';
            meta.content = '#000000';
            meta.id = 'temp-theme-color';
            document.head.appendChild(meta);
        }
      }
    } else {
      document.body.style.overflow = ''
      document.documentElement.classList.remove('pwa-fullscreen')
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=false');
      if (originalThemeColorsRef.current.length > 0) {
         originalThemeColorsRef.current.forEach(item => {
             item.meta.setAttribute('content', item.content);
             if (item.media) item.meta.setAttribute('media', item.media);
         });
         originalThemeColorsRef.current = []; // Clear it
      } else {
         const tempMeta = document.getElementById('temp-theme-color');
         if (tempMeta) tempMeta.remove();
      }
    }
    
    return () => { 
       document.body.style.overflow = '';
       document.documentElement.classList.remove('pwa-fullscreen');
       const viewportMeta = document.querySelector('meta[name="viewport"]');
       if (viewportMeta) viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=false');
       if (originalThemeColorsRef.current.length > 0) {
         originalThemeColorsRef.current.forEach(item => {
             item.meta.setAttribute('content', item.content);
             if (item.media) item.meta.setAttribute('media', item.media);
         });
         originalThemeColorsRef.current = [];
       } else {
         const tempMeta = document.getElementById('temp-theme-color');
         if (tempMeta) tempMeta.remove();
       }
    }
  }, [isFullscreen, isWebFullscreen, isManualWebFullscreen])

  // Save history periodically & on unmount
  useEffect(() => {
     const saveToHistory = () => {
        if (sourceId && id && epName && rawUrl) {
           useAppStore.getState().updateHistoryRecord(id, sourceId, epName, rawUrl, lastTimeRef.current, lastDurRef.current)
        }
     }
     const interval = setInterval(saveToHistory, 5000)
     return () => {
        clearInterval(interval)
        saveToHistory()
     }
  }, [sourceId, id, epName, rawUrl])

  useEffect(() => {
    const onScrollTop = () => {
       episodesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('custom-scroll-top', onScrollTop)
    return () => window.removeEventListener('custom-scroll-top', onScrollTop)
  }, [])


  // Gesture States
  const [brightness, setBrightness] = useState(1)
  const [seekingDelta, setSeekingDelta] = useState<number | null>(null)
  const touchStartRef = useRef<{x: number, y: number, time: number, type: 'none' | 'volume' | 'brightness' | 'seek', startVol: number, startBright: number, startSeek: number} | null>(null)

  // Volume UI States
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const exposeVolumeSlider = () => {
     setShowControls(true)
     setShowVolumeSlider(true)
     if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current)
     volumeTimeoutRef.current = setTimeout(() => {
        setShowVolumeSlider(false)
     }, 2000)
  }

  useEffect(() => {
    if (sourceId && id) {
      fetch(`/api/video?sourceId=${sourceId}&vodId=${id}`)
        .then(r => r.json())
        .then(data => {
           if(data.video) {
              setVideo(data.video)
              
              const { historyData, setHistoryData, currentMode } = useAppStore.getState()
              const exists = historyData.find(h => h.videoId === String(id) && h._sourceId === sourceId)
              if (!exists) {
                  const prevRecord = historyData.find(h => (h.videoName && data.video.vod_name && h.videoName === data.video.vod_name) || String(h.videoId) === String(id))
                  setHistoryData([{
                      videoId: String(id),
                      videoName: data.video.vod_name,
                      videoPic: data.video.vod_pic,
                      mode: currentMode,
                      _sourceId: sourceId,
                      _sourceName: data.video._sourceName || '',
                      epName: prevRecord ? prevRecord.epName : '',
                      epUrl: '',
                      currentTime: prevRecord ? prevRecord.currentTime : 0,
                      duration: prevRecord ? prevRecord.duration : 0
                  }, ...historyData])
              }

              if(data.video.vod_play_url && searchParams.get('speedtest') !== 'true') {
                const playListStr = getBestM3u8List(data.video.vod_play_from, data.video.vod_play_url)
                if(!playListStr) {
                   const store = useAppStore.getState();
                   const newDisabled = new Set(store.userDisabledSources || []);
                   if (sourceId) newDisabled.add(sourceId as string);
                   store.setUserDisabledSources(Array.from(newDisabled));
                   
                   fetch('/api/sources', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: sourceId, name: data.video._sourceName + " (无法提取m3u8地址)", isActive: false })
                   });
                   setSpeedTestError("抱歉，该源站未提供合法的 M3U8 格式直连或者提取失败，已被自动封禁。请返回重试或选择其他源站。");
                   return;
                }

                const eps = playListStr.split('#').map((ep: string) => {
                   const parts = ep.split('$')
                   return { name: parts[0] || 'Unknown', url: parts[1] || ep }
                }).filter((e: any) => e.url)
                  
                  if (eps.length > 0) {
                     const globalHist = useAppStore.getState().historyData.find(v => (v.videoName && data?.video?.vod_name && v.videoName === data.video.vod_name) || String(v.videoId) === String(id))
                     let targetEp = eps[0]
                     if (globalHist && globalHist.epName) {
                       const matchName = eps.find((e: {name: string, url: string}) => e.name === globalHist.epName || e.name.includes(globalHist.epName || '') || (globalHist.epName || '').includes(e.name))
                       if (matchName) {
                          targetEp = matchName
                       } else {
                          const matchUrl = eps.find((e: {name: string, url: string}) => e.url === globalHist.epUrl)
                          if (matchUrl) targetEp = matchUrl
                       }
                     }

                     // This check is now redundant if getBestM3u8List already filters for .m3u8
                     // However, if the playlist string itself contains non-.m3u8 URLs after being parsed,
                     // we might still need a check here. For now, assuming getBestM3u8List ensures the primary URL is m3u8.
                     // If targetEp.url is not m3u8, it means getBestM3u8List failed to find a proper m3u8,
                     // or the playlist itself is malformed.
                     if (!targetEp.url.includes(".m3u8")) {
                        const store = useAppStore.getState();
                        const newDisabled = new Set(store.userDisabledSources || []);
                        if (sourceId) newDisabled.add(sourceId as string);
                        store.setUserDisabledSources(Array.from(newDisabled));
                        
                        fetch('/api/sources', {
                           method: 'PUT',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ 
                              id: sourceId, 
                              name: (data.video._sourceName || "当前源").replace(" (无法提取m3u8地址)", "") + " (无法提取m3u8地址)", 
                              isActive: false 
                           })
                        }).catch(() => {});
                        setSpeedTestError(`禁止播放：该源站点提供的是非法非 m3u8 网页链接，安全系统已将其标记为不可用并永久封禁。`);
                        return;
                     }

                     setEpisodes(eps)
                     if (!rawUrl) {
                        router.replace(`/play?sourceId=${sourceId}&id=${id}&epName=${encodeURIComponent(targetEp.name)}&epUrl=${encodeURIComponent(targetEp.url)}`)
                     }
                  } else {
                     setEpisodes([])
                  }
              }
              
              if (data.video.vod_name) {
                 fetch(`/api/videos?wd=${encodeURIComponent(data.video.vod_name)}&mode=${useAppStore.getState().currentMode}&searchAll=true`)
                 .then(r => r.json())
                 .then(searchData => {
                    if (searchData.list) {
                       const disabledIds = useAppStore.getState().userDisabledSources || [];
                       const rawAlts = searchData.list.filter((v: any) => v._sourceId !== sourceId && v.vod_name === data.video.vod_name && !disabledIds.includes(v._sourceId));
                       const uniqueAlts: any[] = [];
                       const seenSourceIds = new Set<string>();
                       const store = useAppStore.getState();
                       const newDisabled = new Set(store.userDisabledSources || []);

                       for (const r of rawAlts) {
                          if (!seenSourceIds.has(r._sourceId)) {
                             seenSourceIds.add(r._sourceId);
                             
                             let urlToTest = "";
                             if (r.vod_play_url) {
                               const playSync = getBestM3u8List(r.vod_play_from, r.vod_play_url);
                               if (playSync) {
                                  const firstEp = playSync.split("#")[0].split("$");
                                  if (firstEp[1]) urlToTest = firstEp[1];
                               }
                             } else if (r.vod_pic) {
                               urlToTest = r.vod_pic;
                             }

                             if (urlToTest && !urlToTest.includes(".m3u8")) {
                                fetch('/api/sources', {
                                   method: 'PUT',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ 
                                      id: r._sourceId, 
                                      name: (r._sourceName || "").replace(" (无法提取m3u8地址)", "") + " (无法提取m3u8地址)", 
                                      isActive: false 
                                   })
                                }).catch(() => {});
                                newDisabled.add(r._sourceId);
                             } else {
                                uniqueAlts.push(r);
                             }
                          }
                       }
                       store.setUserDisabledSources(Array.from(newDisabled));
                       setAltSources(uniqueAlts);
                    }
                 }).catch(console.error)
              }
           }
        })
        .catch(err => console.error("Failed to fetch episodes", err))
    }
  }, [sourceId, id])
  
  // Video Playback Effect
  useEffect(() => {
    let hls: any = null
    if (!rawUrl) return

    import('hls.js').then((Hls) => {
      if (Hls.default.isSupported()) {
        
        // --- AdBlocker XHR Loader ---
        class AdBlockXhrLoader extends Hls.default.DefaultConfig.loader {
           load(context: any, config: any, callbacks: any) {
             const OriginalSuccess = callbacks.onSuccess;
             callbacks.onSuccess = (response: any, stats: any, context: any) => {
               if ((context.type === 'manifest' || context.type === 'level') && response.data) {
                  const lines = response.data.split('\n');
                  const result = [];
                  let isSkipNext = false;
                  
                  // Analyze dominant CDN Host to heuristic-block ad injections
                  const tsLines = lines.filter((l: string) => l && !l.startsWith('#'));
                  const hostCounts: Record<string, number> = {};
                  tsLines.forEach((l: string) => {
                     try { const h = new URL(l).host; hostCounts[h] = (hostCounts[h] || 0) + 1; } catch(e) {}
                  });
                  let dominantHost: string | null = null;
                  let maxCount = 0;
                  for (const h in hostCounts) {
                     if (hostCounts[h] > maxCount) { maxCount = hostCounts[h]; dominantHost = h; }
                  }

                  // Scan and clean the manifest text
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    // Extinf Segment definition
                    if (trimmed.startsWith('#EXTINF:')) {
                       const nextLine = lines[i+1]?.trim();
                       if (nextLine && !nextLine.startsWith('#')) {
                          let isAd = false;
                          // 1. Image extensions disguised as TS slices
                          if (/\.(jpg|jpeg|png|gif|bmp|webp)(\?.*)?$/i.test(nextLine)) isAd = true;
                          
                          // 2. Cross-CDN injections (AppleCMS typical pattern)
                          if (dominantHost && maxCount > 5) {
                             try { if (new URL(nextLine).host !== dominantHost) isAd = true; } catch(e) {}
                          }
                          
                          if (isAd) {
                             isSkipNext = true; // Mark to drop this segment entirely
                             continue;
                          }
                       }
                    }
                    
                    if (isSkipNext && !trimmed.startsWith('#')) {
                       isSkipNext = false; // Drop the actual chunk URL
                       continue;
                    }

                    result.push(line);
                  }
                  
                  // Reconstruct clean manifest
                  response.data = result.join('\n');
               }
               OriginalSuccess(response, stats, context);
             };
             super.load(context, config, callbacks);
           }
        }

        const { enableAdBlock, historyData } = useAppStore.getState()
        const globalHistLine = historyData.find(v => (v.videoName && video?.vod_name && v.videoName === video.vod_name) || String(v.videoId) === String(id))
        let startPos = -1
        if (globalHistLine && globalHistLine.currentTime && globalHistLine.currentTime > 0) {
           const isSameEp = globalHistLine.epName === epName || (epName && globalHistLine.epName && (epName.includes(globalHistLine.epName) || globalHistLine.epName.includes(epName))) || globalHistLine.epUrl === rawUrl;
           if (isSameEp) {
              startPos = globalHistLine.currentTime
           }
        }

        const hlsConfig: any = {
           maxBufferLength: 60,
           maxMaxBufferLength: 600,
           maxBufferSize: 60 * 1000 * 1000,
        }
        if (startPos > 0) hlsConfig.startPosition = startPos
        if (enableAdBlock) {
           hlsConfig.pLoader = AdBlockXhrLoader as any
        }

        hls = new Hls.default(hlsConfig)
        
        hls.loadSource(rawUrl)
        hls.attachMedia(videoRef.current!)
        
        hls.on(Hls.default.Events.ERROR, function (_: any, data: any) {
           if (data.fatal) {
              switch (data.type) {
                 case Hls.default.ErrorTypes.NETWORK_ERROR:
                   hls.startLoad();
                   break;
                 case Hls.default.ErrorTypes.MEDIA_ERROR:
                   hls.recoverMediaError();
                   break;
                 default:
                   hls.destroy();
                   break;
              }
           }
        });

        hls.on(Hls.default.Events.MANIFEST_PARSED, () => {
           if (startPos > 0) {
               setTimeout(() => { if (videoRef.current) videoRef.current.currentTime = startPos }, 100)
           }
           const p = videoRef.current?.play()
           if (p !== undefined) p.catch((e: any) => { /* ignore */ })
        })
      } 
      else if (videoRef.current!.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current!.src = rawUrl
        
        const { historyData } = useAppStore.getState()
        const globalHistLine = historyData.find(v => (v.videoName && video?.vod_name && v.videoName === video.vod_name) || String(v.videoId) === String(id))
        let startPos = -1
        if (globalHistLine && globalHistLine.currentTime && globalHistLine.currentTime > 0) {
           const isSameEp = globalHistLine.epName === epName || (epName && globalHistLine.epName && (epName.includes(globalHistLine.epName) || globalHistLine.epName.includes(epName))) || globalHistLine.epUrl === rawUrl;
           if (isSameEp) {
              startPos = globalHistLine.currentTime
           }
        }

        videoRef.current!.addEventListener('loadedmetadata', () => {
           if (startPos > 0) videoRef.current!.currentTime = startPos
           const p = videoRef.current?.play()
           if (p !== undefined) p.catch((e: any) => { /* ignore */ })
        }, { once: true })
      }
    }).catch(err => {
        console.error("Failed to load HLS.js", err)
    })
    return () => {
      if (hls) hls.destroy()
    }
  }, [rawUrl])

  // Scroll active episode into view
  const activeEpRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (isAnyFullscreen) return; // Prevent iOS fullscreen scroll-anchor visual glitch
    if (activeEpRef.current) {
        activeEpRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [rawUrl, epName, episodes, isAnyFullscreen])

  // Find next episode
  const currentIndex = episodes.findIndex(ep => ep.url === rawUrl || ep.name === epName)
  const nextEpisode = currentIndex >= 0 && currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (nextEpisode) {
      router.replace(`/play?sourceId=${sourceId}&id=${id}&epName=${encodeURIComponent(nextEpisode.name)}&epUrl=${encodeURIComponent(nextEpisode.url)}`)
    }
  }, [nextEpisode, router, sourceId, id])

  // Controls Visibility
  const handleMouseMove = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 4000)
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return
      
      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA'
      if (isInput) return

      switch(e.key) {
        case 'ArrowRight':
          e.preventDefault()
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10)
          setShowControls(true)
          break
        case 'ArrowLeft':
          e.preventDefault()
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10)
          setShowControls(true)
          break
        case 'ArrowUp':
          e.preventDefault()
          const newVolUp = Math.min(1, videoRef.current.volume + 0.1)
          videoRef.current.volume = newVolUp
          setVolume(newVolUp)
          if (newVolUp > 0) setIsMuted(false)
          exposeVolumeSlider()
          break
        case 'ArrowDown':
          e.preventDefault()
          const newVolDown = Math.max(0, videoRef.current.volume - 0.1)
          videoRef.current.volume = newVolDown
          setVolume(newVolDown)
          if (newVolDown === 0) setIsMuted(true)
          exposeVolumeSlider()
          break
        case ' ':
          e.preventDefault()
          if (videoRef.current.paused) {
             const p = videoRef.current.play()
             if (p !== undefined) p.catch(() => {})
          } else {
             videoRef.current.pause()
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  // Audio handlers
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (videoRef.current) {
      videoRef.current.volume = v
      if (v > 0) setIsMuted(false)
      else setIsMuted(true)
    }
    exposeVolumeSlider()
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoRef.current) return
    if (isMuted) {
      videoRef.current.muted = false
      setIsMuted(false)
      videoRef.current.volume = volume > 0 ? volume : 0.5
      setVolume(volume > 0 ? volume : 0.5)
    } else {
      videoRef.current.muted = true
      setIsMuted(true)
    }
  }

  const toggleFavorite = () => {
    if (!video) return
    if (isFavorite) {
      setFavoriteData(favoriteData.filter(v => !(String(v.videoId) === String(id) && String(v._sourceId) === String(sourceId))))
    } else {
      const favItem = {
        videoId: String(id),
        videoName: video.vod_name,
        videoPic: video.vod_pic,
        mode: currentMode,
        _sourceId: sourceId,
        _sourceName: video._sourceName
      }
      setFavoriteData([...favoriteData, favItem])
    }
  }

  // Fullscreen handlers
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement
      setIsFullscreen(isFull)
      if (!isFull) {
         if (window.screen && window.screen.orientation && (window.screen.orientation as any).unlock) {
            (window.screen.orientation as any).unlock()
         }
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    const container = playerContainerRef.current
    if (!container) return
    
    const currentIsIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

    if (typeof window !== 'undefined' && window.innerWidth < 1024 && currentIsIOS) {
       setIsManualWebFullscreen(!isManualWebFullscreen)
       return
    }

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
         await container.requestFullscreen().catch((err: any) => console.error("Fullscreen err:", err))
      } else if ((container as any).webkitRequestFullscreen) {
         (container as any).webkitRequestFullscreen()
      } else if ((container as any).msRequestFullscreen) {
         (container as any).msRequestFullscreen()
      }
      if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
         if (!isVerticalVideo) {
            (window.screen.orientation as any).lock('landscape').catch((err: any) => console.warn(err))
         }
      }
    } else {
      if (document.exitFullscreen) {
         document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
         (document as any).webkitExitFullscreen()
      } else if ((document as any).msExitFullscreen) {
         (document as any).msExitFullscreen()
      }
    }
  }

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (videoRef.current) {
      if (isPlaying) {
         videoRef.current.pause()
      } else {
         const p = videoRef.current.play()
         if (p !== undefined) p.catch(() => {})
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value)
    setCurrentTime(t)
    if (videoRef.current) videoRef.current.currentTime = t
    setShowControls(true)
  }

  // Touch Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked) return
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    touchStartRef.current = {
       x: touch.clientX,
       y: touch.clientY,
       time: Date.now(),
       type: 'none',
       startVol: volume,
       startBright: brightness,
       startSeek: videoRef.current?.currentTime || 0
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isLocked) return
    if (!touchStartRef.current || !videoRef.current) return
    
    const touch = e.touches[0]
    let rawDeltaX = touch.clientX - touchStartRef.current.x
    let rawDeltaY = touch.clientY - touchStartRef.current.y

    let deltaX = rawDeltaX
    let deltaY = rawDeltaY
    if (shouldSimulateLandscape) {
        deltaX = rawDeltaY
        deltaY = -rawDeltaX
    }

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (touchStartRef.current.type === 'none') {
       if (absX > 20 && absX > absY) {
          touchStartRef.current.type = 'seek'
       } else if (absY > 20 && absY > absX) {
          const rect = playerContainerRef.current!.getBoundingClientRect()
          const isLeftSide = shouldSimulateLandscape 
             ? touchStartRef.current.y < rect.top + rect.height / 2
             : touchStartRef.current.x < rect.left + rect.width / 2
          touchStartRef.current.type = isLeftSide ? 'brightness' : 'volume'
       } else {
          return
       }
    }

    if (touchStartRef.current.type === 'seek') {
       const rect = playerContainerRef.current!.getBoundingClientRect()
       const refLength = shouldSimulateLandscape ? rect.height : rect.width
       const percent = deltaX / Math.max(refLength, 1)
       const deltaSeconds = percent * 180 // Max +/- 3 mins per full screen swipe
       setSeekingDelta(deltaSeconds)
       setShowControls(true)
    } else if (touchStartRef.current.type === 'volume') {
       const rect = playerContainerRef.current!.getBoundingClientRect()
       const refLength = shouldSimulateLandscape ? rect.width : rect.height
       const percent = -deltaY / Math.max(refLength, 1)
       const newVol = Math.max(0, Math.min(1, touchStartRef.current.startVol + percent))
       videoRef.current.volume = newVol
       setVolume(newVol)
       setIsMuted(newVol === 0)
       setVolumeDelta(newVol)
       exposeVolumeSlider()
    } else if (touchStartRef.current.type === 'brightness') {
       const rect = playerContainerRef.current!.getBoundingClientRect()
       const refLength = shouldSimulateLandscape ? rect.width : rect.height
       const percent = -deltaY / Math.max(refLength, 1)
       const newBright = Math.max(0.1, Math.min(1, touchStartRef.current.startBright + percent))
       setBrightness(newBright)
       setBrightnessDelta(newBright)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isLocked) return
    if (!touchStartRef.current) return
    
    if (touchStartRef.current.type === 'seek' && seekingDelta !== null && videoRef.current) {
       let newTime = touchStartRef.current.startSeek + seekingDelta
       newTime = Math.max(0, Math.min(videoRef.current.duration || 0, newTime))
       videoRef.current.currentTime = newTime
       setCurrentTime(newTime)
    }

    touchStartRef.current = null
    setSeekingDelta(null)
    setVolumeDelta(null)
    setBrightnessDelta(null)
  }

  const [isLoaderForcedOff, setIsLoaderForcedOff] = useState(false)

  useEffect(() => {
     if (rawUrl && duration === 0 && !isMetadataLoaded) {
        const t = setTimeout(() => setIsLoaderForcedOff(true), 6000)
        return () => clearTimeout(t)
     }
  }, [rawUrl, duration, isMetadataLoaded])

  const isSpeedTestQuery = searchParams.get('speedtest') === 'true';
  const searchName = searchParams.get('searchName');
  const targetName = searchName || video?.vod_name;

  const isVideoReady = duration > 0 || isMetadataLoaded;
  const showLoadingOverlay = !speedTestError && !isLoaderForcedOff && (isSpeedTestQuery || (!searchName && !video) || (!rawUrl && episodes.length > 0) || !isVideoReady)

  useEffect(() => {
     let loadTimer: NodeJS.Timeout;
     if (showLoadingOverlay && !speedTestError) {
        loadTimer = setTimeout(() => {
           setSpeedTestError("请求解析超时失效。您的网络环境可能较慢、不连通，或者该节点已宕机，请返回尝试选择其他片源。")
        }, 40000)
     }
     
     let bufferTimer: NodeJS.Timeout;
     if (isBuffering && !speedTestError && !showLoadingOverlay) {
        bufferTimer = setTimeout(() => {
           setSpeedTestError("视频缓冲极度缓慢或连接已断开，请检查网络或切换源站。")
        }, 60000)
     }

     return () => {
        if (loadTimer) clearTimeout(loadTimer)
        if (bufferTimer) clearTimeout(bufferTimer)
     }
  }, [showLoadingOverlay, isBuffering, speedTestError])

  useEffect(() => {
    if (!isSpeedTestQuery || !targetName) return;

    if (pingedRefs.current.has('auto-speedtest')) return;
    pingedRefs.current.add('auto-speedtest');

    (async () => {
      try {
        const fetchUrl = useAppStore.getState().speedTestPlayback === false 
           ? `/api/videos?wd=${encodeURIComponent(targetName)}&mode=${currentMode}&searchAll=true&sortBySourceOrder=true`
           : `/api/videos?wd=${encodeURIComponent(targetName)}&mode=${currentMode}&searchAll=true`;

        const res = await fetch(fetchUrl);
        const data = await res.json();
        
        let targetAltSources: any[] = [];
        if (data && Array.isArray(data.list)) {
          // Eradicate already disabled sources beforehand
          const disabledIds = useAppStore.getState().userDisabledSources || [];
          const activeList = data.list.filter((v: any) => !disabledIds.includes(v._sourceId));

          // Enforce strict literal video identification metadata first
          let exactMatches = activeList.filter((v: any) => v.vod_name === targetName);
          if (exactMatches.length === 0) {
             exactMatches = activeList.filter((v: any) => v.vod_name.replace(/\s+/g,'').toLowerCase() === targetName.replace(/\s+/g,'').toLowerCase());
          }
          if (exactMatches.length > 0) {
              targetAltSources = exactMatches;
          } else {
              targetAltSources = activeList.filter((v: any) => 
                 v.vod_name.includes(targetName) || targetName.includes(v.vod_name)
              );
          }
          // If no loose match but we have results, fallback to top 10 results from search
          if (targetAltSources.length === 0 && activeList.length > 0) {
             targetAltSources = activeList.slice(0, 10);
          }
        }

        if (targetAltSources.length === 0) {
           if (searchName) {
              setSpeedTestError("暂未在可用源站中匹配到该影片或均被拦截，请尝试添加更多高清源站。");
           } else {
              router.replace(`/play?id=${id}&sourceId=${encodeURIComponent(sourceId || '')}`);
           }
           return;
        }

        if (useAppStore.getState().speedTestPlayback === false) {
             const store = useAppStore.getState();
             const newDisabled = new Set(store.userDisabledSources || []);
             let firstValidAlt: any = null;
             
             for (const alt of targetAltSources) {
                let urlToTest = "";
                if (alt.vod_play_url) {
                  const playSync = getBestM3u8List(alt.vod_play_from, alt.vod_play_url);
                  if (playSync) {
                     const firstEp = playSync.split("#")[0].split("$");
                     if (firstEp[1]) urlToTest = firstEp[1];
                  }
                } else if (alt.vod_pic) {
                  urlToTest = alt.vod_pic;
                }

                if (!urlToTest) {
                   // If getBestM3u8List returns null, it means no valid m3u8 was found.
                   // Mark as disabled.
                   fetch('/api/sources', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                         id: alt._sourceId, 
                         name: (alt._sourceName || "").replace(" (无法提取m3u8地址)", "") + " (无法提取m3u8地址)", 
                         isActive: false 
                      })
                   }).catch(() => {});
                   newDisabled.add(alt._sourceId);
                   continue;
                }
                
                firstValidAlt = alt;
                break;
             }

             if (newDisabled.size > (store.userDisabledSources?.length || 0)) {
                 store.setUserDisabledSources(Array.from(newDisabled));
             }

             if (firstValidAlt) {
                 const uniqueAlts: any[] = [];
                 const seenSourceIds = new Set<string>();
                 for (const r of targetAltSources) {
                    if (!seenSourceIds.has(r._sourceId) && !newDisabled.has(r._sourceId)) {
                       seenSourceIds.add(r._sourceId);
                       uniqueAlts.push(r);
                    }
                 }
                 setAltSources(uniqueAlts);
                 setSpeedTestError(""); 
                 router.replace(`/play?id=${firstValidAlt.vod_id || firstValidAlt.videoId || firstValidAlt.id}&sourceId=${encodeURIComponent(firstValidAlt._sourceId)}`);
             } else {
                 setAltSources([]);
                 setSpeedTestError("暂无有效视频直连，发现的源均已被安全系统拦截屏蔽。");
             }
             return;
        }

        const results = await Promise.all(
          targetAltSources.map(async (alt: any) => {
            try {
              let urlToTest = "";
              if (alt.vod_play_url) {
                const playSync = getBestM3u8List(alt.vod_play_from, alt.vod_play_url);
                if (playSync) {
                   const firstEp = playSync.split("#")[0].split("$");
                   if (firstEp[1]) urlToTest = firstEp[1];
                }
              } else if (alt.vod_pic) {
                urlToTest = alt.vod_pic;
              }

              if (!urlToTest) {
                 // If getBestM3u8List returns null, it means no valid m3u8 was found.
                 // Mark as disabled.
                 fetch('/api/sources', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                       id: alt._sourceId, 
                       name: alt._sourceName.replace(" (无法提取m3u8地址)", "") + " (无法提取m3u8地址)", 
                       isActive: false 
                    })
                 }).catch(() => {});
                 return { alt, score: -99999 };
              }

              const startInit = performance.now();
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 8000); 

              let speedScore = -50000;

              try {
                const res = await fetch(urlToTest, { signal: controller.signal });
                const latency = Math.round(performance.now() - startInit);
                const contentType = res.headers.get('content-type') || '';

                let nextUrl = urlToTest;
                
                // If it's HTML or plain text, or the URL doesn't look like a direct video file, parse it
                if (contentType.includes('text/html') || contentType.includes('text/plain') || (!urlToTest.includes('.m3u8') && !urlToTest.includes('.mp4'))) {
                    const text = await res.text();
                    if (text.includes("<html") || text.trim().startsWith("<") || (!text.includes("#EXTM3U") && !text.includes('.m3u8') && !text.includes('.mp4'))) {
                       const unescapedText = text.replace(/\\/g, '');
                       let match = unescapedText.match(/https?:\/\/[^"'\s<>]+?\.(?:m3u8|mp4)(?:\?[^"'\s<>]+)?/i);
                       let extracted = "";
                       if (match) {
                          extracted = match[0];
                       } else {
                          match = unescapedText.match(/"([^"'\s<>]+?\.(?:m3u8|mp4)(?:\?[^"'\s<>]+)?)"/i) || 
                                  unescapedText.match(/'([^"'\s<>]+?\.(?:m3u8|mp4)(?:\?[^"'\s<>]+)?)'/i);
                          if (match && match[1]) {
                             extracted = new URL(match[1], urlToTest).href;
                          }
                       }
                       if (extracted) {
                          nextUrl = extracted;
                          alt._extracted_url = extracted;
                       } else {
                          throw new Error("BANNED_SOURCE_NO_MEDIA");
                       }
                    } else if (text.includes("#EXTM3U")) {
                       const lines = text.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
                       if (lines.length > 0) {
                         let n1 = lines[0].trim();
                         nextUrl = n1.startsWith("http") ? n1 : new URL(n1, urlToTest).href;
                       }
                    }
                }

                if (nextUrl.includes(".m3u8")) {
                  const res2 = await fetch(nextUrl, { signal: controller.signal });
                  const text2 = await res2.text();
                  const lines2 = text2.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
                  if (lines2.length > 0) {
                    let n2 = lines2[0].trim();
                    nextUrl = n2.startsWith("http") ? n2 : new URL(n2, nextUrl).href;
                  }
                }

                const tsRes = await fetch(nextUrl, { signal: controller.signal });
                let receivedLength = 0;
                if (tsRes.body) {
                  const reader = tsRes.body.getReader();
                  const streamStart = performance.now();
                  try {
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      if (value) receivedLength += value.length;
                      if (receivedLength > 512 * 1024) {
                        reader.cancel().catch(() => {});
                        break;
                      }
                    }
                  } catch (e) {}
                  const streamEnd = performance.now();
                  const streamDuration = (streamEnd - streamStart) / 1000;
                  const speedKbps = receivedLength > 0 && streamDuration > 0 ? receivedLength / 1024 / streamDuration : 0;

                  clearTimeout(timeout);
                  speedScore = speedKbps * 10 - latency;
                } else {
                  throw new Error("No body stream");
                }
              } catch (err: any) {
                const isHtmlWithoutExtension = !urlToTest.includes('.m3u8') && !urlToTest.includes('.mp4') && !urlToTest.includes('.flv');
                const isCors = err.message === 'Failed to fetch' || err.message?.includes('fetch');
                const isUnplayableText = isCors && !urlToTest.includes('.mp4');

                if (err.message === "BANNED_SOURCE_NO_MEDIA" || isHtmlWithoutExtension || isUnplayableText) {
                   speedScore = -99999;
                   fetch('/api/sources', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                         id: alt._sourceId, 
                         name: alt._sourceName.replace(" (无法提取m3u8地址)", "") + " (无法提取m3u8地址)", 
                         isActive: false 
                      })
                   }).catch(console.error);
                } else {
                   const fallbackStart = performance.now();
                   await fetch(urlToTest, { method: "HEAD", mode: "no-cors" }).catch(() => null);
                   clearTimeout(timeout);
                   const fallbackPing = Math.round(performance.now() - fallbackStart);
                   speedScore = -fallbackPing;
                }
              }
              return { alt, score: speedScore };
            } catch (e) {
              return { alt, score: -99999 };
            }
          })
        );

        results.sort((a, b) => b.score - a.score);
        const validResults = results.filter(r => r.score !== -99999);
        const bannedResults = results.filter(r => r.score === -99999);

        // Instantly reflect banned sources in the admin settings UI via Zustand
        if (bannedResults.length > 0) {
           const store = useAppStore.getState();
           const newDisabled = new Set(store.userDisabledSources || []);
           bannedResults.forEach(r => newDisabled.add(r.alt._sourceId));
           store.setUserDisabledSources(Array.from(newDisabled));
        }
        
        if (validResults.length === 0) {
           setAltSources([]);
           setSpeedTestError("暂无有效视频直连，发现的源均已被安全系统拦截屏蔽。");
           return;
        }

        const uniqueAlts: any[] = [];
        const seenSourceIds = new Set<string>();
        for (const r of validResults) {
           if (!seenSourceIds.has(r.alt._sourceId)) {
              seenSourceIds.add(r.alt._sourceId);
              uniqueAlts.push(r.alt);
           }
        }
        setAltSources(uniqueAlts);
        
        const best = validResults[0].alt;

        let bestEpName = "";
        let bestEpUrl = "";
        if (best._extracted_url) {
           bestEpUrl = best._extracted_url;
        } else if (best.vod_play_url) {
          const playListSync = getBestM3u8List(best.vod_play_from, best.vod_play_url);
          if (playListSync) {
             const firstEp = playListSync.split("#")[0].split("$");
             if (firstEp[0]) bestEpName = firstEp[0];
             if (firstEp[1]) bestEpUrl = firstEp[1];
          }
        } else if (best.vod_pic) {
          bestEpUrl = best.vod_pic;
        }

        router.replace(
          `/play?id=${best?.vod_id || best?.videoId || best?.id}&sourceId=${encodeURIComponent(best?._sourceId || '')}${bestEpUrl ? `&epName=${encodeURIComponent(bestEpName)}&epUrl=${encodeURIComponent(bestEpUrl)}` : ''}`
        );
      } catch (err) {
        if (searchName) {
           setSpeedTestError("暂无影片数据，请前往设置配置数据源。");
        } else {
           router.replace(`/play?id=${id}&sourceId=${encodeURIComponent(sourceId || '')}`);
        }
      }
    })();
  }, [isSpeedTestQuery, targetName, currentMode, router, sourceId, id, searchName]);

  // Dedicated AltSources Background Hydrator for Direct-Access Playbacks
  useEffect(() => {
     if (!targetName || isSpeedTestQuery || altSources.length > 0) return;
     if (pingedRefs.current.has('fetch-alt-sources')) return;
     pingedRefs.current.add('fetch-alt-sources');

     fetch(`/api/videos?wd=${encodeURIComponent(targetName)}&mode=${currentMode}&searchAll=true`)
       .then(r => r.json())
       .then(data => {
           if (data && Array.isArray(data.list)) {
              const disabledIds = useAppStore.getState().userDisabledSources || [];
              const activeList = data.list.filter((v: any) => !disabledIds.includes(v._sourceId));
              
              let exactMatches = activeList.filter((v: any) => v.vod_name === targetName);
              if (exactMatches.length === 0) {
                 exactMatches = activeList.filter((v: any) => v.vod_name.replace(/\s+/g,'').toLowerCase() === targetName.replace(/\s+/g,'').toLowerCase());
              }
              let matched = exactMatches.length > 0 ? exactMatches : activeList.filter((v: any) => v.vod_name.includes(targetName) || targetName.includes(v.vod_name));
              
              if (matched.length === 0 && activeList.length > 0) matched = activeList.slice(0, 10);
              
              const uniqueAlts: any[] = [];
              const seen = new Set<string>();
              for (const r of matched) {
                 if (!seen.has(r._sourceId)) {
                    seen.add(r._sourceId);
                    uniqueAlts.push(r);
                 }
              }
              setAltSources(uniqueAlts);
           }
       }).catch(() => {});
  }, [targetName, isSpeedTestQuery, altSources.length, currentMode]);

  return (
    <div className={`fixed inset-y-0 right-0 left-0 md:left-64 flex flex-col h-[100dvh] overflow-hidden ${isAnyFullscreen ? 'bg-[#000000] text-white z-[60]' : 'bg-[var(--background)] dark:bg-[#1c1c1e] z-40'}`}>
       {/* Error Overlay */}
       {speedTestError && (
         <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[var(--background)] dark:bg-[#1c1c1e]">
            <div className="flex flex-col items-center space-y-4">
               <div className="w-16 h-16 bg-red-100 dark:bg-red-800/50 rounded-full flex items-center justify-center mb-4">
                  <InformationCircleIcon className="w-8 h-8 text-red-500" />
               </div>
               <span className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-widest">{speedTestError}</span>
               <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                  返回
               </button>
            </div>
         </div>
       )}

       {/* Full Screen Loading Overlay (Cross-faded with calculated PC offset for Episodes) */}
       <div className={`absolute inset-0 z-[99] flex items-center justify-center bg-[var(--background)] dark:bg-[#1c1c1e] transition-opacity duration-500 ${showLoadingOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col items-center space-y-4">
             <svg className="animate-spin h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <span className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-widest animate-pulse">
                {isSpeedTestQuery ? (useAppStore.getState().speedTestPlayback === false ? '获取影片播放源中...' : '测速优选视频源中...') : '获取影片信息中...'}
             </span>
          </div>
       </div>
       {/* Top Persistent Header */}
       {!isAnyFullscreen && (
       <header className={`flex items-center justify-between pt-4 md:pt-6 px-4 md:px-8 pb-3 min-h-[64px] shrink-0 bg-transparent z-50 transition-opacity duration-500 ${showLoadingOverlay ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
         <div className="flex items-center">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition">
              <ArrowLeftIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" />
            </button>
            <span className="ml-1 text-base md:text-lg font-bold text-gray-800 dark:text-gray-200 truncate max-w-[200px] md:max-w-md">
               {video?.vod_name ? `${video.vod_name} ${epName ? `- ${epName}` : ''}` : epName || '影片播放'}
            </span>
         </div>
         <div className="flex items-center space-x-2">
           <button onClick={() => setShowInfo(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400">
             <InformationCircleIcon className="w-6 h-6" />
           </button>
           <button onClick={toggleFavorite} className="p-2 -mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400">
             {isFavorite ? <HeartSolid className="w-6 h-6 text-red-500" /> : <HeartIcon className="w-6 h-6" />}
           </button>
         </div>
       </header>
       )}
       <div className={`flex-1 flex flex-col w-full overflow-y-auto overflow-x-hidden relative transition-opacity duration-500 ${showLoadingOverlay ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
         {/* Video Section */}
         <div 
           ref={playerContainerRef}
           onMouseMove={handleMouseMove}
           onMouseLeave={() => isPlaying && setShowControls(false)}
           onClick={(e) => {
             if (typeof window !== 'undefined' && window.innerWidth < 1024) {
               setShowControls(prev => {
                 const nextState = !prev;
                 if (nextState) {
                    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
                    controlsTimeoutRef.current = setTimeout(() => {
                      if (videoRef.current && !videoRef.current.paused) setShowControls(false)
                    }, 4000)
                 }
                 return nextState;
               });
               return;
             }
             
             // PC Click Debounce
             if (isLocked) return;
             
             if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current)
                clickTimeoutRef.current = null
             } else {
                clickTimeoutRef.current = setTimeout(() => {
                   togglePlay(e)
                   clickTimeoutRef.current = null
                }, 200)
             }
           }}
           onDoubleClick={(e) => {
             if (isLocked) return;
             if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
             
             if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current)
                clickTimeoutRef.current = null
             }
             toggleFullscreen(e)
           }}
           className={`relative flex items-center justify-center bg-black shrink-0 transition-opacity duration-300 ${
             (!shouldSimulateLandscape && (isFullscreen || isWebFullscreen || isManualWebFullscreen)) ? 'fixed inset-0 z-[100] w-full h-[100dvh]' : ''
           } ${
             (!isFullscreen && !isWebFullscreen && !isManualWebFullscreen) ? (isVerticalVideo ? 'w-full aspect-[3/4] max-h-[55vh] sm:max-h-[70vh]' : 'aspect-video lg:max-h-[75vh] w-full') : ''
           }`}
           style={shouldSimulateLandscape ? {
             position: 'fixed',
             top: '50%',
             left: '50%',
             width: '100dvh',
             height: '100vw',
             transform: 'translate(-50%, -50%) rotate(90deg)',
             zIndex: 100,
           } : {}}
         >
           {/* Gesture Overlay (Touch only) */}
           <div 
             className="absolute inset-0 z-20 touch-none"
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}
           />

           {/* Mobile Handlers & Overlays */}
           {/* Lock Button (Mobile Fullscreen Only) */}
           {isAnyFullscreen && (
             <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-[60] lg:hidden transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsLocked(!isLocked); setShowControls(true); }}
                 className="p-3 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-md text-white/80 hover:text-white transition-all pointer-events-auto shadow-xl border border-white/5"
               >
                 {isLocked ? <LockClosedIcon className="w-6 h-6" /> : <LockOpenIcon className="w-6 h-6" />}
               </button>
             </div>
           )}

           {/* Mobile Fullscreen Top Header */}
           {isAnyFullscreen && (
             <div className={`absolute top-0 left-0 right-0 px-4 pt-4 pb-12 bg-gradient-to-b from-black/80 to-transparent z-50 transition-opacity duration-300 pointer-events-none lg:hidden flex justify-between items-start ${showControls && !isLocked ? 'opacity-100' : 'opacity-0'}`}>
               <div className="flex items-center gap-3 pointer-events-auto">
                  <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(e); }} className="p-2 -ml-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors drop-shadow">
                     <ArrowLeftIcon className="w-6 h-6" />
                  </button>
                  <div className="flex flex-col">
                     <span className="text-white font-bold text-sm line-clamp-1 max-w-[200px] drop-shadow-md">{video?.vod_name}</span>
                     <span className="text-gray-300 text-xs font-mono drop-shadow-md">{epName}</span>
                  </div>
               </div>

               {episodes.length > 1 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowMobileEpisodes(!showMobileEpisodes); setShowControls(false); }} 
                    className="p-1.5 -mr-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors pointer-events-auto flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 border border-white/10"
                  >
                     <span className="text-[11px] font-bold tracking-wider drop-shadow">选集</span>
                     <ListBulletIcon className="w-4 h-4 drop-shadow" />
                  </button>
               )}
             </div>
           )}

           {/* Mobile Episode Drawer (Fullscreen Only) */}
           {isAnyFullscreen && showMobileEpisodes && (
             <div 
               onClick={(e) => { e.stopPropagation(); setShowMobileEpisodes(false); }}
               className="absolute inset-x-0 inset-y-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden flex justify-end transition-opacity"
             >
               <div 
                 onClick={(e) => e.stopPropagation()} 
                 className="w-6/12 min-w-[200px] max-w-xs h-full bg-[#1c1c1e]/95 border-l border-white/10 shadow-2xl flex flex-col pointer-events-auto"
               >
                 <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0">
                    <span className="text-white font-bold">选集 ({episodes.length})</span>
                    <button onClick={() => setShowMobileEpisodes(false)} className="p-1 -mr-1 hover:bg-white/10 rounded-full text-white">
                       <XMarkIcon className="w-6 h-6" />
                    </button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar grid grid-cols-2 gap-2 content-start">
                    {episodes.map((ep, idx) => {
                       const isActive = ep.name === epName || (video && ep.name === video.vod_play_list[0]?.urls?.[currentIndex]?.name);
                       return (
                         <button
                           key={idx}
                           onClick={(e) => {
                              e.stopPropagation()
                              setShowMobileEpisodes(false)
                              router.replace(`/play?sourceId=${sourceId}&id=${id}&epName=${encodeURIComponent(ep.name)}&epUrl=${encodeURIComponent(ep.url)}`)
                           }}
                           className={`py-3 px-2 rounded-lg text-xs font-medium text-center truncate transition-all ${
                             isActive 
                               ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                               : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                           }`}
                         >
                            {ep.name}
                         </button>
                       )
                    })}
                 </div>
               </div>
             </div>
           )}

           <video 
             ref={videoRef}
             controls={false}
             className="w-full h-full max-h-full object-contain"
             playsInline
             autoPlay
             onWaiting={() => setIsBuffering(true)}
             onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
             onPlay={() => setIsPlaying(true)}
             onPause={() => setIsPlaying(false)}
             onTimeUpdate={() => {
                const ct = videoRef.current?.currentTime || 0
                setCurrentTime(ct)
                lastTimeRef.current = ct
                
                if (Number(introSkip) > 0 && ct < Number(introSkip) && !hasSkippedIntro.current) {
                   videoRef.current!.currentTime = Number(introSkip)
                   hasSkippedIntro.current = true
                }
                const currentDur = videoRef.current?.duration || duration
                if (Number(outroSkip) > 0 && currentDur > 0 && ct > (currentDur - Number(outroSkip)) && !hasSkippedOutro.current) {
                   hasSkippedOutro.current = true
                   handleNext()
                }
             }}
             onLoadedMetadata={() => {
                setIsMetadataLoaded(true)
                const dur = videoRef.current?.duration || 0
                setDuration(dur)
                lastDurRef.current = dur

                if (videoRef.current) {
                   setIsVerticalVideo(videoRef.current.videoHeight > videoRef.current.videoWidth)
                }

                const hist = useAppStore.getState().historyData.find(v => String(v.videoId) === String(id) && String(v._sourceId) === String(sourceId))
                if (hist && hist.epUrl === rawUrl && hist.currentTime && hist.currentTime > 0) {
                   if (hist.currentTime < (hist.duration || dur || Infinity) - 10) {
                      videoRef.current!.currentTime = hist.currentTime
                   }
                }
             }}
             onEnded={() => {
                setIsPlaying(false)
                handleNext()
             }}
           />

           {/* Swipe Info Overlays */}
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl flex flex-col items-center gap-2 z-[90] transition-opacity duration-200 pointer-events-none ${seekingDelta !== null ? 'opacity-100' : 'opacity-0'}`}>
             <div className="flex items-center gap-2 text-white">
               {seekingDelta !== null && seekingDelta > 0 ? <ForwardIcon className="w-8 h-8" /> : <ArrowLeftIcon className="w-8 h-8" />}
               <span className="text-xl font-bold font-mono">
                 {seekingDelta !== null ? `${seekingDelta > 0 ? '+' : ''}${Math.round(seekingDelta)}s` : ''}
               </span>
             </div>
           </div>

           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl flex flex-col items-center gap-2 z-[90] transition-opacity duration-200 pointer-events-none ${volumeDelta !== null ? 'opacity-100' : 'opacity-0'}`}>
             <div className="flex items-center gap-2 text-white">
               {volumeDelta !== null && volumeDelta === 0 ? <SpeakerXMarkIcon className="w-8 h-8" /> : <SpeakerWaveIcon className="w-8 h-8" />}
               <span className="text-xl font-bold font-mono">
                 {volumeDelta !== null ? `${Math.round(volumeDelta * 100)}%` : ''}
               </span>
             </div>
           </div>

           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl flex flex-col items-center gap-2 z-[90] transition-opacity duration-200 pointer-events-none ${brightnessDelta !== null ? 'opacity-100' : 'opacity-0'}`}>
             <div className="flex items-center gap-2 text-white">
               <SunIcon className="w-8 h-8" />
               <span className="text-xl font-bold font-mono">
                 {brightnessDelta !== null ? `${Math.round(brightnessDelta * 100)}%` : ''}
               </span>
             </div>
           </div>

           {/* Brightness Overlay */}
           <div 
             className="absolute inset-0 bg-black pointer-events-none z-30 transition-opacity duration-150" 
             style={{ opacity: 1 - brightness }}
           ></div>

           {/* Seeking Delta Popup */}
           {seekingDelta !== null && (
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-xl text-lg font-bold z-40 shadow-lg pointer-events-none">
               {seekingDelta > 0 ? '+' : ''}{Math.round(seekingDelta)}s
               <div className="text-xs text-center font-normal text-gray-300 mt-1">
                 {formatTime(Math.max(0, Math.min(duration, (touchStartRef.current?.startSeek || 0) + seekingDelta)))}
               </div>
             </div>
           )}

           {/* Buffering Indicator */}
           {isBuffering && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 bg-black/10 backdrop-blur-[2px]">
                <svg className="animate-spin h-12 w-12 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
             </div>
           )}

           {/* Controls Bottom Bar */}
           <div {...(isLocked ? { inert: true } : {})} onClick={e => e.stopPropagation()} className={`absolute bottom-0 left-0 right-0 px-4 pb-4 pt-16 bg-gradient-to-t from-black/90 to-transparent z-40 transition-opacity duration-300 ${showControls && !isLocked ? 'opacity-100' : 'opacity-0'} flex flex-col pointer-events-none`}>
             <div className="w-full h-1.5 bg-white/30 rounded-full mb-4 cursor-pointer relative group/progress pointer-events-auto">
               <input 
                  type="range" min={0} max={duration || 100} value={currentTime} 
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
               />
               <div className="absolute top-0 left-0 bottom-0 bg-blue-500 rounded-full pointer-events-none" style={{ width: `${Math.min(100, (currentTime/(duration||1))*100)}%` }}></div>
             </div>

             <div className="flex items-center justify-between pointer-events-auto">
               <div className="flex items-center space-x-4">
                  <button onClick={togglePlay} className="text-white hover:text-blue-400 transition transform hover:scale-110">
                     {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                  </button>

                  {nextEpisode && (
                    <button onClick={handleNext} className="text-white hover:text-blue-400 transition transform hover:scale-110" title={`下一集: ${nextEpisode.name}`}>
                      <ForwardIcon className="w-6 h-6" />
                    </button>
                  )}

                  <div className="hidden lg:flex items-center space-x-2" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                    <button onClick={toggleMute} className="text-white hover:text-blue-400 transition transform hover:scale-110">
                      {isMuted || volume === 0 ? <SpeakerXMarkIcon className="w-6 h-6" /> : <SpeakerWaveIcon className="w-6 h-6" />}
                    </button>
                    <input 
                      type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume} 
                      onChange={handleVolumeChange}
                      className={`transition-all duration-300 accent-blue-500 ${showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'}`}
                    />
                  </div>
                  
                  <div className="text-[10px] sm:text-xs text-white/80 font-medium font-mono tracking-wide absolute sm:static right-16 sm:right-auto">
                     {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
               </div>

               <div className="flex items-center">
                  <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition transform hover:scale-110">
                     {isAnyFullscreen ? <ArrowsPointingInIcon className="w-6 h-6" /> : <ArrowsPointingOutIcon className="w-6 h-6" />}
                  </button>
               </div>
             </div>
           </div>
           
           {/* Big Play Button Overlay for Mobile Taps and Paused State */}
           {!isPlaying && !isLocked && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div onClick={togglePlay} className="bg-black/50 p-4 rounded-full backdrop-blur-sm pointer-events-auto cursor-pointer transition transform hover:scale-110">
                  <PlayIcon className="w-12 h-12 text-white/90 translate-x-1" />
                </div>
             </div>
           )}
         </div>

         {/* Episodes Section */}
         <div className={`w-full bg-[var(--background)] dark:bg-[#1c1c1e] flex-col z-10 overflow-visible pb-16 lg:pb-32 ${isAnyFullscreen ? 'hidden' : 'flex'}`}>
            {true ? (
               <>
                 <div className="flex items-center justify-between p-4 md:px-8 min-h-[60px] border-b border-black/10 dark:border-white/10 shrink-0 bg-transparent gap-y-2 flex-wrap">
                    <div className="flex items-center">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mr-2">
                       {showSkipConfig ? '跳过设置' : showAltSources ? '更换源站' : '选集播放'}
                    </h3>
                    {showAltSources ? (
                       <span 
                         onClick={() => {
                            if (showSkipConfig) return;
                            useAppStore.getState().setSearchTerm(searchName || targetName || video?.vod_name || "");
                            useAppStore.getState().setSearchAllSources(true);
                            router.push('/');
                         }}
                         className={`text-xs font-medium cursor-pointer transition-colors ${showSkipConfig ? 'text-transparent pointer-events-none select-none' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                       >
                         电影不对？点我搜索
                       </span>
                    ) : (
                       <span className={`text-xs font-medium ${showSkipConfig ? 'text-transparent pointer-events-none select-none' : 'text-gray-500 dark:text-gray-400'}`}>共 {episodes.length} 集</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                     <button 
                         onClick={() => { setShowSkipConfig(!showSkipConfig); setShowAltSources(false); }} 
                         className={`text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm transition-all ${
                             showSkipConfig ? 'bg-gray-100 text-gray-600 dark:bg-black/40 dark:text-gray-300 dark:border-white/5 border border-transparent' 
                             : (Number(introSkip) > 0 || Number(outroSkip) > 0) ? 'text-white bg-blue-500 dark:bg-blue-600 hover:opacity-90'
                             : 'text-gray-600 bg-gray-200 dark:bg-[#2c2c2e] dark:border dark:border-white/5 dark:text-gray-300 hover:opacity-90'
                         }`}
                     >
                         {showSkipConfig ? '返回选集' : '跳过片头/尾'}
                     </button>
                     {altSources.length > 0 && (
                        <button onClick={() => { setShowAltSources(!showAltSources); setShowSkipConfig(false); }} className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center transition-all ${showAltSources ? 'bg-gray-100 text-gray-600 dark:bg-black/40 dark:text-gray-300 dark:border-white/5 border border-transparent shadow-sm' : 'text-white bg-gradient-to-r from-orange-400 to-red-500 shadow-sm hover:opacity-90'}`}>
                           {showAltSources ? '返回选集' : '测速换源'} {!showAltSources && <span className="bg-white/20 px-1.5 rounded-full ml-1 font-mono">{altSources.length}</span>}
                        </button>
                     )}
                  </div>
               </div>
               <div 
                 ref={episodesContainerRef}
                 className="flex-1 w-full p-4 md:px-8 content-start"
               >
                  {showSkipConfig ? (
                     <div className="flex flex-col space-y-5 max-w-sm">
                        <div className="flex flex-col space-y-2">
                           <label className="text-sm font-bold text-gray-700 dark:text-gray-300">跳过片头 (秒)</label>
                           <input type="number" min="0" value={introSkip} onChange={e => setIntroSkip(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="例如: 90" />
                        </div>
                        <div className="flex flex-col space-y-2">
                           <label className="text-sm font-bold text-gray-700 dark:text-gray-300">跳过片尾 (秒)</label>
                           <input type="number" min="0" value={outroSkip} onChange={e => setOutroSkip(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="例如: 120" />
                        </div>
                        <div className="flex space-x-3 pt-2">
                           <button onClick={() => {
                              const conf = { intro: introSkip, outro: outroSkip };
                              localStorage.setItem('global_skip_config', JSON.stringify(conf));
                              setShowSkipConfig(false);
                           }} className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 font-bold hover:bg-blue-600 transition-colors shadow-sm cursor-pointer">保存设置</button>
                           <button onClick={() => {
                              setIntroSkip(0); setOutroSkip(0);
                              localStorage.removeItem('global_skip_config');
                              setShowSkipConfig(false);
                           }} className="flex-1 bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/5 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer">清空跳过</button>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">提示: 设置将全局生效，所有影片将采用此跳过配置。</div>
                     </div>
                  ) : showAltSources ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {/* Current Source Marker */}
                         <div className="p-3 rounded-2xl border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 flex flex-col justify-center shadow-sm relative overflow-hidden transition-all duration-500">
                           <div className="flex items-center justify-between w-full mb-1.5 relative z-10">
                              <div className="flex items-center">
                                 <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">{video?._sourceName}</span>
                                 <span className="text-[10px] font-medium bg-blue-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">当前源</span>
                              </div>
                              <span className={`text-[10px] flex-shrink-0 ml-2 px-1.5 py-0.5 rounded font-mono transition-colors ${!pingResults[sourceId!] ? 'bg-blue-100 text-blue-400 dark:bg-blue-900/30 dark:text-blue-600' : pingResults[sourceId!].ping === -1 ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : pingResults[sourceId!].ping < 500 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'}`}>
                                 {!pingResults[sourceId!] ? '测速中...' : pingResults[sourceId!].ping === -1 ? '超时' : `${pingResults[sourceId!].ping}ms${pingResults[sourceId!].speed ? ` | ${formatSpeed(pingResults[sourceId!].speed)}` : ''}`}
                              </span>
                           </div>
                           <span className="text-[11px] text-blue-400 dark:text-blue-500 truncate w-full relative z-10">{video?.vod_remarks || '进度未知'}</span>
                         </div>
                        {/* Alternative Sources */}
                        {sortedAltSources.map((alt: any) => (
                          <button 
                             key={alt._sourceId}
                             onClick={() => {
                                setShowAltSources(false);
                                router.replace(`/play?sourceId=${alt._sourceId}&id=${alt.vod_id}`);
                             }}
                             className={`w-full text-left p-3 rounded-2xl border bg-white dark:bg-[#1c1c1e] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all flex flex-col items-start justify-center group relative overflow-hidden ${bestSourceId === alt._sourceId ? 'border-orange-300 dark:border-orange-500/50 shadow-md transform scale-[1.02]' : 'border-gray-100 dark:border-gray-800 hover:border-orange-500/50 hover:shadow-sm'}`}
                          >
                             <div className="flex items-center justify-between w-full mb-1.5 relative z-10">
                                <div className="flex items-center">
                                   <span className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-orange-500 transition-colors truncate pr-2">{alt._sourceName}</span>
                                </div>
                                <span className={`text-[10px] flex-shrink-0 ml-2 px-1.5 py-0.5 rounded font-mono transition-colors ${!pingResults[alt._sourceId] ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500' : pingResults[alt._sourceId].ping === -1 ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : pingResults[alt._sourceId].ping < 500 ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'}`}>
                                   {!pingResults[alt._sourceId] ? '测速中...' : pingResults[alt._sourceId].ping === -1 ? '超时' : `${pingResults[alt._sourceId].ping}ms${pingResults[alt._sourceId].speed ? ` | ${formatSpeed(pingResults[alt._sourceId].speed)}` : ''}`}
                                </span>
                             </div>
                             <span className="text-[11px] text-gray-400 truncate w-full relative z-10">{alt.vod_remarks || '进度未知'}</span>
                          </button>
                        ))}
                     </div>
                  ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                    {episodes.map((ep, i) => {
                       const isCurrent = ep.url === rawUrl || ep.name === epName
                       return (
                         <button
                           key={i}
                           ref={isCurrent ? activeEpRef : null}
                           onClick={() => {
                             router.replace(`/play?sourceId=${sourceId}&id=${id}&epName=${encodeURIComponent(ep.name)}&epUrl=${encodeURIComponent(ep.url)}`)
                           }}
                           className={`px-2 py-3 bg-white dark:bg-[#1c1c1e] text-[13px] font-medium rounded-xl shadow-sm transition truncate text-center cursor-pointer border w-full block ${isCurrent ? 'border-blue-500 text-blue-500 ring-1 ring-blue-500/50' : 'border-transparent text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-500 active:scale-95'}`}
                           title={ep.name}
                         >
                           {ep.name}
                         </button>
                       )
                    })}
                  </div>
                  )}
               </div>
               </>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-3">
                  <div className="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="text-xs font-medium">载入剧集...</span>
               </div>
            )}
         </div>
       </div>

       {/* Info Modal */}
       {showInfo && video && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowInfo(false)}>
             <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 w-full max-w-sm shadow-xl transform transition-transform" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-bold text-gray-900 dark:text-white">影片属性</h3>
                   <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                </div>
                <div className="space-y-4 text-[13px]">
                   <div className="flex flex-col space-y-1">
                      <span className="text-gray-500">影片名称</span>
                      <span className="font-medium text-gray-900 dark:text-white break-all">{video.vod_name}</span>
                   </div>
                   {video.vod_director && (
                   <div className="flex flex-col space-y-1">
                      <span className="text-gray-500">导演</span>
                      <span className="text-gray-800 dark:text-gray-200 leading-relaxed break-all whitespace-pre-wrap">{video.vod_director}</span>
                   </div>
                   )}
                   {video.vod_actor && (
                   <div className="flex flex-col space-y-1">
                      <span className="text-gray-500">主演</span>
                      <span className="text-gray-800 dark:text-gray-200 leading-relaxed text-xs break-all whitespace-pre-wrap">{video.vod_actor}</span>
                   </div>
                   )}
                   <div className="flex flex-col space-y-1">
                      <span className="text-gray-500">地区/年份/分类</span>
                      <span className="text-gray-800 dark:text-gray-200">{video.vod_area} / {video.vod_year} / {video.vod_class || video.type_name}</span>
                   </div>
                   <div className="flex flex-col space-y-1">
                      <span className="text-gray-500">播放源站</span>
                      <span className="font-medium text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded mr-auto">{video._sourceName}</span>
                   </div>
                   <div className="flex flex-col space-y-1">
                      <span className="text-gray-500">源直连地址</span>
                      <div className="bg-gray-50 dark:bg-black/50 p-2 rounded-lg break-all text-[11px] text-gray-600 dark:text-gray-400 max-h-24 overflow-y-auto custom-scrollbar">
                         {rawUrl || '无合法链接'}
                      </div>
                   </div>
                   {video.vod_content && (
                   <div className="flex flex-col space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                      <span className="text-gray-500">剧情简介</span>
                      <div className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed max-h-32 overflow-y-auto custom-scrollbar" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(video.vod_content || '')}}></div>
                   </div>
                   )}
                </div>
             </div>
          </div>
       )}


    </div>
  )
}

export default function PlayPage() {
  return (
    <Suspense fallback={
       <div className="fixed inset-y-0 right-0 left-0 md:left-64 z-[60] bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center text-gray-500 space-y-4">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-sm">引擎接入中...</span>
       </div>
    }>
      <PlayerContent />
    </Suspense>
  )
}
