// Big pools so daily rotations don't repeat. Each list is intentionally
// over-stocked across genres / decades / international taste-makers so the
// "pick of 3" Taste Check stays surprising round after round.

export const CALIBRATION_QUESTIONS = [
  {
    id: 'music-artists',
    question: 'Pick a musician',
    short: 'Pick the musician you love most',
    subtitle: 'Music',
    category: 'music',
    field: 'artists',
    options: [
      // Indie / alt / singer-songwriter
      'Phoebe Bridgers', 'Mitski', 'Big Thief', 'Bon Iver', 'Sufjan Stevens',
      'The National', 'Fleet Foxes', 'Vampire Weekend', 'Arcade Fire', 'LCD Soundsystem',
      'Japanese Breakfast', 'Soccer Mommy', 'Snail Mail', 'Lucy Dacus', 'boygenius',
      'Faye Webster', 'Wet Leg', 'Adrianne Lenker', 'Waxahatchee', 'Indigo De Souza',
      'Father John Misty', 'Andrew Bird', 'Iron & Wine', 'Bright Eyes', 'Death Cab for Cutie',
      'Wilco', 'The Beths', 'Yo La Tengo', 'Stereolab', 'Spoon',
      // Hip-Hop / rap
      'Kendrick Lamar', 'Tyler, the Creator', 'JPEGMAFIA', 'Earl Sweatshirt', 'Anderson .Paak',
      'Little Simz', 'Noname', 'Run the Jewels', 'Danny Brown', 'Vince Staples',
      'Mac Miller', 'MF DOOM', 'Drake', 'J. Cole', 'Travis Scott',
      'Doechii', 'Saba', 'Rapsody', 'Pusha T', 'Freddie Gibbs',
      // R&B / soul
      'Frank Ocean', 'SZA', 'Solange', 'Beyoncé', 'Erykah Badu',
      "D'Angelo", 'Blood Orange', 'Moses Sumney', 'Steve Lacy', 'Daniel Caesar',
      'Sade', 'Jorja Smith', 'Cleo Sol', 'Snoh Aalegra', 'Rina Sawayama',
      // Pop / pop-adjacent
      'Taylor Swift', 'Lorde', 'Charli XCX', 'Olivia Rodrigo', 'Billie Eilish',
      'Carly Rae Jepsen', 'Caroline Polachek', 'Robyn', 'Dua Lipa', 'Chappell Roan',
      'Halsey', 'FKA twigs', 'Florence + the Machine', 'Lana Del Rey', 'Kacey Musgraves',
      // Classic / canonical
      'Radiohead', 'Stevie Wonder', 'Prince', 'David Bowie', 'Joni Mitchell',
      'Fleetwood Mac', 'Talking Heads', 'Nick Cave', 'Tom Waits', 'Leonard Cohen',
      'Aretha Franklin', 'Patti Smith', 'Björk', 'Kate Bush', 'PJ Harvey',
      // Country / Americana
      'Sturgill Simpson', 'Jason Isbell', 'Brandi Carlile', 'Tyler Childers', 'Margo Price',
      'Bonnie "Prince" Billy', 'Lori McKenna', 'Hurray for the Riff Raff', 'Orville Peck', 'Lukas Nelson',
      // Electronic / experimental
      'Aphex Twin', 'Four Tet', 'Floating Points', 'Caribou', 'Burial',
      'James Blake', 'Bonobo', 'Jamie xx', 'Flying Lotus', 'Jon Hopkins',
      'Tame Impala', 'St. Vincent', 'Beach House', 'Arca', 'Yves Tumor',
      // Jazz / global
      'Arooj Aftab', 'Kamasi Washington', 'Chet Baker', 'Robert Glasper', 'Hiatus Kaiyote',
      'Khruangbin', 'Bad Bunny', 'Rosalía', 'Sampa the Great', 'Mdou Moctar',
    ],
  },
  {
    id: 'music-genres',
    question: 'Pick a music genre',
    short: 'Pick the music genre that feels most like you',
    subtitle: 'Music',
    category: 'music',
    field: 'genres',
    options: [
      'Indie Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Folk', 'Pop',
      'Punk', 'Soul', 'Alternative', 'Ambient', 'Singer-Songwriter', 'Classical',
      'Country', 'Metal', 'Shoegaze', 'Post-Punk', 'Dance / House', 'Experimental',
      'World Music', 'Emo', 'Bedroom Pop', 'Neo-Soul', 'Drill', 'Lo-Fi',
      'Synth-Pop', 'Dream Pop', 'Trip-Hop', 'Math Rock', 'IDM',
      'Drum & Bass', 'Garage Rock', 'Psych Rock', 'Krautrock', 'Hyperpop',
      'Afrobeats', 'Reggaeton', 'K-Pop', 'J-Pop', 'Latin Alt',
      'Bossa Nova', 'Spiritual Jazz', 'Bluegrass', 'Folk Rock', 'Post-Rock',
    ],
  },
  {
    id: 'movies-directors',
    question: 'Pick a director',
    short: 'Pick the director whose films you seek out',
    subtitle: 'Film',
    category: 'movies',
    field: 'directors',
    options: [
      'Paul Thomas Anderson', 'Sofia Coppola', 'Wes Anderson', 'Christopher Nolan',
      'Denis Villeneuve', 'Greta Gerwig', 'Bong Joon-ho', 'Jordan Peele',
      'Ari Aster', 'Alfonso Cuarón', 'Noah Baumbach', 'Yorgos Lanthimos',
      'Céline Sciamma', 'Wong Kar-wai', 'Stanley Kubrick', 'Ingmar Bergman',
      'David Fincher', 'Spike Lee', 'Kathryn Bigelow', 'Charlie Kaufman',
      'Kelly Reichardt', 'Agnès Varda', 'Richard Linklater', 'Park Chan-wook',
      'Lynne Ramsay', 'Todd Field', 'Robert Eggers', 'Pedro Almodóvar',
      'Martin Scorsese', 'Spike Jonze', 'Michel Gondry', 'Hirokazu Kore-eda',
      'Andrea Arnold', 'Lucrecia Martel', 'Mia Hansen-Løve', 'Joanna Hogg',
      'Steven Soderbergh', 'Quentin Tarantino', 'Apichatpong Weerasethakul', 'Claire Denis',
      'Barry Jenkins', 'Lulu Wang', 'Chloé Zhao', 'Ryusuke Hamaguchi',
      'Ava DuVernay', 'Jane Campion', 'Jonathan Glazer', 'Lars von Trier',
      'Krzysztof Kieślowski', 'Akira Kurosawa', 'Federico Fellini', 'Jean-Luc Godard',
      'Andrei Tarkovsky', 'Mike Leigh', 'Ken Loach', 'Hayao Miyazaki',
      'Edward Yang', 'Hou Hsiao-hsien', 'David Lynch', 'David Cronenberg',
      'Steven Spielberg', 'Coen Brothers', 'Rian Johnson', 'Damien Chazelle',
      'Trey Edward Shults', 'Brady Corbet', 'A24 (any)', 'S.S. Rajamouli',
    ],
  },
  {
    id: 'movies-genres',
    question: 'Pick a film vibe',
    short: 'Pick the kind of film you reach for',
    subtitle: 'Film',
    category: 'movies',
    field: 'genres',
    options: [
      'Drama', 'Thriller', 'Horror', 'Sci-Fi', 'Comedy', 'Documentary', 'Romance',
      'Action', 'Crime', 'Animation', 'Foreign Language', 'Indie', 'Fantasy',
      'Mystery', 'Period / Historical', 'Dark Comedy', 'Body Horror', 'Road Movie',
      'Neo-Noir', 'Coming-of-Age', 'Slow Cinema', 'Mumblecore', 'Heist',
      'Folk Horror', 'Psychological Thriller', 'Musical', 'Western', 'Erotic Thriller',
      'Anime', 'Stop-Motion', 'Found Footage', 'Mockumentary', 'Anthology',
    ],
  },
  {
    id: 'movies-actors',
    question: 'Pick an actor',
    short: 'Pick the actor you never miss',
    subtitle: 'Film',
    category: 'movies',
    field: 'actors',
    options: [
      'Cate Blanchett', 'Tilda Swinton', 'Daniel Day-Lewis', 'Meryl Streep',
      'Joaquin Phoenix', 'Viola Davis', 'Paul Dano', 'Florence Pugh',
      'Adam Driver', 'Saoirse Ronan', 'Oscar Isaac', "Lupita Nyong'o",
      'Tom Hanks', 'Isabelle Huppert', 'Timothée Chalamet', 'Chadwick Boseman',
      'Amy Adams', 'Michael Fassbender', 'Jennifer Lawrence', 'Mahershala Ali',
      'Michelle Yeoh', 'Pedro Pascal', 'Ana de Armas', 'Denzel Washington',
      'Frances McDormand', 'Robert De Niro', 'Andrew Scott', 'Paul Mescal',
      'Margot Robbie', 'Zoe Kravitz', 'Jeremy Strong', 'Brian Cox',
      'Sandra Hüller', 'Hong Chau', 'Stephanie Hsu', 'Ke Huy Quan',
      'Brendan Fraser', 'Cillian Murphy', 'Carey Mulligan', 'Andrew Garfield',
      'Steven Yeun', 'Aubrey Plaza', 'John C. Reilly', 'Bill Murray',
      'Toni Collette', 'Lily Gladstone', 'Jessie Buckley', 'Greta Lee',
    ],
  },
  {
    id: 'tv-shows',
    question: 'Pick a TV show',
    short: 'Pick the show you loved most',
    subtitle: 'TV',
    category: 'tv',
    field: 'shows',
    options: [
      'The Sopranos', 'The Wire', 'Mad Men', 'Breaking Bad', 'Succession',
      'Fleabag', 'The Americans', 'The Bear', 'Severance', 'Atlanta',
      'Barry', 'The White Lotus', 'Twin Peaks', 'Six Feet Under', 'Deadwood',
      'Station Eleven', 'I May Destroy You', 'The Leftovers', 'Arrested Development',
      '30 Rock', 'Veep', 'Abbott Elementary', 'What We Do in the Shadows',
      'Mindhunter', 'True Detective', 'Halt and Catch Fire', 'Dark',
      'Chernobyl', 'Better Call Saul', 'The Rehearsal', 'Nathan For You',
      'Party Down', 'Justified', 'Squid Game', 'Borgen',
      'Beef', 'Reservation Dogs', 'Pachinko', 'Shōgun',
      'Slow Horses', 'Industry', 'Top Boy', "I'm a Virgo",
      'Mr. Robot', 'Friday Night Lights', 'Game of Thrones', 'The Crown',
      'Russian Doll', 'GLOW', 'The Marvelous Mrs. Maisel', 'Insecure',
      'Pen15', 'Killing Eve', 'Big Little Lies', 'Mare of Easttown',
      'Andor', 'The Last of Us', 'Yellowjackets', 'Poker Face',
      'Hacks', 'Somebody Somewhere', 'Couples Therapy', 'Search Party',
      'Better Things', 'Master of None', 'Catastrophe', 'Detectorists',
    ],
  },
  {
    id: 'books-authors',
    question: 'Pick an author',
    short: 'Pick the author you love most',
    subtitle: 'Books',
    category: 'books',
    field: 'authors',
    options: [
      'Toni Morrison', 'Zadie Smith', 'Kazuo Ishiguro', 'Joan Didion',
      'Lorrie Moore', 'Sally Rooney', 'Ocean Vuong', 'Elena Ferrante',
      'Marilynne Robinson', 'Rachel Cusk', 'George Saunders', 'Colm Tóibín',
      'Jenny Offill', 'Don DeLillo', 'Hanya Yanagihara', 'Carmen Maria Machado',
      'Ottessa Moshfegh', 'Lucia Berlin', 'James Baldwin', 'Ursula K. Le Guin',
      'Octavia Butler', 'N.K. Jemisin', 'Ted Chiang', 'Cormac McCarthy',
      'David Foster Wallace', 'Maggie Nelson', 'Ta-Nehisi Coates', 'Rebecca Solnit',
      'Denis Johnson', 'Philip Roth', 'Annie Dillard', 'Ben Lerner',
      'Jhumpa Lahiri', 'Ali Smith', 'Jenny Zhang',
      'Patricia Lockwood', 'Brandon Taylor', 'R.F. Kuang', 'Lauren Groff',
      'Yiyun Li', 'Min Jin Lee', 'Tommy Orange', 'Bryan Washington',
      'Raven Leilani', 'Bryan Stevenson', 'Hua Hsu', 'Jamel Brinkley',
      'Bonnie Garmus', 'Sigrid Nunez', 'Tessa Hadley', 'Deborah Levy',
      'Annie Ernaux', 'Olga Tokarczuk', 'Karl Ove Knausgård', 'Roberto Bolaño',
      'Han Kang', 'Mariana Enriquez', 'Mieko Kawakami', 'Yoko Tawada',
      'Percival Everett', 'Susan Choi', 'Catherine Lacey', 'Garth Greenwell',
      'Olivia Laing', 'Sheila Heti', 'Eula Biss', 'Anne Carson',
      'Mary Oliver', 'Ross Gay', 'Hanif Abdurraqib', 'Maggie Smith',
    ],
  },
  {
    id: 'books-genres',
    question: 'Pick a reading mood',
    short: 'Pick the kind of book you reach for',
    subtitle: 'Books',
    category: 'books',
    field: 'genres',
    options: [
      'Literary Fiction', 'Mystery / Thriller', 'Science Fiction', 'Fantasy',
      'Historical Fiction', 'Short Stories', 'Essays', 'Horror', 'Memoir',
      'Non-Fiction', 'Romance', 'Poetry', 'Graphic Novel', 'Magical Realism',
      'Crime', 'Autofiction', 'Nature Writing', 'Biography', 'Climate Fiction',
      'Speculative Fiction', 'Translated Fiction', 'Cookbook',
      'Literary Horror', 'Coming-of-Age', 'Campus Novel', 'Quiet Drama',
      'Big Idea Non-Fiction', 'Cultural Criticism', 'Travel Writing',
    ],
  },
]

export const QUESTIONS_BY_ID = Object.fromEntries(
  CALIBRATION_QUESTIONS.map((q) => [q.id, q])
)

// Onboarding: one step per media type, showing the "names" question
export const ONBOARDING_STEPS = [
  { type: 'music',  label: 'Music',  questionId: 'music-artists'   },
  { type: 'movies', label: 'Film',   questionId: 'movies-directors' },
  { type: 'tv',     label: 'TV',     questionId: 'tv-shows'         },
  { type: 'books',  label: 'Books',  questionId: 'books-authors'    },
]

// Daily widget rotates through all question types by day-of-year
export function getDailyQuestion() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return CALIBRATION_QUESTIONS[dayOfYear % CALIBRATION_QUESTIONS.length]
}

// Returns a stable-but-shuffled subset of options for the given question,
// seeded by date so they're consistent within a day.
export function getDailyOptions(question, count = 18) {
  const seed = Math.floor(Date.now() / 86400000) // day number
  const arr = [...question.options]
  let s = seed
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, count)
}

// ─── Pick-of-3 round generator ───
// Returns { question, options[3] }, picking from a question that still has
// at least 3 unseen options. `profile` is the user's current taste profile;
// any value already in their profile is treated as "seen." `seenSet` is a
// Set<string> of options the user has skipped past or already considered.
// `preferredCategory` tries to land on that category if possible.

const RECENT_QUESTION_MEMORY = 3 // avoid repeating the same question 3+ rounds in a row

export function getCalibrationRound(profile, seenSet, recentQuestionIds = [], preferredCategory = null) {
  const recent = new Set(recentQuestionIds.slice(-RECENT_QUESTION_MEMORY))

  const candidatesFor = (q) => {
    const have = new Set(profile?.[q.category]?.[q.field] || [])
    return q.options.filter((opt) => !have.has(opt) && !seenSet.has(opt))
  }

  // Score: questions with more remaining options + matching category preference rank higher
  const scored = CALIBRATION_QUESTIONS.map((q) => {
    const pool = candidatesFor(q)
    let score = pool.length
    if (recent.has(q.id)) score -= 1000 // hard demote
    if (preferredCategory && q.category === preferredCategory) score += 5
    return { q, pool, score }
  }).filter((s) => s.pool.length >= 3)

  if (scored.length === 0) {
    // Fall back to any question with even one option left
    const fallback = CALIBRATION_QUESTIONS.map((q) => ({ q, pool: candidatesFor(q) }))
      .filter((s) => s.pool.length > 0)
      .sort((a, b) => b.pool.length - a.pool.length)
    if (fallback.length === 0) return null
    const pick = fallback[0]
    return { question: pick.q, options: sample(pick.pool, Math.min(3, pick.pool.length)) }
  }

  scored.sort((a, b) => b.score - a.score)
  // Pick from the top-3 by score to add a bit of variety
  const top = scored.slice(0, Math.min(3, scored.length))
  const choice = top[Math.floor(Math.random() * top.length)]
  return { question: choice.q, options: sample(choice.pool, 3) }
}

function sample(arr, n) {
  const copy = [...arr]
  const out = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}
