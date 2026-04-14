import { ExternalLink } from 'lucide-react'
import { getMediaLinks } from '../../utils/mediaLinks'

export default function ExternalLinks({ type, title, creator }) {
  const links = getMediaLinks(type, title, creator)
  if (links.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={11} />
          {link.label}
        </a>
      ))}
    </div>
  )
}
