/**
 * Logo — the Color Commentary mark: a commentary bubble holding three
 * media-colored dots. Matches favicon.svg / apple-touch-icon.svg.
 */
export default function Logo({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Color Commentary"
    >
      <defs>
        <linearGradient id="ccLogoBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a1840" />
          <stop offset="1" stopColor="#130d1c" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#ccLogoBg)" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="14.5" fill="none" stroke="#c49bff" strokeOpacity="0.25" />
      <path
        d="M16 13h32a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H29l-9 8 1.2-8H16a6 6 0 0 1-6-6V19a6 6 0 0 1 6-6z"
        fill="#ede8f5"
      />
      <circle cx="23" cy="28" r="4.2" fill="#ff7a8a" />
      <circle cx="32" cy="28" r="4.2" fill="#7ab8ff" />
      <circle cx="41" cy="28" r="4.2" fill="#7fe0a0" />
    </svg>
  )
}
