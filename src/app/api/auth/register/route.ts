import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const sysSetting = await prisma.systemSetting.findUnique({ where: { id: 'global' } })
    // Explicit block for non-registered states
    if (!sysSetting || !sysSetting.allowRegistration) {
       return NextResponse.json({ error: "服务器当前未开放注册通道" }, { status: 403 })
    }

    const { username, password } = await req.json()
    if (!username || !password) return NextResponse.json({ error: "请输入完整的账号密码" }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) return NextResponse.json({ error: "用户名已被占用" }, { status: 400 })

    const newSessionId = crypto.randomUUID()
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: password,
        role: "USER",
        allowAdultMode: false,
        sessionId: newSessionId
      }
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
