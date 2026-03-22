import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface MacCMSResponse {
  code?: number
  msg?: string
  list?: any[]
  class?: { type_id: string | number, type_name: string }[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')
  const sourceId = searchParams.get('sourceId')
  const wd = searchParams.get('wd')
  const pg = searchParams.get('pg') || '1'
  const t = searchParams.get('t')
  const searchAll = searchParams.get('searchAll') === 'true'
  const sortBySourceOrder = searchParams.get('sortBySourceOrder') === 'true'
  
  if (!mode || (mode !== 'General' && mode !== 'Adult')) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  try {
    // 1. Get active sources matching the current mode (and optional sourceId)
    const targetSourceId = (wd && searchAll) ? undefined : (sourceId && sourceId !== 'all' ? sourceId : undefined)
    const customApiUrl = searchParams.get('customApiUrl')

    let sources = []
    if (customApiUrl) {
      sources = [{ id: 'custom', name: '自定义源', apiUrl: customApiUrl, mode }]
    } else {
      sources = await prisma.source.findMany({
        where: { 
          mode, 
          isActive: true,
          ...(targetSourceId ? { id: targetSourceId } : {})
        },
        orderBy: { order: 'asc' }
      })
    }

    if (sources.length === 0) {
      return NextResponse.json({ list: [], categories: [] })
    }

    let extractedCategories: any[] = []

    // 2. Fetch MacCMS JSON concurrently
    const fetchPromises = sources.map(async (source: { id: string, name: string, apiUrl: string }) => {
      try {
        let fetchUrl = ''
        try {
           const urlObj = new URL(source.apiUrl)
           urlObj.searchParams.set('ac', wd ? 'detail' : 'videolist')
           if (wd) urlObj.searchParams.set('wd', wd)
           if (pg) urlObj.searchParams.set('pg', String(pg))
           if (t && !urlObj.searchParams.has('t')) urlObj.searchParams.set('t', String(t))
           fetchUrl = urlObj.toString()
        } catch(e) {
           const queryParams = new URLSearchParams()
           queryParams.append('ac', wd ? 'detail' : 'videolist')
           if (wd) queryParams.append('wd', wd)
           if (pg) queryParams.append('pg', String(pg))
           if (t) queryParams.append('t', String(t))
           fetchUrl = `${source.apiUrl}${source.apiUrl.includes('?') ? '&' : '?'}${queryParams.toString()}`
        }

        const res = await fetch(fetchUrl, { 
          // Revalidate every hour or keep it dynamic
          next: { revalidate: 60 },
          signal: AbortSignal.timeout(8000) 
        })
        const data: MacCMSResponse = await res.json()
        
        // Extract classes from the first successful node that provides them
        
        let classData = data.class
        if (classData && !Array.isArray(classData) && typeof classData === 'object') {
           classData = Object.values(classData)
        }
        
        if (classData && Array.isArray(classData) && classData.length > 0 && extractedCategories.length === 0) {
          extractedCategories = classData
        }

        // Secondary fallback to forcefully query classes if the primary node stripped them
        if (extractedCategories.length === 0) {
           try {
              const classRes = await fetch(`${source.apiUrl}?ac=list`, { signal: AbortSignal.timeout(4000) })
              const classRaw = await classRes.json()
              let rawClassData = classRaw.class
              if (rawClassData && !Array.isArray(rawClassData) && typeof rawClassData === 'object') {
                 rawClassData = Object.values(rawClassData)
              }
              if (rawClassData && Array.isArray(rawClassData) && rawClassData.length > 0) {
                 extractedCategories = rawClassData
              }
           } catch(e) {
              // fallback fetch failed
           }
        }
        
        // Inject source ID to track clicks / streams
        return (data.list || []).map((item: any) => ({
          ...item,
          _sourceId: source.id,
          _sourceName: source.name
        }))
      } catch (err) {
        console.error(`Failed to fetch from ${source.name} (${source.apiUrl}):`, err)
        return []
      }
    })

    const results = await Promise.all(fetchPromises)
    
    // 3. Flatten the Multi-Dimensional Arrays and exclude irrelevant content natively
    const invalidKeywords = ["解说", "预告", "预览"];
    let allVideos = results.flat().filter((item: any) => {
       const text = ((item.vod_name || "") + " " + (item.type_name || "") + " " + (item.vod_remarks || "")).toLowerCase();
       return !invalidKeywords.some(keyword => text.includes(keyword));
    })
    
    // 4. Sort aggregated videos
    if (sortBySourceOrder) {
        const sourceIndexMap = new Map();
        sources.forEach((s: any, idx: number) => sourceIndexMap.set(s.id, idx));
        allVideos.sort((a: any, b: any) => {
            const idxA = sourceIndexMap.has(a._sourceId) ? sourceIndexMap.get(a._sourceId) : 999;
            const idxB = sourceIndexMap.has(b._sourceId) ? sourceIndexMap.get(b._sourceId) : 999;
            return idxA - idxB;
        });
    } else {
        // Default sort by latest update time
        allVideos.sort((a: any, b: any) => new Date(b.vod_time).getTime() - new Date(a.vod_time).getTime())
    }

    // Return the aggregated list and the categories
    return NextResponse.json({ list: allVideos, categories: extractedCategories })
    
  } catch (error) {
    console.error('API /videos error:', error)
    return NextResponse.json({ error: 'Failed to fetch aggregated videos' }, { status: 500 })
  }
}
