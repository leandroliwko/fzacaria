'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Mail,
  MailOpen,
  User,
  Phone,
  Clock,
  Search,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ContactMessage {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  read: boolean
  createdAt: string
}

export default function AdminMensajes() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [filterUnread, setFilterUnread] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/contact-messages')
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch {
      toast.error('Error al cargar mensajes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  async function toggleRead(id: string, currentRead: boolean) {
    try {
      const res = await fetch(`/api/contact-messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: !currentRead }),
      })
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, read: !currentRead } : m))
        )
        toast.success(currentRead ? 'Mensaje marcado como no leído' : 'Mensaje marcado como leído')
      }
    } catch {
      toast.error('Error al actualizar')
    }
  }

  function openDetail(message: ContactMessage) {
    setSelectedMessage(message)
    setDetailOpen(true)
    if (!message.read) {
      toggleRead(message.id, false)
    }
  }

  const unreadCount = messages.filter((m) => !m.read).length

  const filtered = messages.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase()) ||
      m.message.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filterUnread ? !m.read : true
    return matchesSearch && matchesFilter
  })

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
          <h2 className="text-2xl font-bold text-navy">Mensajes</h2>
          <p className="text-navy-light mt-1">
            {messages.length} mensajes en total • {unreadCount} sin leer
          </p>
        </div>
        <Button
          variant={filterUnread ? 'default' : 'outline'}
          onClick={() => setFilterUnread(!filterUnread)}
          className={filterUnread ? 'bg-gold hover:bg-gold-dark text-white' : 'border-gold/30 text-gold-dark hover:bg-gold/10'}
        >
          <Mail className="w-4 h-4 mr-2" />
          {filterUnread ? 'Ver todos' : 'Sin leer'}
          {unreadCount > 0 && !filterUnread && (
            <Badge className="ml-2 bg-red-500 text-white text-[10px] px-1.5">{unreadCount}</Badge>
          )}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
        <Input
          placeholder="Buscar mensajes..."
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

      {/* Messages list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-12 h-12 text-lavender mx-auto mb-3" />
            <p className="text-navy-light">No se encontraron mensajes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((message) => (
            <Card
              key={message.id}
              className={`cursor-pointer hover:shadow-md transition-all ${
                !message.read ? 'bg-gold/5 border-gold/20' : ''
              }`}
              onClick={() => openDetail(message)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.read ? 'bg-soft' : 'bg-gold/20'
                  }`}>
                    {message.read ? (
                      <MailOpen className="w-5 h-5 text-lavender-light" />
                    ) : (
                      <Mail className="w-5 h-5 text-gold" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className={`font-medium truncate ${!message.read ? 'text-navy' : 'text-navy-dark'}`}>
                          {message.name}
                        </h3>
                        {!message.read && (
                          <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-lavender-light flex-shrink-0">
                        {new Date(message.createdAt).toLocaleDateString('es-AR')}
                      </span>
                    </div>

                    {message.subject && (
                      <p className="text-sm font-medium text-navy mt-0.5 truncate">
                        {message.subject}
                      </p>
                    )}

                    <p className="text-sm text-navy-light mt-0.5 truncate">{message.message}</p>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-lavender-light flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {message.email}
                      </span>
                      {message.phone && (
                        <span className="text-xs text-lavender-light flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {message.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleRead(message.id, message.read)
                      }}
                      className="h-8 w-8 text-lavender-light hover:text-gold"
                    >
                      {message.read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Message Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-navy">Detalle del Mensaje</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selectedMessage.read ? 'bg-soft' : 'bg-gold/20'
                }`}>
                  {selectedMessage.read ? (
                    <MailOpen className="w-6 h-6 text-lavender-light" />
                  ) : (
                    <Mail className="w-6 h-6 text-gold" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-navy">{selectedMessage.name}</p>
                  <p className="text-sm text-navy-light">{selectedMessage.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xs text-lavender-light mb-1">Email</p>
                  <p className="text-sm text-navy">{selectedMessage.email}</p>
                </div>
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xs text-lavender-light mb-1">Teléfono</p>
                  <p className="text-sm text-navy">{selectedMessage.phone || 'No proporcionado'}</p>
                </div>
              </div>

              {selectedMessage.subject && (
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xs text-lavender-light mb-1">Asunto</p>
                  <p className="text-sm text-navy font-medium">{selectedMessage.subject}</p>
                </div>
              )}

              <div className="p-3 bg-surface rounded-lg">
                <p className="text-xs text-lavender-light mb-1">Mensaje</p>
                <p className="text-sm text-navy whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-lavender-light flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(selectedMessage.createdAt).toLocaleString('es-AR')}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleRead(selectedMessage.id, selectedMessage.read)}
                    className="border-navy/20 text-navy"
                  >
                    {selectedMessage.read ? 'Marcar no leído' : 'Marcar leído'}
                  </Button>
                  <a href={`mailto:${selectedMessage.email}`}>
                    <Button size="sm" className="bg-gold hover:bg-gold-dark text-white">
                      Responder
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
