import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET || 'fantv_super_secret_key_2026'
const key = new TextEncoder().encode(secretKey)

export async function signToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key)
    return payload
  } catch (error) {
    return null
  }
}
