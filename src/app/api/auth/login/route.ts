import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body
    
    if (!username || !password) {
      return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 })
    }

    let adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    if (adminCount === 0) {
       await prisma.user.create({
         data: { username: 'admin', passwordHash: 'admin123', role: 'ADMIN', allowAdultMode: true }
       })
    }

    const user = await prisma.user.findUnique({ where: { username } })
    
    if (!user || user.passwordHash !== password) {
       return NextResponse.json({ error: "账号或密码错误" }, { status: 401 })
    }
    
    if (!user.isActive) {
       return NextResponse.json({ error: "该账号已被禁用" }, { status: 403 })
    }

    const newSessionId = crypto.randomUUID()
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionId: newSessionId }
    })

    const token = await signToken({ id: user.id, username: user.username, role: user.role, sessionId: newSessionId })
    
    const response = NextResponse.json({
       id: user.id,
       username: user.username,
       role: user.role,
       allowAdultMode: user.allowAdultMode,
       sourceOrder: user.sourceOrder
    })
    
    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
    response.cookies.set({
      name: 'fantv_token',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60
    })
    
    return response

  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
