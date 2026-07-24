import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

// Public setup endpoint - creates admin user and pushes schema
// Should only be called once during initial setup
export async function POST(request: NextRequest) {
  try {
    const results: string[] = []

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`
      results.push('Database connection: OK')
    } catch (dbError: any) {
      results.push(`Database connection FAILED: ${dbError.message}`)
      return NextResponse.json({ error: 'Database connection failed', details: results }, { status: 500 })
    }

    // Create admin user if none exists
    const adminCount = await prisma.admin.count()
    if (adminCount === 0) {
      const body = await request.json().catch(() => ({}))
      const email = body.email || 'admin@florenciazacaria.com'
      const password = body.password || 'admin123'
      const hashedPassword = createHash('sha256').update(password).digest('hex')
      await prisma.admin.create({
        data: {
          email,
          password: hashedPassword,
          name: 'Admin',
        },
      })
      results.push(`Admin user created: ${email}`)
    } else {
      results.push(`Admin user already exists (${adminCount} found)`)
    }

    // Count properties
    const propCount = await prisma.property.count()
    results.push(`Properties in database: ${propCount}`)

    // Count temporadas
    const tempCount = await prisma.temporada.count()
    results.push(`Temporadas in database: ${tempCount}`)

    // Count articles
    const artCount = await prisma.article.count()
    results.push(`Articles in database: ${artCount}`)

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Setup failed', details: error.message }, { status: 500 })
  }
}

// GET - check database status only
export async function GET() {
  try {
    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (dbError: any) {
      return NextResponse.json({
        connected: false,
        error: dbError.message,
        hint: 'Check that DATABASE_URL is set correctly in Vercel environment variables. If using Neon, the database may be paused - visit console.neon.tech to resume it.'
      }, { status: 500 })
    }

    const adminCount = await prisma.admin.count()
    const propCount = await prisma.property.count()
    const tempCount = await prisma.temporada.count()
    const artCount = await prisma.article.count()

    return NextResponse.json({
      connected: true,
      admins: adminCount,
      properties: propCount,
      temporadas: tempCount,
      articles: artCount,
    })
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      error: error.message
    }, { status: 500 })
  }
}
