/**
 * ShareCardPreview — full-screen preview of a generated share card with
 * Download / Share actions. `card` is { url, blob, filename } (from
 * buildItemCard / buildInsightCard callers); null renders nothing.
 */

import { Share2, Download } from 'lucide-react'
import { shareCardBlob, canShareFile, downloadBlob } from '../../utils/shareCard'

export default function ShareCardPreview({ card, onClose }) {
  if (!card) return null

  const handleShare = async () => {
    const result = await shareCardBlob(card.blob, card.filename)
    if (result === 'unsupported') downloadBlob(card.blob, card.filename)
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-bg-secondary border border-border rounded-2xl p-4 w-full flex flex-col items-center gap-3" style={{ maxWidth: '380px', maxHeight: '92vh' }}>
        <img src={card.url} alt="Your share card" className="w-full rounded-xl border border-border" style={{ maxHeight: '68vh', objectFit: 'contain' }} />
        <div className="flex gap-2 w-full">
          <button
            onClick={() => downloadBlob(card.blob, card.filename)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold border-[1.5px] border-text-primary text-text-primary hover:bg-bg-hover transition-colors"
          >
            <Download size={13} /> Download
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95"
            style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)', boxShadow: '2px 2px 0 var(--color-accent-primary)' }}
          >
            <Share2 size={13} /> {canShareFile(card.blob, card.filename) ? 'Share' : 'Save & post'}
          </button>
        </div>
        <button onClick={onClose} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
          Close
        </button>
      </div>
    </div>
  )
}
