// Site content. See README.md for field examples and editing instructions.
// Store local media in assets/. Links accept HTTPS URLs or relative paths.
export const content = {
  // About and Contact.
  profile: {
    name: 'Minjun Kim',
    // Each item becomes a paragraph. Keep the HTML fallback in sync.
    bio: [
      'I explore audical noises.',
    ],
    email: 'oxymoron@yonsei.ac.kr',
    links: [
      { label: 'GitHub', text: '@xoymoron', url: 'https://github.com/xoymoron' },
      { label: 'LinkedIn', text: 'Minjun Kim', url: 'https://www.linkedin.com/in/oxymoronofficial/' },
      { label: 'Google Scholar', text: 'Minjun Kim', url: 'https://scholar.google.com/citations?user=AoXUJy4AAAAJ' },
    ],
  },

  // Lists keep their input order; empty lists show an empty state.
  experiences: [],

  // Categories keep their input order. Authors matching profile.name are bold.
  publications: [
    {
      category: 'International',
      year: '2025',
      title: 'Exploring Pansori Generation with ACE-Step',
      authors: ['Seola Cho', 'Minjun Kim', 'Dasaem Jeong'],
      venue: '26th International Society for Music Information Retrieval (ISMIR) Conference · Daejeon, South Korea',
      note: 'Late Breaking/Demo',
      links: [],
    },
    {
      category: 'Domestic',
      year: '2026',
      title: 'Towards Controllable Percussion: Revisiting DrumBlender.',
      authors: ['Minjun Kim', 'Wooyoung Keum'],
      venue: '1st Korean Society of Music Informatics (KSMI) Conference · Seoul, South Korea',
      note: 'Extended abstract · Non-archival · Short Oral',
      links: [],
    },
  ],

  works: [],

  // Set file to a PDF path, such as assets/cv.pdf.
  cv: {
    file: '',
    updated: '',
  },

  // Each post needs a unique, stable slug. See README.md for body blocks.
  posts: [],
};
