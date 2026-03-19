import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sourceId = searchParams.get('sourceId')
  
  if (!sourceId || sourceId === 'all') {
    return NextResponse.json({ categories: [] })
  }

  try {
    const source = await prisma.source.findUnique({ where: { id: sourceId } })
    if (!source || !source.isActive) {
       return NextResponse.json({ categories: [] })
    }

    // Ping the lightweight 'list' mode directly for categories!
    const res = await fetch(`${source.apiUrl}?ac=list`, { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    
    let classData = data.class
    if (classData && !Array.isArray(classData) && typeof classData === 'object') {
       classData = Object.values(classData)
    }
    
    return NextResponse.json({ categories: classData || [] })
  } catch (err) {
    console.error('Fast category fetch failed:', err)
    return NextResponse.json({ categories: [] })
  }
}
