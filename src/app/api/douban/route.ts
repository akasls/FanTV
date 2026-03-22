import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tags = searchParams.get('tags') || '电影' // 电影, 电视剧, 综艺, 动漫, 纪录片
  const genres = searchParams.get('genres') || ''
  const countries = searchParams.get('countries') || ''
  const year_range = searchParams.get('year_range') || ''
  const sort = searchParams.get('sort') || 'U' // U=近期热门, T=最新上线, S=评分最高
  const start = searchParams.get('start') || '0'
  
  // Mapping MacCMS categories to Douban Tags
  const tagMapping: Record<string, string> = {
     '连续剧': '电视剧',
     '国产剧': '电视剧',
     '欧美剧': '电视剧',
     '日韩剧': '电视剧',
     '综艺片': '综艺',
     '动漫片': '动漫',
     '纪录片': '纪录片',
     '电影片': '电影',
     '短剧大全': '短片',
     '体育赛事': '运动'
  }
  
  let mappedTags = tags
  if (tagMapping[tags]) mappedTags = tagMapping[tags]
  else if (tags.includes('剧')) mappedTags = '电视剧'
  else if (tags.includes('综艺')) mappedTags = '综艺'
  else if (tags.includes('动漫')) mappedTags = '动漫'
  else if (tags.includes('纪录')) mappedTags = '纪录片'
  else if (tags.includes('电影')) mappedTags = '电影'
  else mappedTags = '电影' // Fallback
  
  try {
    const params = new URLSearchParams()
    params.append('sort', sort)
    params.append('range', '0,10')
    params.append('tags', mappedTags)
    params.append('start', start)
    if (genres) params.append('genres', genres)
    if (countries) params.append('countries', countries)
    if (year_range) params.append('year_range', year_range)

    let doubanUrl = `https://movie.douban.com/j/new_search_subjects?${params.toString()}`

    // Intercept with Data Proxy if configured
    try {
      if (!(global as any).prisma) {
        const { PrismaClient } = require('@prisma/client')
        ;(global as any).prisma = new PrismaClient()
      }
      
      let proxyToUse = ''
      
      // Try to get user token mapping
      const { cookies } = require('next/headers')
      const { verifyToken } = require('@/lib/auth')
      const cookieStore = cookies()
      const token = cookieStore.get('fantv_token')?.value
      
      if (token) {
         try {
           const payload = await verifyToken(token)
           if (payload && payload.id) {
             const user = await (global as any).prisma.user.findUnique({ where: { id: payload.id } })
             if (user && user.doubanDataProxy !== null && user.doubanDataProxy !== undefined) {
               proxyToUse = user.doubanDataProxy
             }
           }
         } catch(e) {}
      }
      
      // Fallback to global
      if (proxyToUse === '') {
        const setting = await (global as any).prisma.systemSetting.findUnique({ where: { id: 'global' } })
        if (setting && setting.doubanDataProxy) {
           proxyToUse = setting.doubanDataProxy
        }
      }
      
      if (proxyToUse && proxyToUse !== '') {
         let p = proxyToUse.replace(/\/$/, '')
         if (p.includes('cors.zwei.ren')) {
             doubanUrl = `${p}/https://movie.douban.com/j/new_search_subjects?${params.toString()}`
         } else {
             // Domain substitution (e.g., https://movie.douban.com -> https://proxy.com)
             doubanUrl = doubanUrl.replace('https://movie.douban.com', p)
         }
      }
    } catch (e) { console.error('Failed to parse Douban Data Proxy from local db', e) }
    
    // Fetch from Douban with a mocked User-Agent to bypass simple blocks
    const response = await fetch(doubanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://movie.douban.com/',
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (!response.ok) {
      throw new Error(`Douban API responded with ${response.status}`)
    }
    
    const data = await response.json()
    // Returns { data: [ { title, rate, cover, id } ] }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching Douban data:', error)
    return NextResponse.json({ data: [] }, { status: 500 })
  }
}
