import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')
  // Simulated user ID for demo purposes
  const userId = searchParams.get('userId') || 'demo-user-123' 

  if (!mode || (mode !== 'General' && mode !== 'Adult')) {
    return NextResponse.json({ error: 'Invalid mode specified' }, { status: 400 })
  }

  try {
    // 强制 mode 隔离查询：绝对不在 Adult 模式下返回 General 的数据，反之亦然。
    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
        mode
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(favorites)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
  }
}
