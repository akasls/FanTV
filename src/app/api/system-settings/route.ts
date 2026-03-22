import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('fantv_token')?.value
    if (token) {
       const payload = await verifyToken(token)
       if (payload && payload.role === 'ADMIN') {
         let setting = await prisma.systemSetting.findUnique({ where: { id: 'global' } })
         if (!setting) {
             setting = await prisma.systemSetting.create({ data: { id: 'global', allowRegistration: true, allowGuestAccess: false, siteName: 'FanTv', siteDescription: 'A modern dual-mode video application.', siteLogo: '' } })
         }
         return NextResponse.json(setting)
       }
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('fantv_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    
    const body = await request.json()
    const { allowRegistration, allowGuestAccess, siteName, siteDescription, siteLogo, doubanDataProxy, doubanImageProxy, speedTestPlayback, shortDramaApiUrl, shortDramaCategories } = body

    const updateData: any = {}
    if (allowRegistration !== undefined) updateData.allowRegistration = allowRegistration
    if (allowGuestAccess !== undefined) updateData.allowGuestAccess = allowGuestAccess
    if (siteName !== undefined) updateData.siteName = siteName
    if (siteDescription !== undefined) updateData.siteDescription = siteDescription
    if (siteLogo !== undefined) updateData.siteLogo = siteLogo
    if (doubanDataProxy !== undefined) updateData.doubanDataProxy = doubanDataProxy
    if (doubanImageProxy !== undefined) updateData.doubanImageProxy = doubanImageProxy
    if (speedTestPlayback !== undefined) updateData.speedTestPlayback = speedTestPlayback
    if (shortDramaApiUrl !== undefined) updateData.shortDramaApiUrl = shortDramaApiUrl
    if (shortDramaCategories !== undefined) updateData.shortDramaCategories = shortDramaCategories

    const setting = await prisma.systemSetting.upsert({
      where: { id: 'global' },
      update: updateData,
      create: { 
         id: 'global', 
         allowRegistration: allowRegistration ?? false, 
         allowGuestAccess: allowGuestAccess ?? false,
         siteName: siteName ?? 'FanTv',
         siteDescription: siteDescription ?? 'A modern dual-mode video application.',
         siteLogo: siteLogo ?? '',
         doubanDataProxy: doubanDataProxy ?? '',
         doubanImageProxy: doubanImageProxy ?? '',
         speedTestPlayback: speedTestPlayback ?? true,
         shortDramaApiUrl: shortDramaApiUrl ?? null,
         shortDramaCategories: shortDramaCategories ?? null
      }
    })
    
    return NextResponse.json(setting)
  } catch(error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
