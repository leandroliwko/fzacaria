import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

export async function GET() {
  try {
    const auth = await getAuthStatus()

    // Public: only active articles. Admin: all articles.
    const where = auth.authenticated ? {} : { active: true }

    const articles = await prisma.article.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(articles)
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Map frontend field names to Prisma schema
    const data = {
      title: body.title || '',
      excerpt: body.excerpt || '',
      content: body.content || '',
      category: body.category || 'General',
      image: body.image || '',
      readTime: body.readTime || '5 min',
      active: body.published !== undefined ? body.published : (body.active !== undefined ? body.active : true),
    }

    const article = await prisma.article.create({ data })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error('Error creating article:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
