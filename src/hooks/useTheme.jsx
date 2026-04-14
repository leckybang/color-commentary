import { useState, useEffect, createContext, useContext } from 'react'
import { THEMES, DEFAULT_THEME_INDEX } from '../config/themes'

const ThemeContext = createContext(null)

function applyTheme(theme) {
  const root = document.documentElement.style
  root.setProperty('--color-bg-primary', theme.bg.primary)
  root.setProperty('--color-bg-secondary', theme.bg.secondary)
  root.setProperty('--color-bg-tertiary', theme.bg.tertiary)
  root.setProperty('--color-bg-hover', theme.bg.hover)
  root.setProperty('--color-border', theme.border)
  root.setProperty('--color-text-primary', theme.text.primary)
  root.setProperty('--color-text-secondary', theme.text.secondary)
  root.setProperty('--color-text-muted', theme.text.muted)
  root.setProperty('--color-accent-music', theme.accents.music)
  root.setProperty('--color-accent-movies', theme.accents.movies)
  root.setProperty('--color-accent-tv', theme.accents.tv)
  root.setProperty('--color-accent-books', theme.accents.books)
  root.setProperty('--color-accent-primary', theme.accents.primary)
  root.setProperty('--color-accent-hover', theme.accents.hover)
  if (theme.headingFont) root.setProperty('--font-heading', theme.headingFont)
  if (theme.bodyFont) root.setProperty('--font-body', theme.bodyFont)
}

export function ThemeProvider({ children }) {
  const [themeIndex, setThemeIndex] = useState(() => {
    const saved = localStorage.getItem('cc_theme')
    return saved !== null ? parseInt(saved, 10) : DEFAULT_THEME_INDEX
  })

  const currentTheme = THEMES[themeIndex] || THEMES[DEFAULT_THEME_INDEX]

  useEffect(() => {
    applyTheme(currentTheme)
  }, [themeIndex])

  const setTheme = (index) => {
    setThemeIndex(index)
    localStorage.setItem('cc_theme', String(index))
  }

  return (
    <ThemeContext.Provider value={{ themeIndex, currentTheme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Fallback for components outside ThemeProvider
    return { themeIndex: 0, currentTheme: THEMES[0], setTheme: () => {}, themes: THEMES }
  }
  return ctx
}
