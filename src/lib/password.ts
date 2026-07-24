import { createHash } from 'crypto'

export async function hashPassword(password: string): Promise<string> {
  const hash = createHash('sha256').update(password).digest('hex')
  return hash
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = createHash('sha256').update(password).digest('hex')
  return hash === hashedPassword
}
