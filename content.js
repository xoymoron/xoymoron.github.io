// Site content. See README.md for field examples and editing instructions.
// Store local media in assets/. Links accept HTTPS URLs or relative paths.
export const content = {
  // About and Contact.
  profile: {
    name: 'Minjun Kim',
    position: 'Undergraduate Student, Yonsei University',
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

  // News items: date in 'Mon. YYYY' format and text description.
  news: [
    {
      date: 'Sep. 2026',
      text: 'Personal website launched.',
    },
  ],

  // Lists keep their input order; empty lists show an empty state.
  experiences: [],

  // Publications. Authors matching profile.name are bold, others are muted.
  publications: [
    {
      year: '2026',
      tag: 'KSMI',
      tagColor: '#ff7b72',
      title: 'Towards Controllable Percussion: Revisiting DrumBlender',
      authors: ['Minjun Kim', 'Wooyoung Keum'],
      venue: '1st Korean Society of Music Informatics (KSMI) Conference · Extended Abstract',
      note: 'Oral, Poster',
      links: [],
    },
    {
      year: '2025',
      tag: 'ISMIR',
      tagColor: '#58a6ff',
      title: 'Exploring Pansori Generation with ACE-Step',
      authors: ['Seola Cho', 'Minjun Kim', 'Dasaem Jeong'],
      venue: '26th International Society for Music Information Retrieval (ISMIR) Conference · Late-Breaking Demo',
      note: 'Poster',
      links: [
        { label: 'LINK', url: 'https://ismir2025program.ismir.net/lbd_463.html' },
        { label: 'DEMO', url: 'https://jarammm.github.io/pansorigen/' },
      ],
    },

  ],

  works: [],

  // Set file to a PDF path, such as assets/CV_MinjunKim.pdf.
  cv: {
    file: 'assets/CV_MinjunKim.pdf',
    updated: '',
  },

  // Each post needs a unique, stable slug. See README.md for body blocks.
  posts: [],
};
