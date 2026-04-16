import { Sparkles } from 'lucide-react'

export default function ParseWithAIButton({ onClick, hasText, variant = 'solid' }) {
  if (variant === 'ghost') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!hasText}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title={hasText ? 'Let AI turn your notes into structured items' : 'Write something first'}
      >
        <Sparkles size={13} />
        Add with AI
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!hasText}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-accent-primary hover:bg-accent-hover text-white transition-all hover:shadow-lg hover:shadow-accent-primary/20 hover:scale-[1.02] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
      title={hasText ? 'Let AI turn your notes into structured items' : 'Write some notes first'}
    >
      <Sparkles size={15} />
      Add with AI
    </button>
  )
}
