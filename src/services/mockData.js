const MOCK_RELEASES = {
  music: [
    { title: 'Midnight Frequencies', creator: 'Glass Animals', genre: 'Indie/Electronic', releaseDate: '2026-04-18',
      description: 'A shimmering exploration of late-night textures and hypnotic grooves that pushes their sound into new territory.',
      creatorNote: 'Known for Dreamland and How to Be a Human Being — masters of psychedelic pop.',
      relatedWorks: ['Dreamland', 'How to Be a Human Being', 'Zaba'] },
    { title: 'Echo Chamber', creator: 'Tame Impala', genre: 'Psychedelic Rock', releaseDate: '2026-04-15',
      description: 'Kevin Parker turns inward with a lush, introspective album that blends analog warmth with digital precision.',
      creatorNote: 'The one-man project behind Currents and The Slow Rush — psych-pop royalty.',
      relatedWorks: ['Currents', 'The Slow Rush', 'Lonerism'] },
    { title: 'New Dawn', creator: 'Bon Iver', genre: 'Indie Folk', releaseDate: '2026-04-20',
      description: 'Justin Vernon strips things back to the cabin-folk roots that made him famous, with orchestral swells that hit hard.',
      creatorNote: 'From the cabin recordings of For Emma to the experimental i,i — always evolving.',
      relatedWorks: ['For Emma, Forever Ago', '22, A Million', 'i,i'] },
    { title: 'Synthetic Hearts', creator: 'CHVRCHES', genre: 'Synthpop', releaseDate: '2026-04-12',
      description: 'Massive hooks and driving synths — their most anthemic record yet, built for festival stages.',
      creatorNote: 'Scottish synthpop trio behind The Bones of What You Believe and Every Open Eye.',
      relatedWorks: ['The Bones of What You Believe', 'Every Open Eye', 'Screen Violence'] },
    { title: 'Atlas of Sound', creator: 'Radiohead', genre: 'Alternative', releaseDate: '2026-04-22',
      description: 'A sprawling double album that maps new sonic landscapes while nodding to their art-rock origins.',
      creatorNote: 'The band that redefined rock with OK Computer and Kid A — five decades in.',
      relatedWorks: ['OK Computer', 'Kid A', 'In Rainbows'] },
    { title: 'Velvet Reverie', creator: 'Beach House', genre: 'Dream Pop', releaseDate: '2026-04-17',
      description: 'Hazy, reverb-drenched soundscapes that feel like watching a sunset through stained glass.',
      creatorNote: 'The dream pop duo behind Depression Cherry and 7 — architects of atmosphere.',
      relatedWorks: ['Depression Cherry', '7', 'Teen Dream'] },
    { title: 'City of Light', creator: 'The National', genre: 'Indie Rock', releaseDate: '2026-04-14',
      description: 'Matt Berninger\'s baritone anchors their most emotionally devastating album — songs about fatherhood, loss, and quiet triumph.',
      creatorNote: 'Brooklyn\'s finest — from Boxer to Sleep Well Beast, they own melancholy indie rock.',
      relatedWorks: ['Boxer', 'High Violet', 'Sleep Well Beast'] },
    { title: 'Wild Pulse', creator: 'Sylvan Esso', genre: 'Electronic', releaseDate: '2026-04-19',
      description: 'Amelia Meath\'s voice dances over Nick Sanborn\'s pulsing beats in their most danceable release.',
      creatorNote: 'The duo blending folk vocals with electronic production since their self-titled debut.',
      relatedWorks: ['Sylvan Esso', 'What Now', 'Free Love'] },
  ],
  movie: [
    { title: 'The Last Expedition', creator: 'Denis Villeneuve', genre: 'Sci-Fi', releaseDate: '2026-04-25',
      description: 'A deep-space crew discovers an alien archive that contains the history of every civilization that ever existed — and how each one ended.',
      creatorNote: 'Director of Arrival, Blade Runner 2049, and Dune — cinema\'s master of scale and silence.',
      relatedWorks: ['Arrival', 'Blade Runner 2049', 'Dune'] },
    { title: 'Whisper Valley', creator: 'Greta Gerwig', genre: 'Drama', releaseDate: '2026-04-18',
      description: 'Three generations of women gather at a family home in rural Vermont for a weekend that unearths decades of unspoken truths.',
      creatorNote: 'The visionary behind Lady Bird, Little Women, and Barbie — a once-in-a-generation storyteller.',
      relatedWorks: ['Lady Bird', 'Little Women', 'Barbie'] },
    { title: 'Neon Requiem', creator: 'Jordan Peele', genre: 'Horror/Thriller', releaseDate: '2026-04-20',
      description: 'A jazz musician in 1970s Chicago discovers that the club where he performs is a doorway to something ancient and hungry.',
      creatorNote: 'Redefined horror with Get Out and Us — every film is a cultural event.',
      relatedWorks: ['Get Out', 'Us', 'Nope'] },
    { title: 'The Architect', creator: 'Christopher Nolan', genre: 'Thriller', releaseDate: '2026-04-30',
      description: 'A renowned architect realizes the buildings he designs are reshaping reality itself, blurring the line between creation and destruction.',
      creatorNote: 'The filmmaker behind Inception, Interstellar, and Oppenheimer — master of mind-bending spectacle.',
      relatedWorks: ['Inception', 'Interstellar', 'Oppenheimer'] },
    { title: 'Paper Moon Rising', creator: 'Wes Anderson', genre: 'Comedy/Drama', releaseDate: '2026-04-16',
      description: 'A troupe of traveling puppeteers in 1930s Austria stumble into an espionage plot that\'s stranger than any show they\'ve ever staged.',
      creatorNote: 'The auteur of symmetry and whimsy — from The Royal Tenenbaums to Asteroid City.',
      relatedWorks: ['The Grand Budapest Hotel', 'Moonrise Kingdom', 'Asteroid City'] },
    { title: 'Ember Falls', creator: 'Chloe Zhao', genre: 'Drama', releaseDate: '2026-04-22',
      description: 'A wildfire firefighter and a rancher form an unlikely bond during the worst fire season in Montana\'s history.',
      creatorNote: 'Oscar winner for Nomadland — she captures the American landscape like no one else.',
      relatedWorks: ['Nomadland', 'The Rider', 'Songs My Brothers Taught Me'] },
  ],
  tv: [
    { title: 'The Signal (Season 2)', creator: 'HBO', genre: 'Sci-Fi Thriller', releaseDate: '2026-04-15',
      description: 'The mysterious broadcast returns — but this time it\'s coming from inside the facility. The conspiracy deepens.',
      creatorNote: 'HBO\'s latest prestige sci-fi — think Severance meets Westworld.',
      relatedWorks: ['The Signal Season 1', 'Westworld', 'The Leftovers'] },
    { title: 'Coastal', creator: 'Apple TV+', genre: 'Drama', releaseDate: '2026-04-20',
      description: 'A marine biologist returns to her hometown on the Oregon coast and confronts the family she left behind — and the secret they\'ve been keeping.',
      creatorNote: 'From the producers of Pachinko and Severance — Apple TV+ continues its hot streak.',
      relatedWorks: ['Pachinko', 'Severance', 'The Morning Show'] },
    { title: 'Night Market', creator: 'Netflix', genre: 'Crime Drama', releaseDate: '2026-04-17',
      description: 'A food critic discovers that the city\'s most exclusive night market is a front for a vast criminal empire — and the food is incredible.',
      creatorNote: 'Netflix\'s grittiest drama since Narcos, with a culinary twist.',
      relatedWorks: ['Narcos', 'Beef', 'The Bear'] },
    { title: 'Terraform', creator: 'Amazon Prime', genre: 'Sci-Fi', releaseDate: '2026-04-22',
      description: 'The first settlers on Mars grapple with the moral weight of transforming an alien world — and what they\'re becoming in the process.',
      creatorNote: 'Hard sci-fi from the team behind The Expanse — grounded and gripping.',
      relatedWorks: ['The Expanse', 'For All Mankind', 'Silo'] },
    { title: 'The Bureau (Season 3)', creator: 'FX', genre: 'Spy Thriller', releaseDate: '2026-04-28',
      description: 'The mole hunt intensifies as agents are pulled between loyalty to country and loyalty to the people they\'ve become overseas.',
      creatorNote: 'The most realistic spy series on TV — tension you can cut with a knife.',
      relatedWorks: ['The Americans', 'Slow Horses', 'Homeland'] },
  ],
  book: [
    { title: 'The Memory Thief', creator: 'Emily St. John Mandel', genre: 'Literary Fiction', releaseDate: '2026-04-14',
      description: 'A woman who can steal memories discovers that someone has been planting false ones in her mind — and the truth is more beautiful and terrifying than she imagined.',
      creatorNote: 'Author of Station Eleven and Sea of Tranquility — she writes futures that feel like poetry.',
      relatedWorks: ['Station Eleven', 'Sea of Tranquility', 'The Glass Hotel'] },
    { title: 'Quantum Gardens', creator: 'Ted Chiang', genre: 'Sci-Fi', releaseDate: '2026-04-21',
      description: 'A new collection of stories exploring parallel lives, the nature of consciousness, and a garden that grows in multiple timelines simultaneously.',
      creatorNote: 'The short story master behind Exhalation and the story that became Arrival.',
      relatedWorks: ['Exhalation', 'Stories of Your Life and Others'] },
    { title: 'The Forgotten Shore', creator: 'Kazuo Ishiguro', genre: 'Literary Fiction', releaseDate: '2026-04-18',
      description: 'An aging painter returns to the coastal town where he spent his youth, only to find that no one remembers him — or the war that shaped them all.',
      creatorNote: 'Nobel laureate behind Never Let Me Go and The Remains of the Day — quiet devastation.',
      relatedWorks: ['Never Let Me Go', 'The Remains of the Day', 'Klara and the Sun'] },
    { title: 'Wild Dark', creator: 'Jeff VanderMeer', genre: 'New Weird', releaseDate: '2026-04-25',
      description: 'A biologist enters an ecosystem that shouldn\'t exist — a forest that appears to be dreaming, and pulling her into its narrative.',
      creatorNote: 'The mind behind the Southern Reach trilogy — nature as cosmic horror.',
      relatedWorks: ['Annihilation', 'Borne', 'Authority'] },
    { title: 'Threads of Silver', creator: 'N.K. Jemisin', genre: 'Fantasy', releaseDate: '2026-04-16',
      description: 'In a city built on the bones of dead gods, a weaver discovers her thread can stitch together broken realities — but each fix unravels something else.',
      creatorNote: 'Three-time Hugo winner for the Broken Earth trilogy — she builds worlds that shake yours.',
      relatedWorks: ['The Fifth Season', 'The City We Became', 'The Hundred Thousand Kingdoms'] },
  ],
}

const DISCOVERY_POOL = {
  music: [
    { title: 'Phosphorescent Dreams', creator: 'Warpaint', genre: 'Art Rock', reason: 'Similar to your taste in dream pop and indie',
      description: 'Hypnotic guitar interplay and ethereal harmonies that pull you into a trance state.',
      creatorNote: 'LA art-rock quartet known for their mesmerizing live shows and textured sound.',
      relatedWorks: ['The Fool', 'Heads Up', 'Radiate Like This'] },
    { title: 'Digital Haze', creator: 'Caribou', genre: 'Electronic', reason: 'Fans of electronic/indie crossover love this',
      description: 'Glitchy, soulful electronic music that manages to feel both futuristic and deeply human.',
      creatorNote: 'Dan Snaith\'s project bridging IDM and pop — a PhD in math who makes you dance.',
      relatedWorks: ['Swim', 'Suddenly', 'Our Love'] },
    { title: 'Morning After', creator: 'Big Thief', genre: 'Indie Folk', reason: 'Matches your folk and indie preferences',
      description: 'Raw, intimate folk-rock that captures the feeling of a conversation you weren\'t supposed to overhear.',
      creatorNote: 'Adrianne Lenker\'s band — four musicians playing as one organism. Critics\' darlings.',
      relatedWorks: ['U.F.O.F.', 'Dragon New Warm Mountain', 'Two Hands'] },
    { title: 'Ultraviolet', creator: 'Japanese Breakfast', genre: 'Indie Pop', reason: 'Trending in your favorite genres',
      description: 'Michelle Zauner delivers shimmering indie pop that\'s equal parts joy and grief.',
      creatorNote: 'Musician and author of Crying in H Mart — turning personal pain into universal anthems.',
      relatedWorks: ['Jubilee', 'Soft Sounds from Another Planet', 'Crying in H Mart (book)'] },
    { title: 'Solar Return', creator: 'Khruangbin', genre: 'Psychedelic/Funk', reason: 'Genre crossover you might enjoy',
      description: 'A globe-trotting groove odyssey blending Thai funk, dub, and desert rock into something entirely its own.',
      creatorNote: 'Houston trio making the world\'s chillest music — funk, soul, and psychedelia without borders.',
      relatedWorks: ['Con Todo El Mundo', 'Mordechai', 'A La Sala'] },
    { title: 'Static Bloom', creator: 'Alvvays', genre: 'Shoegaze/Indie', reason: 'Top pick for dream pop fans',
      description: 'Fuzzy melodies and bittersweet lyrics wrapped in walls of reverb — indie pop perfection.',
      creatorNote: 'Canadian shoegaze-pop band that makes nostalgia sound brand new.',
      relatedWorks: ['Antisocialites', 'Blue Rev', 'Alvvays'] },
  ],
  movie: [
    { title: 'The Cartographer', creator: 'Celine Sciamma', genre: 'Drama', reason: 'Award-winning director, matches your taste',
      description: 'A map-maker in 18th-century France discovers that the landscapes she charts are changing to match her emotional state.',
      creatorNote: 'Director of Portrait of a Lady on Fire — she makes every frame a painting.',
      relatedWorks: ['Portrait of a Lady on Fire', 'Petite Maman', 'Girlhood'] },
    { title: 'Hollow Ground', creator: 'Robert Eggers', genre: 'Horror', reason: 'If you liked atmospheric horror',
      description: 'A family inherits a farmhouse in Iceland where the soil remembers every act of violence ever committed on it.',
      creatorNote: 'The filmmaker behind The Witch and The Northman — historical horror at its most unsettling.',
      relatedWorks: ['The Witch', 'The Lighthouse', 'The Northman'] },
    { title: 'Paper Trails', creator: 'Hirokazu Kore-eda', genre: 'Drama', reason: 'Critically acclaimed, fits your drama preferences',
      description: 'A postal worker begins reading undeliverable letters and quietly intervenes in the lives of their intended recipients.',
      creatorNote: 'Japan\'s master of tender family drama — every film is a gentle gut punch.',
      relatedWorks: ['Shoplifters', 'Still Walking', 'After the Storm'] },
    { title: 'Starfall', creator: 'Alex Garland', genre: 'Sci-Fi', reason: 'For fans of cerebral sci-fi',
      description: 'A physicist builds a machine that can observe the moment of her own death — and what she sees changes everything she believes.',
      creatorNote: 'Writer-director of Ex Machina and Annihilation — sci-fi that makes you think for weeks.',
      relatedWorks: ['Ex Machina', 'Annihilation', 'Men'] },
    { title: 'The Collector', creator: 'Park Chan-wook', genre: 'Thriller', reason: 'Master filmmaker, genre match',
      description: 'An art forger is hired to create a masterpiece that will expose the corruption of the collector who commissioned it.',
      creatorNote: 'South Korean auteur behind Oldboy and Decision to Leave — style and substance in equal measure.',
      relatedWorks: ['Oldboy', 'The Handmaiden', 'Decision to Leave'] },
  ],
  tv: [
    { title: 'Undergrowth', creator: 'A24/FX', genre: 'Mystery', reason: 'From producers you follow',
      description: 'A mycologist investigating a fungal bloom in Appalachia discovers it\'s connected to a string of disappearances going back decades.',
      creatorNote: 'A24\'s first foray into network TV with FX — expect the unexpected.',
      relatedWorks: ['The Bear', 'Beef', 'Euphoria'] },
    { title: 'The North Water', creator: 'BBC', genre: 'Historical Drama', reason: 'Highly rated in your preferred genres',
      description: 'A disgraced surgeon joins an 1859 Arctic whaling expedition and encounters a psychopath among the crew.',
      creatorNote: 'BBC historical drama at its bleakest and most beautiful — based on Ian McGuire\'s novel.',
      relatedWorks: ['Chernobyl', 'Taboo', 'The Terror'] },
    { title: 'Severance (Season 3)', creator: 'Apple TV+', genre: 'Thriller', reason: 'Continuation of acclaimed series',
      description: 'The innies push deeper into Lumon\'s secrets while the outies face the consequences of the overtime contingency.',
      creatorNote: 'The show that made office culture terrifying — one of TV\'s most original concepts.',
      relatedWorks: ['Severance S1-2', 'Black Mirror', 'Devs'] },
    { title: 'Slow Horses (Season 5)', creator: 'Apple TV+', genre: 'Spy Thriller', reason: 'Critical favorite in thriller genre',
      description: 'Jackson Lamb\'s band of misfit spies face their most personal threat yet as someone from Lamb\'s past resurfaces.',
      creatorNote: 'Gary Oldman at his grumpy best — the spy show that makes MI5 look like a dysfunctional office.',
      relatedWorks: ['Slow Horses S1-4', 'The Night Manager', 'Tinker Tailor Soldier Spy'] },
  ],
  book: [
    { title: 'The Listener', creator: 'Rachel Kushner', genre: 'Literary Fiction', reason: 'Award winner in your preferred genre',
      description: 'A woman who volunteers at a prison hotline becomes entangled in the lives of the incarcerated — and questions everything about justice.',
      creatorNote: 'Author of The Flamethrowers and Creation Lake — fearless, politically charged fiction.',
      relatedWorks: ['The Flamethrowers', 'The Mars Room', 'Creation Lake'] },
    { title: 'Orbital Mechanics', creator: 'Becky Chambers', genre: 'Sci-Fi', reason: 'Cozy sci-fi matching your tastes',
      description: 'A space station repair crew becomes an unlikely family while fixing the infrastructure that keeps humanity connected across the stars.',
      creatorNote: 'Queen of cozy sci-fi — her Wayfarers series proved space opera can be kind.',
      relatedWorks: ['The Long Way to a Small, Angry Planet', 'A Psalm for the Wild-Built', 'Record of a Spaceborn Few'] },
    { title: 'The Familiar', creator: 'Leigh Bardugo', genre: 'Fantasy', reason: 'Popular in genres you enjoy',
      description: 'A scullion with a forbidden gift navigates the deadly politics of the Spanish Golden Age, where magic is heresy and survival is an art.',
      creatorNote: 'The Grishaverse creator who made YA fantasy literary — now writing for adults too.',
      relatedWorks: ['Six of Crows', 'Ninth House', 'The Familiar'] },
    { title: 'Intermezzo', creator: 'Sally Rooney', genre: 'Literary Fiction', reason: 'Trending in contemporary fiction',
      description: 'Two brothers grieving their father\'s death navigate love, chess, and the unbridgeable gap between who they are and who they want to be.',
      creatorNote: 'The voice of millennial fiction — Normal People and Beautiful World made her a phenomenon.',
      relatedWorks: ['Normal People', 'Beautiful World, Where Are You', 'Conversations with Friends'] },
  ],
}

function matchScore(item, tasteProfile) {
  let score = 0
  const allArtists = [
    ...(tasteProfile.music?.artists || []),
    ...(tasteProfile.movies?.directors || []),
    ...(tasteProfile.movies?.actors || []),
    ...(tasteProfile.tv?.creators || []),
    ...(tasteProfile.books?.authors || []),
  ].map((a) => a.toLowerCase())

  const allGenres = [
    ...(tasteProfile.music?.genres || []),
    ...(tasteProfile.movies?.genres || []),
    ...(tasteProfile.tv?.genres || []),
    ...(tasteProfile.books?.genres || []),
  ].map((g) => g.toLowerCase())

  if (allArtists.some((a) => item.creator.toLowerCase().includes(a))) score += 10
  if (item.genre && allGenres.some((g) => item.genre.toLowerCase().includes(g))) score += 5

  score += Math.random() * 3

  return score
}

export function getNewReleases(tasteProfile, catalogItems = []) {
  const catalogTitles = new Set(catalogItems.map((i) => i.title.toLowerCase()))
  const allReleases = Object.entries(MOCK_RELEASES).flatMap(([type, items]) =>
    items
      .filter((item) => !catalogTitles.has(item.title.toLowerCase()))
      .map((item) => ({
        ...item,
        type,
        score: matchScore(item, tasteProfile),
        isNewRelease: true,
      }))
  )

  return allReleases.sort((a, b) => b.score - a.score).slice(0, 8)
}

export function getDiscoveries(tasteProfile, catalogItems = []) {
  const catalogTitles = new Set(catalogItems.map((i) => i.title.toLowerCase()))
  const allDiscoveries = Object.entries(DISCOVERY_POOL).flatMap(([type, items]) =>
    items
      .filter((item) => !catalogTitles.has(item.title.toLowerCase()))
      .map((item) => ({
        ...item,
        type,
        score: matchScore(item, tasteProfile),
        isDiscovery: true,
      }))
  )

  return allDiscoveries.sort((a, b) => b.score - a.score).slice(0, 6)
}

export function getWeeklyRadar(tasteProfile, catalogItems = []) {
  return {
    newReleases: getNewReleases(tasteProfile, catalogItems),
    discoveries: getDiscoveries(tasteProfile, catalogItems),
    generatedAt: new Date().toISOString(),
  }
}
