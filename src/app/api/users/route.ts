import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        allowAdultMode: true,
        isActive: true,
        role: true,
        createdAt: true,
      }
    })
    return NextResponse.json(users)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { username, passwordHash, allowAdultMode, isActive, role } = data

    if (!username) return NextResponse.json({ error: "必须填写用户名" }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) return NextResponse.json({ error: "用户已存在" }, { status: 400 })

    const sysSetting = await prisma.systemSetting.findUnique({ where: { id: 'global' } })
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: passwordHash || "123456", // dummy basic password default
        allowAdultMode: allowAdultMode ?? false,
        isActive: isActive ?? true,
        role: role || "USER",
        doubanDataProxy: sysSetting?.doubanDataProxy || "",
        doubanImageProxy: sysSetting?.doubanImageProxy || ""
      }
    })
    return NextResponse.json(user)
  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, username, passwordHash, allowAdultMode, isActive, role } = body
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const updateData: any = {
      username,
      allowAdultMode,
      isActive,
      role
    }
    
    // Only update password if provided
    if (passwordHash && passwordHash.trim() !== "") {
      updateData.passwordHash = passwordHash
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    })
    return NextResponse.json(user)
  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
