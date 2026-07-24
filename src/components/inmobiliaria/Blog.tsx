'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, ArrowRight, BookOpen, TrendingUp, Loader2, X, Share2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Article {
  id: string
  title: string
  excerpt: string
  content: string
  category: string
  image: string
  readTime: string
  active: boolean
  createdAt: string
  updatedAt: string
}

const categoryLabels: Record<string, string> = {
  'mercado-inmobiliario': 'Mercado Inmobiliario',
  'consejos': 'Consejos',
  'tendencias': 'Tendencias',
  'inversiones': 'Inversiones',
  'legales': 'Legal',
  'decoracion': 'Decoración',
  'finanzas': 'Finanzas',
  'alquileres': 'Alquileres',
  'ventas': 'Ventas',
  'general': 'General',
}

const categoryColors: Record<string, string> = {
  'mercado-inmobiliario': 'bg-navy-light',
  'consejos': 'bg-gold',
  'tendencias': 'bg-lavender',
  'inversiones': 'bg-teal-pale',
  'legales': 'bg-navy-light',
  'decoracion': 'bg-pink-500',
  'finanzas': 'bg-red-500',
  'alquileres': 'bg-gold',
  'ventas': 'bg-navy',
  'general': 'bg-soft',
}

const defaultImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80'

// Handle image load errors - fallback to default
function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (img.src !== defaultImage) {
    img.src = defaultImage
  }
}

export default function Blog() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [articleOpen, setArticleOpen] = useState(false)

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/articles')
      if (res.ok) {
        const data = await res.json()
        setArticles(data)
      }
    } catch {
      console.error('Error al cargar artículos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const getCategoryLabel = (cat: string) => categoryLabels[cat] || cat
  const getCategoryColor = (cat: string) => categoryColors[cat] || 'bg-soft'

  function openArticle(article: Article) {
    setSelectedArticle(article)
    setArticleOpen(true)
    document.body.style.overflow = 'hidden'
  }

  function closeArticle() {
    setArticleOpen(false)
    document.body.style.overflow = ''
  }

  return (
    <section id="blog" className="py-20 lg:py-28 bg-surface lavender-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-gold font-semibold text-sm tracking-[0.2em] uppercase">
            Nuestro Blog
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-3 mb-4">
            Noticias y Artículos
          </h2>
          <div className="section-divider mb-6" />
          <p className="text-navy max-w-2xl mx-auto text-lg">
            Información actualizada sobre el mercado inmobiliario, consejos legales
            y financieros, y mucho más.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" />
            <p className="text-navy-light">Cargando artículos...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-lavender mx-auto mb-4" />
            <p className="text-navy-light text-lg">Próximamente nuevos artículos</p>
            <p className="text-lavender-light text-sm mt-2">Estamos preparando contenido para vos</p>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-10"
            >
              <div className="grid lg:grid-cols-2 gap-6 bg-cream rounded-2xl overflow-hidden shadow-md group cursor-pointer hover:shadow-xl transition-shadow" onClick={() => openArticle(articles[0])}>
                <div className="relative h-64 lg:h-auto overflow-hidden">
                  <img
                    src={articles[0].image || defaultImage}
                    alt={articles[0].title}
                    onError={handleImgError}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className={`${getCategoryColor(articles[0].category)} text-white px-3`}>
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Destacado
                    </Badge>
                  </div>
                </div>
                <div className="p-6 lg:p-8 flex flex-col justify-center">
                  <Badge variant="outline" className="w-fit mb-3 text-gold border-gold/30">
                    {getCategoryLabel(articles[0].category)}
                  </Badge>
                  <h3 className="text-2xl font-bold text-navy mb-3 group-hover:text-gold-dark transition-colors">
                    {articles[0].title}
                  </h3>
                  <p className="text-navy mb-4 leading-relaxed">{articles[0].excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-lavender-light mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(articles[0].createdAt)}
                    </span>
                    {articles[0].readTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {articles[0].readTime}
                      </span>
                    )}
                  </div>
                  <button className="flex items-center gap-1 text-navy font-medium group-hover:text-gold transition-colors">
                    Leer artículo completo
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* More Posts */}
            {articles.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.slice(1).map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-cream rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer"
                    onClick={() => openArticle(post)}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.image || defaultImage}
                        alt={post.title}
                        onError={handleImgError}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <Badge variant="outline" className="text-gold border-gold/30 mb-2 text-xs">
                        {getCategoryLabel(post.category)}
                      </Badge>
                      <h4 className="font-bold text-navy mb-2 group-hover:text-gold-dark transition-colors line-clamp-2">
                        {post.title}
                      </h4>
                      <p className="text-navy-light text-sm line-clamp-2 mb-3">{post.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-lavender-light">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(post.createdAt)}
                        </span>
                        {post.readTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.readTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {articleOpen && selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={closeArticle}
          >
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-3xl bg-cream rounded-2xl shadow-2xl my-4 sm:my-8 mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeArticle}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-navy-dark/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-navy-dark/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Hero Image */}
              <div className="relative h-56 sm:h-72 md:h-80 overflow-hidden">
                <img
                  src={selectedArticle.image || defaultImage}
                  alt={selectedArticle.title}
                  onError={handleImgError}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <Badge className={`${getCategoryColor(selectedArticle.category)} text-white px-3 mb-3`}>
                    {getCategoryLabel(selectedArticle.category)}
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                    {selectedArticle.title}
                  </h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8">
                {/* Meta */}
                <div className="flex items-center gap-4 text-sm text-lavender-light mb-6 pb-6 border-b border-lavender/30">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatDate(selectedArticle.createdAt)}
                  </span>
                  {selectedArticle.readTime && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {selectedArticle.readTime}
                    </span>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(window.location.href)
                      } catch {}
                    }}
                    className="ml-auto flex items-center gap-1.5 text-gold hover:text-gold-dark transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Compartir
                  </button>
                </div>

                {/* Excerpt */}
                {selectedArticle.excerpt && (
                  <p className="text-lg text-navy-dark font-medium leading-relaxed mb-6 italic border-l-4 border-gold pl-4">
                    {selectedArticle.excerpt}
                  </p>
                )}

                {/* Full Content */}
                <div className="prose prose-lg max-w-none text-navy leading-relaxed whitespace-pre-line">
                  {selectedArticle.content || selectedArticle.excerpt || 'Contenido no disponible.'}
                </div>

                {/* Back button */}
                <div className="mt-8 pt-6 border-t border-lavender/30 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={closeArticle}
                    className="border-navy text-navy hover:bg-navy hover:text-white"
                  >
                    ← Volver al blog
                  </Button>
                  <a
                    href={`https://wa.me/5492254449764?text=${encodeURIComponent('Hola! Leí el artículo: ' + selectedArticle.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="bg-[#25D366] hover:bg-[#20BD5A] text-white">
                      Consultar sobre este artículo
                    </Button>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
