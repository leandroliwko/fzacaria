'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'
import { useState } from 'react'

export default function WhatsAppButton() {
  const [tooltip, setTooltip] = useState(true)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-cream rounded-xl shadow-xl px-4 py-3 max-w-[200px] relative"
          >
            <button
              onClick={() => setTooltip(false)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-lavender/30 rounded-full flex items-center justify-center hover:bg-lavender/50"
            >
              <X className="w-3 h-3 text-navy" />
            </button>
            <p className="text-navy text-sm font-medium">¿Necesitás ayuda?</p>
            <p className="text-navy-light text-xs mt-0.5">
              Chateá con nosotros por WhatsApp
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Button */}
      <a
        href="https://wa.me/5492254449764?text=Hola! Quiero consultar sobre una propiedad"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-pulse"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 2, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-shadow"
        >
          <MessageCircle className="w-7 h-7 text-white fill-white" />
        </motion.div>
      </a>
    </div>
  )
}
