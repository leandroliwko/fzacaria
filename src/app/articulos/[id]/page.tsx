'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  ArrowLeft,
  BookOpen,
  Share2,
  Facebook,
  Instagram,
  MessageCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Navbar from '@/components/inmobiliaria/Navbar'
import Footer from '@/components/inmobiliaria/Footer'
import WhatsAppButton from '@/components/inmobiliaria/WhatsAppButton'

interface Article {
  id: string
  title: string
  excerpt: string
  content: string
  category: string
  image: string
  readTime: string
  createdAt: string
}

const categoryColors: Record<string, string> = {
  Ventas: 'bg-navy-light',
  Legal: 'bg-gold',
  Inversiones: 'bg-teal-pale',
  Finanzas: 'bg-red-500',
  Alquileres: 'bg-gold',
  General: 'bg-soft',
}

export default function ArticleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/articles/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then((data) => setArticle(data))
      .catch(() => setArticle(null))
      .finally(() => setLoading(false))
  }, [params.id])

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
        <WhatsAppButton />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <BookOpen className="w-16 h-16 text-lavender mb-4" />
          <h1 className="text-2xl font-bold text-navy mb-2">Artículo no encontrado</h1>
          <p className="text-navy-light mb-6">El artículo que buscás no existe o fue eliminado.</p>
          <Link
            href="/#blog"
            className="inline-flex items-center gap-2 bg-navy text-white px-6 py-3 rounded-lg font-medium hover:bg-navy-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al blog
          </Link>
        </div>
        <Footer />
        <WhatsAppButton />
      </div>
    )
  }

  // Render content: support both plain text and HTML
  const renderContent = (content: string) => {
    if (!content) return null

    // If content contains HTML tags, render as HTML
    if (/<[a-z][\s\S]*>/i.test(content)) {
      return (
        <div
          className="prose prose-lg max-w-none prose-headings:text-navy prose-headings:font-bold prose-a:text-gold prose-a:no-underline hover:prose-a:underline prose-strong:text-navy prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )
    }

    // Otherwise render as plain text with paragraph breaks
    return content.split('\n').map((paragraph, i) => {
      if (!paragraph.trim()) return null
      return (
        <p key={i} className="text-navy-dark text-lg leading-relaxed mb-4">
          {paragraph}
        </p>
      )
    })
  }

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      <article className="pt-8 pb-20">
        {/* Hero Image */}
        <div className="relative h-72 sm:h-96 lg:h-[480px] w-full overflow-hidden">
          {article.image ? (
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-navy/5 flex items-center justify-center">
              <BookOpen className="w-20 h-20 text-navy/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-16">
            <div className="max-w-4xl mx-auto">
              <Badge
                className={`${categoryColors[article.category] || 'bg-soft'} text-white px-3 py-1 mb-4`}
              >
                {article.category}
              </Badge>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
                {article.title}
              </h1>
              <div className="flex items-center gap-4 text-white/70 text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(article.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {article.readTime} de lectura
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-cream rounded-2xl shadow-xl p-6 sm:p-10 lg:p-14 border border-lavender/30"
          >
            {/* Excerpt */}
            {article.excerpt && (
              <p className="text-lg text-navy leading-relaxed mb-8 font-medium border-l-4 border-gold pl-4 italic">
                {article.excerpt}
              </p>
            )}

            {/* Body */}
            <div className="mb-10">{renderContent(article.content)}</div>

            {/* Share & Back */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8 border-t border-lavender/30">
              <Link
                href="/#blog"
                className="inline-flex items-center gap-2 text-navy font-medium hover:text-gold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al blog
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm text-lavender-light">Compartir:</span>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-navy rounded-lg flex items-center justify-center text-white hover:bg-navy-dark transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(article.title + ' ' + (typeof window !== 'undefined' ? window.location.href : ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-gold rounded-lg flex items-center justify-center text-white hover:bg-gold-dark transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </article>

      <Footer />
      <WhatsAppButton />
    </div>
  )
}
