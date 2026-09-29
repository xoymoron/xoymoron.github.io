# Personal Academic Portfolio

A lightweight, zero-dependency static personal portfolio and academic website built with vanilla HTML, CSS, and modern JavaScript. Designed for researchers, musicians, and developers with built-in dark mode, academic publication listings, blog support, and responsive layouts.

## Features

- **Zero Build & Zero Dependencies**: Runs directly in modern browsers without bundlers or package installs.
- **Declarative Content**: All portfolio data is cleanly separated and managed in `content.js`.
- **Academic Publications**: Compact card view featuring venue acronym tags with custom color accents, automatic author highlighting, and external resource buttons (`LINK`, `DEMO`, `CODE`).
- **Hash-based Routing**: Clean deep-linking (`#about`, `#publications`, `#works`, `#blog/<slug>`) compatible with static hosts like GitHub Pages.
- **Theme Support**: Seamless dark/light mode with system preference detection and localStorage persistence.

## Project Structure

```text
├── index.html          # Page layout, navigation shell, and metadata fallbacks
├── content.js          # Centralized data (Profile, Publications, Works, Blog)
├── app.js              # Client-side routing, DOM rendering, and theme toggling
├── styles.css          # Design system, CSS variables, typography, and responsive rules
└── assets/             # Static assets (fonts, audio, PDFs, images)
```

## Local Preview

Because this site uses standard ES Modules (`import`), serve it through a local HTTP server rather than opening `index.html` directly from the filesystem:

### Using Python
```sh
python -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Using Node.js (Optional)
```sh
npx serve .
# or
node scripts/serve.mjs
```

## Configuration Guide (`content.js`)

All website content is configured in `content.js`.

### Profile & Contact
```js
profile: {
  name: 'Your Name',
  bio: [
    'First paragraph of your bio.',
    'Second paragraph if needed.',
  ],
  email: 'contact@example.com',
  links: [
    { label: 'GitHub', text: '@username', url: 'https://github.com/username' },
    { label: 'Google Scholar', text: 'Profile', url: 'https://scholar.google.com/...' },
  ],
},
```

### Publications
```js
publications: [
  {
    year: '2026',
    tag: 'CONFERENCE',             // Venue acronym (displayed in uppercase)
    tagColor: '#58a6ff',           // Optional accent underline color (auto-assigned if omitted)
    title: 'Paper Title Here',
    authors: ['Author One', 'Your Name', 'Author Three'], // Matches profile.name for bold emphasis
    venue: 'Full Conference Name (ACRONYM) · Track/Type',
    note: 'Optional notes (e.g. Oral / Poster)',
    links: [
      { label: 'LINK', url: 'https://...' },
      { label: 'DEMO', url: 'https://...' },
      { label: 'CODE', url: 'https://...' },
    ],
  },
],
```

### Works / Projects
```js
works: [
  {
    year: '2026',
    title: 'Project Title',
    type: 'Release / App / Tool',
    description: 'A brief description of the project.',
    cover: 'assets/works/cover.jpg',     // Optional
    audio: 'assets/works/audio.mp3',     // Optional
    links: [
      { label: 'Project Page', url: 'https://...' },
    ],
  },
],
```

### Curriculum Vitae (CV)
Place your PDF file in the `assets/` directory (e.g. `assets/CV_MinjunKim.pdf`) and configure the path:
```js
cv: {
  file: 'assets/CV_MinjunKim.pdf',
  updated: '',
},
```

### Blog Posts
```js
posts: [
  {
    slug: 'my-first-post',
    title: 'Post Title',
    date: '2026-01-01',
    summary: 'A short description for the post list.',
    body: [
      'First paragraph.',
      { type: 'heading', text: 'Section Heading' },
      'Second paragraph.',
      { type: 'quote', text: 'Blockquote text' },
      { type: 'list', items: ['Item 1', 'Item 2'] },
    ],
    links: [],
  },
],
```

## Deployment (GitHub Pages)

1. Push your repository to GitHub.
2. In your repository, go to **Settings** → **Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Select `main` branch and folder `/(root)`.
5. Your site will be published at `https://<username>.github.io/`.

## License

Font files are distributed under the [SIL Open Font License](assets/fonts/OFL.txt).
