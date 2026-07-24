'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Image as ImageIcon,
  Clock,
  Tag,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ImageUploader } from '@/components/admin/ImageUploader'

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

const categories = [
  { value: 'mercado-inmobiliario', label: 'Mercado Inmobiliario' },
  { value: 'consejos', label: 'Consejos' },
  { value: 'tendencias', label: 'Tendencias' },
  { value: 'inversiones', label: 'Inversiones' },
  { value: 'legales', label: 'Legales' },
  { value: 'decoracion', label: 'Decoración' },
  { value: 'general', label: 'General' },
]

const emptyArticle = {
  title: '',
  excerpt: '',
  content: '',
  category: 'general',
  image: '',
  readTime: '5 min',
  active: true,
}

export default function AdminArticulos() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyArticle)
  const [saving, setSaving] = useState(false)

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/articles')
      if (res.ok) {
        const data = await res.json()
        setArticles(data)
      }
    } catch {
      toast.error('Error al cargar artículos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  function openCreate() {
    setEditingArticle(null)
    setFormData(emptyArticle)
    setDialogOpen(true)
  }

  function openEdit(article: Article) {
    setEditingArticle(article)
    setFormData({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      category: article.category,
      image: article.image,
      readTime: article.readTime,
      active: article.active,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.title || !formData.excerpt) {
      toast.error('Complete los campos obligatorios: título y resumen')
      return
    }

    setSaving(true)
    try {
      if (editingArticle) {
        const res = await fetch(`/api/articles/${editingArticle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          toast.success('Artículo actualizado')
        } else {
          throw new Error()
        }
      } else {
        const res = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          toast.success('Artículo creado')
        } else {
          throw new Error()
        }
      }
      setDialogOpen(false)
      fetchArticles()
    } catch {
      toast.error('Error al guardar artículo')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/articles/${deletingId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Artículo eliminado')
        fetchArticles()
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Error al eliminar artículo')
    } finally {
      setDeleteDialogOpen(false)
      setDeletingId(null)
    }
  }

  async function toggleActive(id: string, value: boolean) {
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: value }),
      })
      if (res.ok) {
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, active: value } : a))
        )
        toast.success(value ? 'Artículo publicado' : 'Artículo despublicado')
      }
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy">Artículos</h2>
          <p className="text-navy-light mt-1">{articles.length} artículos en total</p>
        </div>
        <Button onClick={openCreate} className="bg-gold hover:bg-gold-dark text-white shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Artículo
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
        <Input
          placeholder="Buscar artículos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 border-navy/20 focus:border-gold"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-lavender-light" />
          </button>
        )}
      </div>

      {/* Articles list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-lavender mx-auto mb-3" />
            <p className="text-navy-light">No se encontraron artículos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="hidden sm:block w-24 h-24 rounded-lg bg-soft overflow-hidden flex-shrink-0">
                    {article.image ? (
                      <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-lavender" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-navy truncate">{article.title}</h3>
                        <p className="text-sm text-navy-light mt-1 line-clamp-2">{article.excerpt}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="text-[10px] border-gold/30 text-gold-dark">
                            <Tag className="w-3 h-3 mr-1" />
                            {categories.find((c) => c.value === article.category)?.label || article.category}
                          </Badge>
                          <span className="text-xs text-lavender-light flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.readTime}
                          </span>
                          <span className="text-xs text-lavender-light">
                            {new Date(article.createdAt).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={article.active}
                            onCheckedChange={(v) => toggleActive(article.id, v)}
                            className="data-[state=checked]:bg-gold"
                          />
                          <span className="text-xs text-navy-light hidden md:inline">
                            {article.active ? 'Publicado' : 'Borrador'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(article)}
                          className="h-8 w-8 text-navy hover:text-gold"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingId(article.id)
                            setDeleteDialogOpen(true)
                          }}
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-navy">
              {editingArticle ? 'Editar Artículo' : 'Nuevo Artículo'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título del artículo"
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="excerpt">Resumen *</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Breve resumen del artículo..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="content">Contenido</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Contenido completo del artículo..."
                rows={8}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="readTime">Tiempo de lectura</Label>
              <Input
                id="readTime"
                value={formData.readTime}
                onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                placeholder="5 min"
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-2">
              <ImageUploader
                value={formData.image}
                onChange={(url) => setFormData({ ...formData, image: url })}
                label="Imagen del artículo"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.active}
                onCheckedChange={(v) => setFormData({ ...formData, active: v })}
                className="data-[state=checked]:bg-gold"
              />
              <Label>Publicado</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gold hover:bg-gold-dark text-white"
            >
              {saving ? 'Guardando...' : editingArticle ? 'Guardar Cambios' : 'Crear Artículo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar artículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El artículo será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
