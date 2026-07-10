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
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border-[1.5px] transition-all ${
              isSelected
                ? 'scale-[1.03] text-text-primary'
                : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
            }`}
            style={isSelected ? {
              backgroundColor: `color-mix(in srgb, ${color} 28%, var(--color-bg-secondary))`,
              borderColor: 'var(--color-text-primary)',
              boxShadow: '2.5px 2.5px 0 color-mix(in srgb, var(--color-text-primary) 15%, transparent)',
            } : {
              borderColor: 'var(--color-border)',
            }}
          >
            {isSelected && <Check size={14} strokeWidth={3} />}
            {option}
          </button>
        )
      })}
    </div>
  )
}
