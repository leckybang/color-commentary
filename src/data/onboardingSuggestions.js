export const GENRE_OPTIONS = {
  music: [
    'Indie Rock', 'Alternative', 'R&B', 'Hip-Hop', 'Electronic', 'Pop',
    'Folk', 'Shoegaze', 'Dream Pop', 'Jazz', 'Psychedelic Rock', 'Synthpop',
    'Punk', 'Metal', 'Classical', 'Lo-Fi', 'Soul', 'Country',
  ],
  movies: [
    'Sci-Fi', 'Drama', 'Horror', 'Thriller', 'Comedy', 'Romance',
    'Documentary', 'Animation', 'Action', 'A24', 'Mystery', 'Fantasy',
    'Western', 'Noir', 'Indie', 'Foreign Film',
  ],
  tv: [
    'Prestige Drama', 'Dark Comedy', 'Sci-Fi', 'Thriller', 'Crime Drama',
    'Sitcom', 'Reality', 'Anime', 'Spy Thriller', 'Historical Drama',
    'Mystery', 'Fantasy', 'Limited Series', 'Docuseries',
  ],
  books: [
    'Literary Fiction', 'Sci-Fi', 'Fantasy', 'YA', 'Memoir', 'Thriller',
    'Horror', 'Romance', 'Historical Fiction', 'Poetry', 'Graphic Novels',
    'New Weird', 'Mystery', 'Essay Collection', 'Nonfiction', 'Dystopian',
  ],
}

export const SUGGESTION_MAP = {
  music: {
    'Indie Rock': ['Radiohead', 'The National', 'Arcade Fire', 'Pavement', 'Modest Mouse', 'Wilco', 'The Strokes'],
    'Alternative': ['Pixies', 'Nirvana', 'R.E.M.', 'Sonic Youth', 'Beck', 'Björk', 'PJ Harvey'],
    'R&B': ['Frank Ocean', 'SZA', 'Solange', 'D\'Angelo', 'Erykah Badu', 'The Weeknd', 'Janelle Monáe'],
    'Hip-Hop': ['Kendrick Lamar', 'Tyler, the Creator', 'MF DOOM', 'Outkast', 'A Tribe Called Quest', 'Kanye West', 'Little Simz'],
    'Electronic': ['Aphex Twin', 'Four Tet', 'Burial', 'Caribou', 'Jon Hopkins', 'Boards of Canada', 'James Blake'],
    'Pop': ['Charli XCX', 'Lorde', 'Robyn', 'Kate Bush', 'Caroline Polachek', 'Carly Rae Jepsen', 'Troye Sivan'],
    'Folk': ['Bon Iver', 'Fleet Foxes', 'Iron & Wine', 'Sufjan Stevens', 'Big Thief', 'Nick Drake', 'Joni Mitchell'],
    'Shoegaze': ['My Bloody Valentine', 'Slowdive', 'Ride', 'Cocteau Twins', 'Nothing', 'DIIV', 'Whirr'],
    'Dream Pop': ['Beach House', 'Cocteau Twins', 'Mazzy Star', 'Alvvays', 'Warpaint', 'Wild Nothing', 'Cigarettes After Sex'],
    'Jazz': ['Miles Davis', 'John Coltrane', 'Kamasi Washington', 'Nubya Garcia', 'Esperanza Spalding', 'Chet Baker', 'Thelonious Monk'],
    'Psychedelic Rock': ['Tame Impala', 'King Gizzard', 'Khruangbin', 'Unknown Mortal Orchestra', 'MGMT', 'Pond', 'Melody\'s Echo Chamber'],
    'Synthpop': ['CHVRCHES', 'Depeche Mode', 'New Order', 'Grimes', 'M83', 'Sylvan Esso', 'Future Islands'],
    'Punk': ['IDLES', 'Sleater-Kinney', 'The Clash', 'Fugazi', 'Black Flag', 'Turnstile', 'Bikini Kill'],
    'Metal': ['Deafheaven', 'Mastodon', 'Tool', 'Gojira', 'Sleep', 'Baroness', 'Converge'],
    'Classical': ['Max Richter', 'Nils Frahm', 'Philip Glass', 'Ryuichi Sakamoto', 'Ólafur Arnalds', 'Steve Reich', 'Debussy'],
    'Lo-Fi': ['Mac DeMarco', 'Clairo', 'Boy Pablo', 'Gus Dapperton', 'Current Joys', 'Homeshake', 'Alex G'],
    'Soul': ['Marvin Gaye', 'Aretha Franklin', 'Al Green', 'Curtis Mayfield', 'Leon Bridges', 'Michael Kiwanuka', 'Brittany Howard'],
    'Country': ['Kacey Musgraves', 'Sturgill Simpson', 'Tyler Childers', 'Jason Isbell', 'Orville Peck', 'Waxahatchee', 'Charley Crockett'],
  },
  movies: {
    'Sci-Fi': ['Denis Villeneuve', 'Christopher Nolan', 'Alex Garland', 'Ridley Scott', 'Andrei Tarkovsky', 'Spike Jonze'],
    'Drama': ['Greta Gerwig', 'Barry Jenkins', 'Chloé Zhao', 'Kelly Reichardt', 'Mike Leigh', 'Sean Baker'],
    'Horror': ['Jordan Peele', 'Ari Aster', 'Robert Eggers', 'Mike Flanagan', 'Ti West', 'Julia Ducournau'],
    'Thriller': ['David Fincher', 'Park Chan-wook', 'Bong Joon-ho', 'Denis Villeneuve', 'Lynne Ramsay', 'Michael Mann'],
    'Comedy': ['Wes Anderson', 'Taika Waititi', 'Edgar Wright', 'The Coen Brothers', 'Greta Gerwig', 'Emerald Fennell'],
    'Romance': ['Wong Kar-wai', 'Richard Linklater', 'Céline Sciamma', 'Barry Jenkins', 'Sofia Coppola', 'Nora Ephron'],
    'Documentary': ['Werner Herzog', 'Errol Morris', 'Frederick Wiseman', 'Agnes Varda', 'Kirsten Johnson', 'Steve James'],
    'Animation': ['Hayao Miyazaki', 'Mamoru Hosoda', 'Wes Anderson', 'Tomm Moore', 'Pete Docter', 'Satoshi Kon'],
    'Action': ['George Miller', 'John Woo', 'Chad Stahelski', 'Gareth Evans', 'Kathryn Bigelow', 'James Cameron'],
    'A24': ['Ari Aster', 'Robert Eggers', 'Sean Baker', 'Kelly Reichardt', 'Kogonada', 'Lee Isaac Chung'],
    'Mystery': ['David Lynch', 'Alfred Hitchcock', 'Bong Joon-ho', 'Rian Johnson', 'Denis Villeneuve', 'Joel Coen'],
    'Fantasy': ['Guillermo del Toro', 'Peter Jackson', 'Terry Gilliam', 'Hayao Miyazaki', 'Taika Waititi', 'Chloé Zhao'],
    'Western': ['The Coen Brothers', 'Clint Eastwood', 'Kelly Reichardt', 'Quentin Tarantino', 'John Ford', 'Sergio Leone'],
    'Noir': ['David Fincher', 'The Coen Brothers', 'David Lynch', 'Michael Mann', 'Roman Polanski', 'Billy Wilder'],
    'Indie': ['Sean Baker', 'Greta Gerwig', 'Kelly Reichardt', 'Jim Jarmusch', 'Kogonada', 'Celine Song'],
    'Foreign Film': ['Bong Joon-ho', 'Hirokazu Kore-eda', 'Céline Sciamma', 'Wong Kar-wai', 'Asghar Farhadi', 'Pedro Almodóvar'],
  },
  tv: {
    'Prestige Drama': ['Succession', 'The Wire', 'Mad Men', 'Better Call Saul', 'The Sopranos', 'The Americans'],
    'Dark Comedy': ['The Bear', 'Fleabag', 'Barry', 'Atlanta', 'What We Do in the Shadows', 'Hacks'],
    'Sci-Fi': ['Severance', 'Black Mirror', 'Westworld', 'The Expanse', 'Devs', 'Station Eleven'],
    'Thriller': ['Mr. Robot', 'Mindhunter', 'Ozark', 'The Night Of', 'Sharp Objects', 'You'],
    'Crime Drama': ['True Detective', 'Fargo', 'Mare of Easttown', 'The Night Of', 'Narcos', 'Slow Horses'],
    'Sitcom': ['Seinfeld', 'The Office', 'Parks and Recreation', 'Arrested Development', 'Schitt\'s Creek', '30 Rock'],
    'Reality': ['The Great British Bake Off', 'Survivor', 'RuPaul\'s Drag Race', 'The Amazing Race', 'Love Island', 'Top Chef'],
    'Anime': ['Attack on Titan', 'Cowboy Bebop', 'Neon Genesis Evangelion', 'Fullmetal Alchemist', 'Mob Psycho 100', 'Vinland Saga'],
    'Spy Thriller': ['Slow Horses', 'The Americans', 'Homeland', 'The Bureau', 'Jack Ryan', 'Killing Eve'],
    'Historical Drama': ['The Crown', 'Chernobyl', 'Downton Abbey', 'Shogun', 'Band of Brothers', 'Peaky Blinders'],
    'Mystery': ['Only Murders in the Building', 'The White Lotus', 'Big Little Lies', 'Broadchurch', 'Poker Face', 'Silo'],
    'Fantasy': ['Game of Thrones', 'The Witcher', 'Shadow and Bone', 'His Dark Materials', 'The Sandman', 'Arcane'],
    'Limited Series': ['Chernobyl', 'The Queen\'s Gambit', 'Mare of Easttown', 'Station Eleven', 'Watchmen', 'Beef'],
    'Docuseries': ['Making a Murderer', 'Planet Earth', 'Wild Wild Country', 'The Last Dance', 'Tiger King', 'How To with John Wilson'],
  },
  books: {
    'Literary Fiction': ['Sally Rooney', 'Weike Wang', 'Jonathan Franzen', 'Zadie Smith', 'Hanya Yanagihara', 'Rachel Kushner', 'Donna Tartt'],
    'Sci-Fi': ['Ted Chiang', 'Ursula K. Le Guin', 'Octavia Butler', 'Andy Weir', 'Kim Stanley Robinson', 'Becky Chambers', 'Liu Cixin'],
    'Fantasy': ['N.K. Jemisin', 'Brandon Sanderson', 'Patrick Rothfuss', 'Ursula K. Le Guin', 'Robin Hobb', 'Joe Abercrombie'],
    'YA': ['Angie Thomas', 'Rainbow Rowell', 'John Green', 'Leigh Bardugo', 'Becky Albertalli', 'Adam Silvera', 'Jason Reynolds'],
    'Memoir': ['Educated (Tara Westover)', 'Ocean Vuong', 'Roxane Gay', 'Patti Smith', 'Maggie Nelson', 'Carmen Maria Machado'],
    'Thriller': ['Gillian Flynn', 'Tana French', 'Dennis Lehane', 'Paula Hawkins', 'Megan Abbott', 'Alex Michaelides'],
    'Horror': ['Shirley Jackson', 'Stephen King', 'Paul Tremblay', 'Carmen Maria Machado', 'Mexican Gothic (Silvia Moreno-Garcia)', 'Mariana Enriquez'],
    'Romance': ['Emily Henry', 'Ali Hazelwood', 'Jasmine Guillory', 'Casey McQuiston', 'Helen Hoang', 'Christina Lauren'],
    'Historical Fiction': ['Anthony Doerr', 'Hilary Mantel', 'Colson Whitehead', 'Kristin Hannah', 'Min Jin Lee', 'Isabel Allende'],
    'Poetry': ['Ocean Vuong', 'Mary Oliver', 'Ada Limón', 'Ross Gay', 'Claudia Rankine', 'Warsan Shire'],
    'Graphic Novels': ['Marjane Satrapi', 'Alison Bechdel', 'Adrian Tomine', 'Tillie Walden', 'Emil Ferris', 'Brian K. Vaughan'],
    'New Weird': ['Jeff VanderMeer', 'China Miéville', 'Borne (Jeff VanderMeer)', 'Piranesi (Susanna Clarke)', 'Kelly Link'],
    'Mystery': ['Tana French', 'Ruth Ware', 'Agatha Christie', 'Arthur Conan Doyle', 'Louise Penny', 'Stieg Larsson'],
    'Essay Collection': ['Zadie Smith', 'Roxane Gay', 'Leslie Jamison', 'Rebecca Solnit', 'Jia Tolentino', 'Ta-Nehisi Coates'],
    'Nonfiction': ['Malcolm Gladwell', 'Mary Roach', 'Michael Pollan', 'Bill Bryson', 'Yuval Noah Harari', 'Ed Yong'],
    'Dystopian': ['Margaret Atwood', 'George Orwell', 'Kazuo Ishiguro', 'Cormac McCarthy', 'Emily St. John Mandel', 'Naomi Alderman'],
  },
}

// Field that suggestions map to for each category
export const SUGGESTION_FIELD = {
  music: 'artists',
  movies: 'directors',
  tv: 'shows',
  books: 'authors',
}

export const SUGGESTION_LABEL = {
  music: 'Pick your favorite artists',
  movies: 'Pick your favorite directors',
  tv: 'Pick your favorite shows',
  books: 'Pick your favorite authors',
}

export function getSuggestionsForGenres(category, selectedGenres) {
  const map = SUGGESTION_MAP[category]
  if (!map || !selectedGenres || selectedGenres.length === 0) return []

  const seen = new Set()
  const results = []

  for (const genre of selectedGenres) {
    const suggestions = map[genre]
    if (!suggestions) continue
    for (const s of suggestions) {
      if (!seen.has(s)) {
        seen.add(s)
        results.push(s)
      }
    }
  }

  return results.sort((a, b) => a.localeCompare(b))
}
