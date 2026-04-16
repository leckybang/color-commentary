const ARCHETYPES = [
  {
    name: 'The Gatekeeper',
    emoji: '🎟️',
    test: (stats) => stats.totalPicks >= 15 && stats.uniqueGenres <= 4,
    description: "You have a type and you will die on that hill. Your recommendations come with a subtle warning: if you don't love this, we might need to rethink things.",
  },
  {
    name: 'The Feral Librarian',
    emoji: '📖',
    test: (stats) => stats.uniqueGenres >= 8 && stats.categoriesWithGenres >= 3,
    description: "Memoir, true crime, art-house cinema, a random jazz deep-cut — you're reading three books at once and ranking them in your head. Nothing is off the table.",
  },
  {
    name: 'The Completionist',
    emoji: '🗂️',
    test: (stats) => stats.totalPicks >= 10 && stats.categoriesWithGenres <= 2,
    description: "You find a director, a band, an author — and then you consume their ENTIRE catalog in chronological order before moving on. This is not a flaw.",
  },
  {
    name: 'The Cozy Rewatcher',
    emoji: '☕',
    test: (stats) => stats.totalGenres <= 4 && stats.totalPicks <= 8,
    description: "You've seen the same five comfort shows seventeen times and your algorithm has given up trying to convert you. We respect that deeply.",
  },
  {
    name: 'The Tastemaker-at-Large',
    emoji: '📣',
    test: (stats) => stats.totalPicks >= 12 && stats.categoriesWithGenres >= 3 && stats.uniqueGenres >= 5,
    description: "You're in three group chats where you're the de facto critic. Your takes are loud, informed, and slightly performative. We love this for you.",
  },
  {
    name: 'The Soft Snob',
    emoji: '🫧',
    test: (stats) => stats.totalPicks >= 6 && stats.uniqueGenres <= 5 && stats.categoriesWithGenres >= 2,
    description: "You claim to like everything but really you only like things that have been quietly vetted by three taste-making editors you secretly follow. It's giving curated.",
  },
  {
    name: 'The Night Owl Critic',
    emoji: '🌙',
    test: (stats) => stats.totalPicks >= 8 && stats.uniqueGenres >= 4,
    description: "Everything gets a review in your head at 1am. Some of these reviews are poetry. None of them leave the Notes app, until now.",
  },
]

const DEFAULT_ARCHETYPE = {
  name: 'The Blank Page',
  emoji: '📝',
  description: "You're about to become someone whose opinions people text each other about. The question is only which flavor of insufferable you'll be. (Affectionate.)",
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
