import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return new Response('Missing url', { status: 400 })
  
  try {
    const res = await fetch(url, { 
      headers: { 
        'Referer': 'https://movie.douban.com/', 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
      } 
    })
    
    // Explicitly load the binary buffer to avoid NextJS Readable stream edge cases
    const buffer = await res.arrayBuffer()
    
    return new Response(buffer, { 
      headers: { 
        'Content-Type': res.headers.get('content-type') || 'image/jpeg', 
        'Cache-Control': 'public, max-age=86400' 
      } 
    })
  } catch(e) {
    return new Response('Error fetching image', { status: 500 })
  }
}
