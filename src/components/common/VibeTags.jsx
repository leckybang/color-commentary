/**
 * VibeTagPicker — the two-group chip picker for vibe tags.
 * VibeTagList  — read-only chips for showing what's already on an item.
 */

import { VIBE_GROUPS, MAX_VIBE_TAGS, getVibeTag, sanitizeVibeTags, toggleVibeTag, vibeTagsIn } from '../../data/vibeTags'

function groupColor(groupKey) {
  return VIBE_GROUPS.find((g) => g.key === groupKey)?.color || 'var(--color-accent-primary)'
}

export function VibeTagList({ tags, size = 'sm', className = '' }) {
  const clean = sanitizeVibeTags(tags)
  if (clean.length === 0) return null
  const textSize = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {clean.map((id) => {
        const tag = getVibeTag(id)
        const color = groupColor(tag.group)
        return (
          <span
            key={id}
            title={tag.hint}
            className={`rounded-full font-semibold ${textSize}`}
            style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          >
            {tag.label}
          </span>
        )
      })}
    </div>
  )
}

export default function VibeTagPicker({ tags, onChange, compact = false }) {
  const selected = sanitizeVibeTags(tags)
  const atLimit = selected.length >= MAX_VIBE_TAGS

  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
      {VIBE_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
            {group.label}
            {!compact && <span className="ml-2 font-medium normal-case tracking-normal opacity-80">{group.hint}</span>}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {vibeTagsIn(group.key).map((tag) => {
              const active = selected.includes(tag.id)
              // Once you're at the cap, unpicked chips go quiet rather than
              // disappearing — the shape of the picker stays put.
              const blocked = atLimit && !active
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onChange(toggleVibeTag(selected, tag.id))}
                  disabled={blocked}
                  title={blocked ? `Pick up to ${MAX_VIBE_TAGS}` : tag.hint}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-full text-xs border-[1.5px] transition-all active:scale-95 ${
                    active ? 'font-bold' : 'font-semibold hover:opacity-90'
                  } ${blocked ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{
                    color: group.color,
                    backgroundColor: `color-mix(in srgb, ${group.color} ${active ? 22 : 8}%, var(--color-bg-secondary))`,
                    borderColor: active ? `color-mix(in srgb, ${group.color} 55%, transparent)` : 'transparent',
                  }}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
