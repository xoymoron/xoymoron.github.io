import { content } from './content.js';

// Keep route IDs aligned with section IDs and navigation links in index.html.
const routeNames = new Map([
  ['about', 'About'],
  ['experiences', 'Experiences'],
  ['publications', 'Publications'],
  ['works', 'Works'],
  ['cv', 'CV'],
  ['blog', 'Blog'],
  ['contact', 'Contact'],
]);
const themeStorageKey = 'xoymoron-theme';
const root = document.documentElement;
const themeButton = document.querySelector('.theme-toggle');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let preferredTheme = null;

// DOM helpers keep content as text, never raw HTML.
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function safeUrl(value, { media = false } = {}) {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value, document.baseURI);
    const protocols = media ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:'];
    if (!protocols.includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function link(label, value, className = 'text-link') {
  const url = safeUrl(value);
  if (!url) return null;

  const node = element('a', className, label);
  node.href = url;
  const parsed = new URL(url);
  if (parsed.origin !== location.origin && parsed.protocol !== 'mailto:') {
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
  }

  const arrow = element('span', '', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  node.append(arrow);
  return node;
}

function appendLinks(parent, links = []) {
  const group = element('div', 'entry-links');
  for (const item of links) {
    const anchor = link(item.label, item.url);
    if (anchor) group.append(anchor);
  }
  if (group.childElementCount) parent.append(group);
}

function baseEntry(date, title, headingTag = 'h2') {
  const row = element('article', 'entry');
  const details = element('div', 'entry-content');
  details.append(element(headingTag, '', title));
  row.append(element('div', 'entry-date', date), details);
  return { row, details };
}

function fillList(selector, items, render) {
  // Keep the HTML empty state when no entries are supplied.
  if (items.length === 0) return;
  document.querySelector(selector).replaceChildren(...items.map(render));
}

// Theme selection follows the system until a preference is saved.
function setTheme(theme) {
  root.dataset.theme = theme;
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  themeButton.setAttribute('aria-pressed', String(isDark));
  themeButton.setAttribute('aria-label', label);
  themeButton.title = label;
  themeButton.querySelector('.theme-label').textContent = isDark ? 'Light' : 'Dark';

  // Match --paper in styles.css and the early theme script in index.html.
  document.querySelector('meta[name="theme-color"]').content = isDark ? '#151715' : '#eef0eb';
}

function initializeTheme() {
  try {
    preferredTheme = localStorage.getItem(themeStorageKey);
  } catch {
    // Storage may be unavailable in private browsing.
  }
  if (!['light', 'dark'].includes(preferredTheme)) preferredTheme = null;
  setTheme(preferredTheme || (systemTheme.matches ? 'dark' : 'light'));

  themeButton.addEventListener('click', () => {
    preferredTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(preferredTheme);
    try {
      localStorage.setItem(themeStorageKey, preferredTheme);
    } catch {
      // The toggle still works without persistent storage.
    }
  });

  systemTheme.addEventListener('change', (event) => {
    if (!preferredTheme) setTheme(event.matches ? 'dark' : 'light');
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== themeStorageKey && event.key !== null) return;
    preferredTheme = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    setTheme(preferredTheme || (systemTheme.matches ? 'dark' : 'light'));
  });
}

// Content renderers run once when the page loads.
function renderProfile() {
  for (const node of document.querySelectorAll('[data-profile="name"]')) {
    node.textContent = content.profile.name;
  }
  document.querySelector('[data-profile="bio"]').replaceChildren(
    ...content.profile.bio.map((paragraph) => element('p', '', paragraph)),
  );
}

function renderExperiences() {
  fillList('#experience-list', content.experiences, (item) => {
    const { row, details } = baseEntry(item.period, item.role);
    if (item.organization) details.append(element('p', 'entry-subtitle', item.organization));
    if (item.description) details.append(element('p', 'entry-detail', item.description));
    appendLinks(details, item.links);
    return row;
  });
}

function authorLine(names) {
  const paragraph = element('p', 'entry-subtitle');
  if (!Array.isArray(names)) {
    paragraph.textContent = names;
    return paragraph;
  }

  names.forEach((name, index) => {
    if (index > 0) {
      const isLast = index === names.length - 1;
      const conjunction = names.length > 2 ? ', and ' : ' and ';
      paragraph.append(isLast ? conjunction : ', ');
    }
    paragraph.append(name === content.profile.name ? element('strong', '', name) : name);
  });
  return paragraph;
}

function publicationEntry(item, headingTag) {
  const { row, details } = baseEntry(item.year, item.title, headingTag);
  if (item.authors) details.append(authorLine(item.authors));
  if (item.venue) details.append(element('p', 'entry-detail', item.venue));
  if (item.note) details.append(element('p', 'entry-detail', item.note));
  appendLinks(details, item.links);
  return row;
}

function renderPublications() {
  // Map preserves the first appearance of each category.
  const groups = new Map();
  for (const item of content.publications) {
    const category = item.category || '';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }

  fillList('#publication-list', [...groups], ([category, items]) => {
    const group = element('section', 'publication-group');
    if (category) group.append(element('h2', 'publication-group-title', category));

    const headingTag = category ? 'h3' : 'h2';
    const list = element('div', 'entry-list');
    list.append(...items.map((item) => publicationEntry(item, headingTag)));
    group.append(list);
    return group;
  });
}

function renderWorks() {
  fillList('#work-list', content.works, (item) => {
    const { row, details } = baseEntry(item.year, item.title);
    row.classList.add('work-entry');
    if (item.type) details.prepend(element('span', 'work-type', item.type));
    if (item.description) details.append(element('p', 'entry-detail', item.description));

    const cover = safeUrl(item.cover, { media: true });
    if (cover) {
      const image = element('img', 'work-cover');
      image.src = cover;
      image.alt = item.coverAlt || item.title + ' — artwork';
      image.width = 320;
      image.height = 320;
      image.loading = 'lazy';
      row.prepend(image);
      row.classList.add('with-cover');
    }

    const audioUrl = safeUrl(item.audio, { media: true });
    if (audioUrl) {
      const audio = element('audio', 'work-audio');
      audio.controls = true;
      audio.preload = 'none';
      audio.src = audioUrl;
      audio.setAttribute('aria-label', item.title);
      audio.append('Your browser does not support audio playback.');
      details.append(audio);
    }

    appendLinks(details, item.links);
    return row;
  });
}

function renderCv() {
  const url = safeUrl(content.cv.file, { media: true });
  if (!url) return;

  const container = document.querySelector('.document-placeholder > div');
  container.querySelector('p').textContent = content.cv.updated
    ? 'Updated ' + content.cv.updated
    : 'Curriculum vitae';
  const anchor = link('Open CV (PDF)', url);
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  container.append(anchor);
}

// Posts use stable hash URLs and a small set of text blocks.
function postUrl(post) {
  return '#blog/' + encodeURIComponent(post.slug);
}

function renderPostList() {
  fillList('#post-list', content.posts, (post) => {
    const { row, details } = baseEntry(post.date, '');
    const anchor = element('a', '', post.title);
    anchor.href = postUrl(post);
    details.querySelector('h2').append(anchor);
    if (post.summary) details.append(element('p', 'entry-detail', post.summary));
    return row;
  });
}

function postBody(blocks = []) {
  const body = element('div', 'article-body');
  for (const block of blocks) {
    if (typeof block === 'string') {
      body.append(element('p', '', block));
    } else if (block.type === 'heading') {
      body.append(element('h2', '', block.text));
    } else if (block.type === 'quote') {
      body.append(element('blockquote', '', block.text));
    } else if (block.type === 'list') {
      const list = element('ul');
      list.append(...block.items.map((item) => element('li', '', item)));
      body.append(list);
    }
  }
  return body;
}

function renderPost(slug) {
  const article = document.querySelector('#blog-article');
  const index = document.querySelector('#blog-index');
  article.hidden = !slug;
  index.hidden = Boolean(slug);
  article.replaceChildren();
  if (!slug) return null;

  const back = element('a', 'text-link', '← All posts');
  back.href = '#blog';
  article.append(back);

  const post = content.posts.find((item) => item.slug === slug);
  if (!post) {
    const heading = element('div', 'article-heading');
    heading.append(element('h1', '', 'Post not found.'));
    article.append(heading, element('p', 'entry-detail', 'This post may have moved or is not published yet.'));
    return 'Post not found';
  }

  const heading = element('header', 'article-heading');
  heading.append(element('p', 'entry-date', post.date), element('h1', '', post.title));
  article.append(heading, postBody(post.body || []));
  appendLinks(article, post.links);
  return post.title;
}

function renderContacts() {
  const contacts = [...content.profile.links];
  if (content.profile.email) {
    contacts.unshift({
      label: 'Email',
      text: content.profile.email,
      url: 'mailto:' + content.profile.email,
    });
  }

  const rows = [];
  for (const item of contacts) {
    const row = link('', item.url, 'contact-row');
    if (!row) continue;
    row.querySelector('span').className = 'contact-arrow';
    row.prepend(
      element('span', 'small-label', item.label),
      element('span', 'contact-value', item.text || item.label),
    );
    rows.push(row);
  }
  document.querySelector('#contact-list').replaceChildren(...rows);
}

// Hash navigation keeps direct links compatible with static hosting.
function showRoute({ moveFocus = false } = {}) {
  let hash;
  try {
    hash = decodeURIComponent(location.hash.slice(1));
  } catch {
    hash = 'about';
  }

  const [requested, ...rest] = hash.split('/');
  const route = routeNames.has(requested) ? requested : 'about';
  if (requested && !routeNames.has(requested)) {
    history.replaceState(null, '', '#about');
  }

  for (const page of document.querySelectorAll('main > .page')) {
    page.hidden = page.id !== route;
  }
  for (const anchor of document.querySelectorAll('.site-nav a')) {
    if (anchor.hash === '#' + route) {
      anchor.setAttribute('aria-current', 'page');
    } else {
      anchor.removeAttribute('aria-current');
    }
  }
  for (const audio of document.querySelectorAll('audio')) {
    if (audio.closest('.page').hidden) audio.pause();
  }

  const postTitle = renderPost(route === 'blog' ? rest.join('/') : '');
  document.title = content.profile.name + ' — ' + (postTitle || routeNames.get(route));
  if (moveFocus) {
    document.querySelector('#main').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function handleNavigation(event) {
  // Preserve new-tab clicks and external links.
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const anchor = event.target.closest('a');
  if (!anchor) return;
  if (anchor.classList.contains('skip-link')) {
    event.preventDefault();
    document.querySelector('#main').focus();
    return;
  }
  if (anchor.origin !== location.origin || anchor.pathname !== location.pathname) return;
  if (!routeNames.has(anchor.hash.slice(1).split('/')[0])) return;

  event.preventDefault();
  if (location.hash !== anchor.hash) history.pushState(null, '', anchor.hash);
  showRoute({ moveFocus: true });
}

// Initialize content before displaying the requested page.
initializeTheme();
renderProfile();
renderExperiences();
renderPublications();
renderWorks();
renderCv();
renderPostList();
renderContacts();

document.addEventListener('click', handleNavigation);
window.addEventListener('popstate', () => showRoute({ moveFocus: true }));
window.addEventListener('hashchange', () => showRoute({ moveFocus: true }));
showRoute();
