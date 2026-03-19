import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')
  
  try {
    const whereClause: { mode?: string } = {};
    if (mode) {
      whereClause.mode = mode;
    }

    const sources = await prisma.source.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: { order: 'asc' }
    })
    
    const token = request.cookies.get('fantv_token')?.value
    let isAdmin = false
    if (token) {
       const payload = await verifyToken(token)
       if (payload && payload.role === 'ADMIN') isAdmin = true
    }

    const maskedSources = sources.map(s => {
       if (isAdmin) return s
       const { apiUrl, ...rest } = s
       return { ...rest, apiUrl: '******** (仅管理员可见)' }
    })

    return NextResponse.json(maskedSources)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, apiUrl, mode } = body

    if (!name || !apiUrl || !mode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Assign lowest priority (max order) initially
    const count = await prisma.source.count({ where: { mode } })
    const source = await prisma.source.create({
      data: { name, apiUrl, mode, isActive: true, order: count }
    })
    return NextResponse.json(source)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, apiUrl, mode, isActive, order } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (apiUrl !== undefined) updateData.apiUrl = apiUrl
    if (mode !== undefined) updateData.mode = mode
    if (isActive !== undefined) updateData.isActive = isActive
    if (order !== undefined) updateData.order = order

    const source = await prisma.source.update({
      where: { id },
      data: updateData
    })
    return NextResponse.json(source)
  } catch(error) {
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  
  try {
    await prisma.source.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
