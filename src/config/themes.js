export const THEMES = [
  {
    name: 'Velvet Darkroom',
    tagline: 'Moody, cinematic, and intimate — like the back room of a vinyl bar',
    bg: {
      primary: '#110d18',
      secondary: '#1a1425',
      tertiary: '#241d30',
      hover: '#2e263c',
    },
    border: '#3a3050',
    text: {
      primary: '#ede8f5',
      secondary: '#a99fc0',
      muted: '#6e6488',
    },
    accents: {
      music: '#d4a0ff',
      movies: '#ff7a8a',
      tv: '#7ab8ff',
      books: '#7fe0a0',
      primary: '#c49bff',
      hover: '#b07af5',
    },
    gradient: 'linear-gradient(135deg, #110d18 0%, #1e1430 50%, #120e1a 100%)',
    headingFont: "'Libre Baskerville', serif",
    bodyFont: "'Karla', sans-serif",
    vibe: 'Deep violet and burgundy tones. Rich purples meet soft lavender. Feels like a cinema lobby after midnight.',
  },
  {
    name: 'Analog Cream',
    tagline: 'Warm, papery, and tactile — like flipping through a zine at a bookshop',
    bg: {
      primary: '#f5f0e8',
      secondary: '#ebe5d9',
      tertiary: '#ddd6c6',
      hover: '#d1c9b5',
    },
    border: '#c4baa4',
    text: {
      primary: '#2a2520',
      secondary: '#5c5347',
      muted: '#8a7e6f',
    },
    accents: {
      music: '#8b4fc6',
      movies: '#d94e3f',
      tv: '#2e7bbf',
      books: '#3a8a50',
      primary: '#c4622a',
      hover: '#a8501d',
    },
    gradient: 'linear-gradient(135deg, #f5f0e8 0%, #ebe0d0 50%, #f2ede5 100%)',
    headingFont: "'Libre Baskerville', serif",
    bodyFont: "'Karla', sans-serif",
    vibe: 'Light mode with warm cream backgrounds. Earthy burnt orange accent. Feels like a well-loved paperback.',
  },
  {
    name: 'Neon Noir',
    tagline: 'Electric and sharp — like a playlist that slaps at 2am',
    bg: {
      primary: '#050508',
      secondary: '#0c0c14',
      tertiary: '#14141f',
      hover: '#1c1c2a',
    },
    border: '#222238',
    text: {
      primary: '#e4e4f0',
      secondary: '#8888a8',
      muted: '#555570',
    },
    accents: {
      music: '#ff44ff',
      movies: '#ff3333',
      tv: '#33ccff',
      books: '#33ff88',
      primary: '#ff2d8a',
      hover: '#e01070',
    },
    gradient: 'linear-gradient(135deg, #050508 0%, #0a0515 50%, #050810 100%)',
    headingFont: "'Libre Baskerville', serif",
    bodyFont: "'Karla', sans-serif",
    vibe: 'True black with electric neon accents. Hot pink primary. Sharp, modern, unapologetic.',
  },
]

export const DEFAULT_THEME_INDEX = 0

// The current "warm olive" theme as the default CSS fallback
export const WARM_OLIVE = {
  name: 'Warm Olive',
  bg: { primary: '#1c1915', secondary: '#262219', tertiary: '#332e24', hover: '#3d3729' },
  border: '#4a432f',
  text: { primary: '#f0ebe0', secondary: '#b8ad96', muted: '#877e6a' },
  accents: { music: '#c47aff', movies: '#ff6b5a', tv: '#5bb8f5', books: '#7ec87e', primary: '#d4935e', hover: '#c17f48' },
}
