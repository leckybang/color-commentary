import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = '500px' }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      {/* Bottom sheet on phones (full-bleed, stable height, keyboard-friendly);
          centered max-width card on larger screens. The max width must NOT
          apply in sheet mode or page content peeks out beside the sheet. */}
      <div
        className="bg-bg-secondary border-t sm:border border-border rounded-t-2xl sm:rounded-2xl w-full overflow-hidden shadow-2xl h-[92dvh] sm:h-auto sm:max-w-[var(--modal-max-w)]"
        style={{ '--modal-max-w': maxWidth, maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
