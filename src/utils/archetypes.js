const ARCHETYPES = [
  {
    name: 'The Gatekeeper',
    emoji: '🎟️',
    test: (stats) => stats.totalPicks >= 15 && stats.uniqueGenres <= 4,
    description: "You’re a tastemaker and you know the lore behind the lore. The phrase ‘strong opinions, loosely held’ does not apply to you.",
  },
  {
    name: 'The Shelf Stacker',
    emoji: '📖',
    test: (stats) => stats.uniqueGenres >= 8 && stats.categoriesWithGenres >= 3,
    description: "You know the micro genre behind the micro genre, and your ‘to consume’ list is endless. Just don’t let it collect dust.",
  },
  {
    name: 'The Completionist',
    emoji: '🗂️',
    test: (stats) => stats.totalPicks >= 10 && stats.categoriesWithGenres <= 2,
    description: "You find a director, a band, an author, and then you consume their entire catalog in chronological order because missing one detail might destroy your expertise.",
  },
  {
    name: 'The Cozy Rewatcher',
    emoji: '☕',
    test: (stats) => stats.totalGenres <= 4 && stats.totalPicks <= 8,
    description: "A cup of tea, a blanket, a cat or two and a TV marathon. That’s your happy place.",
  },
  {
    name: 'The Influencer',
    emoji: '📣',
    test: (stats) => stats.totalPicks >= 12 && stats.categoriesWithGenres >= 3 && stats.uniqueGenres >= 5,
    description: "That obscure title you secretly loved a few months ago just hit the best seller list. And you’re not afraid to remind people of that.",
  },
  {
    name: 'The Soft Snob',
    emoji: '🫧',
    test: (stats) => stats.totalPicks >= 6 && stats.uniqueGenres <= 5 && stats.categoriesWithGenres >= 2,
    description: "You claim to like everything but prefer to hold your endorsement until something is quietly vetted by three taste-making editors.",
  },
  {
    name: 'The Night Owl Critic',
    emoji: '🌙',
    test: (stats) => stats.totalPicks >= 8 && stats.uniqueGenres >= 4,
    description: "Who needs sleep? You’re turning pages, finishing shows and leaving your hot takes in your notes app at 2 a.m.",
  },
]

const DEFAULT_ARCHETYPE = {
  name: 'The Blank Page',
  emoji: '📝',
  description: "You enigma you. Add some titles to your log already so your mystique will turn into respected taste.",
}

export function determineArchetype(profile) {
  const allGenres = []
  const allPicks = []
  let categoriesWithGenres = 0

  for (const category of ['music', 'movies', 'tv', 'books']) {
    const cat = profile[category]
    if (!cat) continue

    const genres = cat.genres || []
    if (genres.length > 0) categoriesWithGenres++
    allGenres.push(...genres)

    for (const [field, values] of Object.entries(cat)) {
      if (field !== 'genres' && Array.isArray(values)) {
        allPicks.push(...values)
      }
    }
  }

  const stats = {
    totalGenres: allGenres.length,
    uniqueGenres: new Set(allGenres).size,
    categoriesWithGenres,
    totalPicks: allPicks.length,
  }

  // A truly empty profile is The Blank Page — without this, the Cozy
  // Rewatcher test (small numbers) matches all-zero stats and the default
  // never fires.
  if (stats.totalGenres === 0 && stats.totalPicks === 0) {
    return DEFAULT_ARCHETYPE
  }

  for (const archetype of ARCHETYPES) {
    if (archetype.test(stats)) {
      return { name: archetype.name, emoji: archetype.emoji, description: archetype.description }
    }
  }

  return DEFAULT_ARCHETYPE
}
