import { useState, useEffect } from 'react'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import Modal from '../common/Modal'
import AIParsedItemCard from './AIParsedItemCard'
import { parseNotesWithAI } from '../../services/aiParse'

export default function AIParseModal({ isOpen, onClose, initialText, onConfirm }) {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState('input') // 'input' | 'loading' | 'review' | 'error'
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setText(initialText || '')
      setPhase('input')
      setItems([])
      setError(null)
    }
  }, [isOpen, initialText])

  const handleParse = async () => {
    if (!text.trim()) return
    setPhase('loading')
    setError(null)
    try {
      const result = await parseNotesWithAI(text)
      if (!result.items || result.items.length === 0) {
        setPhase('review')
        setItems([])
        return
      }
      // Prepare items with UI state — pre-check high/medium confidence
      const prepared = result.items.map((item, i) => ({
        ...item,
        _id: `parsed-${i}`,
        included: item.confidence !== 'low',
        addToCatalog: !!item.rating, // default on if rating was inferred
      }))
      setItems(prepared)
      setPhase('review')
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setPhase('error')
    }
  }

  const handleUpdateItem = (updated) => {
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i))
  }

  const handleConfirm = () => {
    const included = items.filter(i => i.included && i.title.trim())
    onConfirm(included)
  }

  const includedCount = items.filter(i => i.included).length

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Parse with AI" maxWidth="640px">
      {phase === 'input' && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Paste or write freeform notes. AI will identify media items, figure out types,
            infer ratings, and organize them into sections. You'll review and confirm before
            anything gets added.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Watched Dune 2 this weekend — loved it, 5/5. Started reading Piranesi by Susanna Clarke, weird but cool. Also been spinning the new Vampire Weekend album nonstop."
            rows={8}
            maxLength={4000}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{text.length}/4000 characters</span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleParse}
                disabled={!text.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-accent-primary hover:bg-accent-hover text-white transition-colors disabled:opacity-50"
              >
                <Sparkles size={14} />
                Parse
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="py-12 text-center">
          <Loader2 size={32} className="mx-auto text-accent-primary animate-spin mb-3" />
          <p className="text-sm text-text-secondary">Reading your notes and extracting media items...</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="py-8 text-center">
          <AlertCircle size={32} className="mx-auto text-accent-movies mb-3" />
          <p className="text-sm font-medium text-text-primary mb-1">Something went wrong</p>
          <p className="text-xs text-text-muted mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setPhase('input')}
              className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleParse}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-primary hover:bg-accent-hover text-white transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary mb-1">No media items found in your notes.</p>
              <p className="text-xs text-text-muted mb-4">Try being more specific about titles.</p>
              <button
                onClick={() => setPhase('input')}
                className="px-4 py-2 rounded-lg text-sm bg-bg-tertiary hover:bg-bg-hover text-text-primary transition-colors"
              >
                Edit Notes
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                Found <strong className="text-text-primary">{items.length} item{items.length === 1 ? '' : 's'}</strong>. Uncheck any you don't want, edit details, and add them to your Liner Notes.
              </p>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {items.map(item => (
                  <AIParsedItemCard
                    key={item._id}
                    item={item}
                    onChange={handleUpdateItem}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  onClick={() => setPhase('input')}
                  className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={includedCount === 0}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-accent-primary hover:bg-accent-hover text-white transition-colors disabled:opacity-50"
                >
                  Add {includedCount} item{includedCount === 1 ? '' : 's'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
