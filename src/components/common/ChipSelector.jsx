import { Check } from 'lucide-react'

export default function ChipSelector({ options, selected = [], onToggle, color = 'var(--color-accent-primary)' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
              isSelected
                ? 'border-transparent scale-[1.02]'
                : 'bg-bg-tertiary border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary hover:border-text-muted/30'
            }`}
            style={isSelected ? {
              backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
              color,
              borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
            } : {}}
          >
            {isSelected && <Check size={14} strokeWidth={3} />}
            {option}
          </button>
        )
      })}
    </div>
  )
}
