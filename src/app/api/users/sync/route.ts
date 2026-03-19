import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('fantv_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = payload.id as string
    const body = await req.json()
    const { action, historyData, favoriteData, sourceOrder } = body

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.sessionId !== payload.sessionId) {
       return NextResponse.json({ error: 'Unauthorized Session' }, { status: 401 })
    }

    // [ACTION: WIPE]
    if (action === 'wipe_history') {
       await prisma.user.update({ where: { id: userId }, data: { historyData: null } })
       return NextResponse.json({ success: true, message: 'Cloud History Wiped' })
    }
    if (action === 'wipe_favorites') {
       await prisma.user.update({ where: { id: userId }, data: { favoriteData: null } })
       return NextResponse.json({ success: true, message: 'Cloud Favorites Wiped' })
    }

    // [ACTION: SYNC_DOWN]
    if (action === 'pull') {
       return NextResponse.json({
         sourceOrder: user.sourceOrder ? JSON.parse(user.sourceOrder) : null,
         historyData: user.historyData ? JSON.parse(user.historyData) : null,
         favoriteData: user.favoriteData ? JSON.parse(user.favoriteData) : null
       })
    }

    // [ACTION: SYNC_UP]
    const updateData: any = {}
    if (sourceOrder) updateData.sourceOrder = JSON.stringify(sourceOrder)
    if (historyData) updateData.historyData = JSON.stringify(historyData)
    if (favoriteData) updateData.favoriteData = JSON.stringify(favoriteData)

    if (Object.keys(updateData).length > 0) {
       await prisma.user.update({
         where: { id: userId },
         data: updateData
       })
    }

    return NextResponse.json({ success: true })

  } catch(error: any) {
    return NextResponse.json({ error: 'Sync Failed: ' + error.message }, { status: 500 })
  }
}
