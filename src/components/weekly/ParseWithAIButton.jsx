import { Sparkles } from 'lucide-react'

export default function ParseWithAIButton({ onClick, hasText }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!hasText}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      title={hasText ? "Let AI turn your notes into structured items" : "Write some notes first"}
    >
      <Sparkles size={13} />
      Parse with AI
    </button>
  )
}
