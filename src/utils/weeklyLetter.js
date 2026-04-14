import { getWeekRange, formatWeekRange } from './dateUtils'

const GREETINGS = [
  'Happy {day}, you person of taste.',
  'Well, well, well. Look who showed up.',
  'Another week, another excuse to avoid your responsibilities.',
  'Good news: your radar is pinging. Bad news: your to-watch list just got longer.',
  'Pull up a chair. Or don\'t. We\'re not your mom.',
  'Hope your queue isn\'t too unhinged already.',
  'Your weekly dispatch from the fringes of good taste.',
  '*taps microphone* Is this thing on?',
]

const CLOSINGS = [
  'Happy watching, reading, and aggressively recommending things to friends.',
  'Go forth and consume irresponsibly.',
  'See you next week — same time, same unfinished backlog.',
  'Now go add something to the catalog before you forget and have to google "that movie with the thing" later.',
  'That\'s the radar. Trust the algorithm (it\'s literally just your own taste fed back to you).',
  'Until next time — your queue isn\'t going to watch itself. Or... will it?',
  'We believe in you. Or at least in your taste. Same thing, probably.',
]

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length]
}

function dateSeed() {
  const d = new Date()
  return d.getFullYear() * 1000 + d.getMonth() * 50 + Math.floor(d.getDate() / 7)
}

function buildMusicSection(releases, discoveries, profile) {
  const musicReleases = releases.filter(r => r.type === 'music')
  const musicDiscoveries = discoveries.filter(d => d.type === 'music')
  if (musicReleases.length === 0 && musicDiscoveries.length === 0) return null

  const lines = []

  if (musicReleases.length > 0) {
    const r = musicReleases[0]
    const hasArtist = profile.music?.artists?.some(a => r.creator.toLowerCase().includes(a.toLowerCase()))
    if (hasArtist) {
      lines.push(`**${r.creator}** is back with *${r.title}*, and yes, it sounds exactly like what you need right now. ${r.description || ''}`)
    } else {
      lines.push(`On the music front, keep an eye on *${r.title}* by **${r.creator}**. ${r.description || ''}`)
    }
    if (musicReleases.length > 1) {
      const others = musicReleases.slice(1).map(r => `*${r.title}* (${r.creator})`).join(', ')
      lines.push(`Also dropping this week: ${others}.`)
    }
  }

  if (musicDiscoveries.length > 0) {
    const d = musicDiscoveries[0]
    lines.push(`And if you haven't heard **${d.creator}** yet — fix that. *${d.title}* is ${d.reason?.toLowerCase() || 'right in your wheelhouse'}.`)
  }

  return { title: 'On the Turntable', emoji: '🎵', body: lines.join(' ') }
}

function buildMovieSection(releases, discoveries, profile) {
  const movieReleases = releases.filter(r => r.type === 'movie')
  const movieDiscoveries = discoveries.filter(d => d.type === 'movie')
  if (movieReleases.length === 0 && movieDiscoveries.length === 0) return null

  const lines = []

  if (movieReleases.length > 0) {
    const r = movieReleases[0]
    const hasDirector = profile.movies?.directors?.some(d => r.creator.toLowerCase().includes(d.toLowerCase()))
    if (hasDirector) {
      lines.push(`Your favorite director **${r.creator}** has a new one. *${r.title}* — ${r.description || `a new ${r.genre} film`}. Clear your evening.`)
    } else {
      lines.push(`In theaters: *${r.title}* from **${r.creator}**. ${r.description || ''} Worth your time if you're into ${r.genre?.toLowerCase() || 'good films'}.`)
    }
    if (movieReleases.length > 1) {
      const others = movieReleases.slice(1).map(r => `*${r.title}* (${r.creator})`).join(', ')
      lines.push(`Also on our radar: ${others}.`)
    }
  }

  if (movieDiscoveries.length > 0) {
    const d = movieDiscoveries[0]
    lines.push(`Discovery pick: **${d.creator}**'s *${d.title}*. ${d.description || ''} ${d.creatorNote ? d.creatorNote : ''}`)
  }

  return { title: 'At the Movies', emoji: '🎬', body: lines.join(' ') }
}

function buildTVSection(releases, discoveries) {
  const tvReleases = releases.filter(r => r.type === 'tv')
  const tvDiscoveries = discoveries.filter(d => d.type === 'tv')
  if (tvReleases.length === 0 && tvDiscoveries.length === 0) return null

  const lines = []

  if (tvReleases.length > 0) {
    const r = tvReleases[0]
    lines.push(`Streaming-wise, *${r.title}* lands on **${r.creator}** this week. ${r.description || ''} ${r.creatorNote ? r.creatorNote : ''}`)
    if (tvReleases.length > 1) {
      const others = tvReleases.slice(1).map(r => `*${r.title}* (${r.creator})`).join(', ')
      lines.push(`Also premiering: ${others}.`)
    }
  }

  if (tvDiscoveries.length > 0) {
    const d = tvDiscoveries[0]
    lines.push(`Sleeper pick: *${d.title}* on ${d.creator}. ${d.description || ''} Trust us on this one.`)
  }

  return { title: 'On the Small Screen', emoji: '📺', body: lines.join(' ') }
}

function buildBookSection(releases, discoveries, profile) {
  const bookReleases = releases.filter(r => r.type === 'book')
  const bookDiscoveries = discoveries.filter(d => d.type === 'book')
  if (bookReleases.length === 0 && bookDiscoveries.length === 0) return null

  const lines = []

  if (bookReleases.length > 0) {
    const r = bookReleases[0]
    const hasAuthor = profile.books?.authors?.some(a => r.creator.toLowerCase().includes(a.toLowerCase()))
    if (hasAuthor) {
      lines.push(`**${r.creator}** has a new book and you should probably pre-order it immediately. *${r.title}* — ${r.description || ''} ${r.creatorNote ? r.creatorNote : ''}`)
    } else {
      lines.push(`On the nightstand: *${r.title}* by **${r.creator}**. ${r.description || ''} Hits shelves soon.`)
    }
    if (bookReleases.length > 1) {
      const others = bookReleases.slice(1).map(r => `*${r.title}* (${r.creator})`).join(', ')
      lines.push(`Also out: ${others}.`)
    }
  }

  if (bookDiscoveries.length > 0) {
    const d = bookDiscoveries[0]
    lines.push(`And for your discovery shelf: *${d.title}* by **${d.creator}**. ${d.reason || ''}.`)
  }

  return { title: 'On the Nightstand', emoji: '📚', body: lines.join(' ') }
}

export function generateWeeklyLetter(profile, radar) {
  const seed = dateSeed()
  const { start, end } = getWeekRange()
  const weekLabel = formatWeekRange(start, end)
  const day = DAYS[new Date().getDay()]

  const greeting = pick(GREETINGS, seed).replace('{day}', day)
  const closing = pick(CLOSINGS, seed + 3)

  // Count what they follow
  const artistCount = (profile.music?.artists?.length || 0) + (profile.movies?.directors?.length || 0) + (profile.books?.authors?.length || 0) + (profile.tv?.shows?.length || 0)
  const genreCount = [
    ...(profile.music?.genres || []),
    ...(profile.movies?.genres || []),
    ...(profile.tv?.genres || []),
    ...(profile.books?.genres || []),
  ].length

  let intro = ''
  if (artistCount > 5) {
    intro = `You've got a lot of people to keep up with — ${artistCount} creators on your radar — so let's cut to what matters this week.`
  } else if (genreCount > 4) {
    intro = `With your taste spanning ${genreCount} genres, there's no shortage of things to be excited about this week.`
  } else {
    intro = `Here's what's new in the corners of culture you care about most.`
  }

  const sections = [
    buildMusicSection(radar.newReleases, radar.discoveries, profile),
    buildMovieSection(radar.newReleases, radar.discoveries, profile),
    buildTVSection(radar.newReleases, radar.discoveries),
    buildBookSection(radar.newReleases, radar.discoveries, profile),
  ].filter(Boolean)

  return {
    weekLabel,
    greeting,
    intro,
    sections,
    closing,
    signoff: '— Your Color Commentary Radar',
  }
}
