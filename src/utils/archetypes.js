const ARCHETYPES = [
  {
    name: 'The Curator',
    emoji: '🎯',
    test: (stats) => stats.totalPicks >= 15 && stats.uniqueGenres <= 4,
    description: "You don't browse. You select. Your taste is a velvet rope and most things aren't getting in.",
  },
  {
    name: 'The Genre Hopper',
    emoji: '🦋',
    test: (stats) => stats.uniqueGenres >= 8 && stats.categoriesWithGenres >= 3,
    description: "You contain multitudes. Sci-fi before breakfast, poetry at lunch, horror by midnight. We love the range.",
  },
  {
    name: 'The Deep Diver',
    emoji: '🤿',
    test: (stats) => stats.totalPicks >= 10 && stats.categoriesWithGenres <= 2,
    description: "You found your lane and you're doing 90 in it. We'll keep surfacing the deep cuts you crave.",
  },
  {
    name: 'The Creature of Comforts',
    emoji: '🛋️',
    test: (stats) => stats.totalGenres <= 4 && stats.totalPicks <= 8,
    description: "You know what you like and you're not apologizing. Comfort is king. We'll find more of the good stuff.",
  },
  {
    name: 'The Tastemaker',
    emoji: '✨',
    test: (stats) => stats.totalPicks >= 12 && stats.categoriesWithGenres >= 3 && stats.uniqueGenres >= 5,
    description: "Your friends definitely text you 'what should I watch tonight.' This is your natural habitat.",
  },
]

const DEFAULT_ARCHETYPE = {
  name: 'The Explorer',
  emoji: '🧭',
  description: "You're at the beginning of something beautiful. Or chaotic. Probably both. Let's find out.",
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

  for (const archetype of ARCHETYPES) {
    if (archetype.test(stats)) {
      return { name: archetype.name, emoji: archetype.emoji, description: archetype.description }
    }
  }

  return DEFAULT_ARCHETYPE
}
