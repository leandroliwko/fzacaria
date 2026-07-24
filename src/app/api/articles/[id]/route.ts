import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const article = await prisma.article.findUnique({ where: { id } })

    if (!article) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
    }

    return NextResponse.json(article)
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Map frontend field names to Prisma schema
    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.excerpt !== undefined) data.excerpt = body.excerpt
    if (body.content !== undefined) data.content = body.content
    if (body.category !== undefined) data.category = body.category
    if (body.image !== undefined) data.image = body.image
    if (body.readTime !== undefined) data.readTime = body.readTime
    if (body.published !== undefined) data.active = body.published
    if (body.active !== undefined) data.active = body.active

    const article = await prisma.article.update({ where: { id }, data })

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    await prisma.article.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
