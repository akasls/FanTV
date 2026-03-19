import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sourceId = searchParams.get('sourceId')
  const vodId = searchParams.get('vodId')

  if (!sourceId || !vodId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  try {
    const source = await prisma.source.findUnique({
      where: { id: sourceId }
    })
    
    if (!source || !source.isActive) {
      return NextResponse.json({ error: 'Source not found or inactive' }, { status: 404 })
    }

    const fetchUrl = `${source.apiUrl}?ac=detail&ids=${vodId}`
    const res = await fetch(fetchUrl, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000)
    })
    const data = await res.json()
    
    if (!data.list || data.list.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    return NextResponse.json({
      video: {
         ...data.list[0],
         _sourceId: source.id,
         _sourceName: source.name
      }
    })
  } catch (err) {
    console.error('API /video error:', err)
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 })
  }
}
