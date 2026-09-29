import { content } from './content.js?v=20260929b';
import { initStudio } from './studio.js?v=20260929b';

// Keep route IDs aligned with section IDs and navigation links in index.html.
const routeNames = new Map([
  ['about', 'About'],
  ['experiences', 'Experiences'],
  ['publications', 'Publications'],
  // ['works', 'Works'],
  ['cv', 'CV'],
  // ['blog', 'Blog'],
  // ['contact', 'Contact'],
  ['studio', 'Studio'],
]);
const themeStorageKey = 'xoymoron-theme';
const root = document.documentElement;
const themeButton = document.querySelector('.theme-toggle');
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

function pubButton(label, value) {
  const url = safeUrl(value);
  if (!url) return null;

  const node = element('a', 'pub-button', label);
  node.href = url;
  const parsed = new URL(url);
  if (parsed.origin !== location.origin && parsed.protocol !== 'mailto:') {
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
  }
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
  document.querySelector('meta[name="theme-color"]').content = isDark ? '#090909' : '#efeee8';
}

function initializeTheme() {
  try {
    preferredTheme = localStorage.getItem(themeStorageKey);
  } catch {
    // Storage may be unavailable in private browsing.
  }
  if (!['light', 'dark'].includes(preferredTheme)) preferredTheme = null;
  setTheme(preferredTheme || 'dark');

  themeButton.addEventListener('click', () => {
    preferredTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(preferredTheme);
    try {
      localStorage.setItem(themeStorageKey, preferredTheme);
    } catch {
      // The toggle still works without persistent storage.
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== themeStorageKey && event.key !== null) return;
    preferredTheme = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    setTheme(preferredTheme || 'dark');
  });
}

// Content renderers run once when the page loads.
function renderProfile() {
  for (const node of document.querySelectorAll('[data-profile="name"]')) {
    node.textContent = content.profile.name || '';
  }
  const posNode = document.querySelector('[data-profile="position"]');
  const divider = document.querySelector('.about-divider');
  if (posNode) {
    if (content.profile.position) {
      posNode.textContent = content.profile.position;
      posNode.hidden = false;
      if (divider) divider.hidden = false;
    } else {
      posNode.hidden = true;
      if (divider) divider.hidden = true;
    }
  }
  const bioContainer = document.querySelector('[data-profile="bio"]');
  if (bioContainer && Array.isArray(content.profile.bio)) {
    bioContainer.replaceChildren(
      ...content.profile.bio.map((paragraph) => element('p', '', paragraph)),
    );
  }
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && content.profile.name && content.profile.bio?.[0]) {
    metaDesc.content = `${content.profile.name} — ${content.profile.bio[0]}`;
  }
}

function renderNews() {
  const section = document.querySelector('[aria-labelledby="news-title"]');
  const list = document.querySelector('.news-list');
  if (!list) return;
  const items = content.news || [];
  if (items.length === 0) {
    if (section) section.hidden = true;
    list.replaceChildren();
    return;
  }
  if (section) section.hidden = false;
  list.replaceChildren(
    ...items.map((item) => {
      const li = element('li', 'news-item');
      if (item.date) {
        li.append(element('span', 'news-date', item.date));
      }
      li.append(element('span', 'news-text', item.text || ''));
      return li;
    }),
  );
}

function renderExperiences() {
  fillList('#experience-list', content.experiences, (item) => {
    const row = element('article', 'entry experience-entry');

    // Row 1: Lab & Institution (Left) + Period (Right)
    const headerRow = element('div', 'exp-row exp-header');
    const headerMain = element('div', 'exp-main');
    const title = element('div', 'exp-title');

    if (item.lab) {
      const labUrl = safeUrl(item.labUrl);
      if (labUrl) {
        const labLink = element('a', 'experience-link', item.lab);
        labLink.href = labUrl;
        labLink.target = '_blank';
        labLink.rel = 'noopener noreferrer';
        title.append(labLink);
      } else {
        title.append(item.lab);
      }
      if (item.institution) {
        title.append(`, ${item.institution}`);
      }
    } else if (item.organization) {
      title.append(item.organization);
    } else if (item.role) {
      title.append(item.role);
    }
    headerMain.append(title);
    headerRow.append(headerMain);

    if (item.period) {
      const headerSide = element('div', 'exp-side');
      headerSide.append(element('span', 'exp-date', item.period));
      headerRow.append(headerSide);
    }
    row.append(headerRow);

    // Row 2: Role & Advisor (Left) + Location (Right)
    const subRow = element('div', 'exp-row exp-sub');
    const subMain = element('div', 'exp-main');
    const roleP = element('p', 'exp-role');

    if (item.role) {
      roleP.append(item.role);
    }

    if (item.advisor) {
      const advSpan = element('span', 'exp-advisor');
      advSpan.append(' (Advisor: ');

      const advisorText = item.advisor;
      const titlePrefix = advisorText.startsWith('Prof. ') ? 'Prof. ' : '';
      const nameOnly = titlePrefix ? advisorText.slice(titlePrefix.length) : advisorText;

      if (titlePrefix) advSpan.append(titlePrefix);

      const advisorUrl = safeUrl(item.advisorUrl);
      if (advisorUrl) {
        const advLink = element('a', 'experience-link', nameOnly);
        advLink.href = advisorUrl;
        advLink.target = '_blank';
        advLink.rel = 'noopener noreferrer';
        advSpan.append(advLink);
      } else {
        advSpan.append(nameOnly);
      }
      advSpan.append(')');
      roleP.append(' ', advSpan);
    }
    subMain.append(roleP);
    subRow.append(subMain);

    if (item.location) {
      const subSide = element('div', 'exp-side');
      subSide.append(element('span', 'exp-location', item.location));
      subRow.append(subSide);
    }
    row.append(subRow);

    // Row 3: Description / Topic
    if (item.description) {
      row.append(element('p', 'exp-detail', item.description));
    }

    appendLinks(row, item.links);
    return row;
  });
}

function authorLine(names, isPublication = false) {
  const paragraph = element('p', isPublication ? 'entry-subtitle pub-authors' : 'entry-subtitle');
  if (!Array.isArray(names)) {
    paragraph.textContent = names;
    return paragraph;
  }

  names.forEach((item, index) => {
    if (index > 0) {
      const isLast = index === names.length - 1;
      const conjunction = names.length > 2 ? ', and ' : ' and ';
      paragraph.append(isLast ? conjunction : ', ');
    }
    const name = typeof item === 'object' && item !== null ? item.name : item;
    const isMe = typeof item === 'object' && item !== null && 'isMe' in item
      ? Boolean(item.isMe)
      : name === content.profile.name;

    if (isMe) {
      paragraph.append(element('strong', 'pub-author-me', name));
    } else {
      paragraph.append(name);
    }
  });
  return paragraph;
}

const defaultTagColors = ['#58a6ff', '#ff7b72', '#7ee787', '#d2a8ff', '#ffa657', '#56b6c2'];

function publicationEntry(item, headingTag = 'h2', index = 0) {
  const row = element('article', 'entry publication-entry');
  const details = element('div', 'entry-content');
  row.append(element('div', 'entry-date', item.year || ''), details);

  if (item.tag) {
    const badge = element('span', 'pub-tag', item.tag);
    const color = item.tagColor || defaultTagColors[index % defaultTagColors.length];
    badge.style.setProperty('--pub-tag-color', color);
    details.append(badge);
  }

  if (item.title) {
    details.append(element(headingTag, 'pub-title', item.title));
  }

  if (item.authors) {
    details.append(authorLine(item.authors, true));
  }

  if (item.venue) {
    const venueText = item.venue.startsWith('In ') ? item.venue : `In ${item.venue}`;
    details.append(element('p', 'pub-venue', venueText));
  }

  // Uncomment to display note (e.g. Oral, Poster):
  // if (item.note) details.append(element('p', 'entry-detail', item.note));

  if (item.links && item.links.length > 0) {
    const group = element('div', 'pub-links');
    for (const linkItem of item.links) {
      const btn = pubButton(linkItem.label, linkItem.url);
      if (btn) group.append(btn);
    }
    if (group.childElementCount) details.append(group);
  }

  return row;
}

function renderPublications() {
  const hasCategories = content.publications.some((item) => Boolean(item.category));

  if (!hasCategories) {
    fillList('#publication-list', [content.publications], (items) => {
      const list = element('div', 'entry-list');
      list.append(...items.map((item, index) => publicationEntry(item, 'h2', index)));
      return list;
    });
    return;
  }

  // Map preserves the first appearance of each category.
  const groups = new Map();
  for (const item of content.publications) {
    const category = item.category || '';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }

  let globalIndex = 0;
  fillList('#publication-list', [...groups], ([category, items]) => {
    const group = element('section', 'publication-group');
    if (category) group.append(element('h2', 'publication-group-title', category));

    const headingTag = category ? 'h3' : 'h2';
    const list = element('div', 'entry-list');
    list.append(...items.map((item) => publicationEntry(item, headingTag, globalIndex++)));
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

function showCvPlaceholder(container) {
  container.replaceChildren();
  const box = element('div', 'empty-state');
  box.append(
    element('span', 'empty-symbol', '—'),
    element('p', '', 'The CV document will be available here soon.')
  );
  container.append(box);
}

async function renderCv() {
  const container = document.querySelector('#cv-content');
  if (!container) return;

  const url = safeUrl(content.cv.file, { media: true });
  if (!url) {
    showCvPlaceholder(container);
    return;
  }

  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) {
      container.replaceChildren();

      const toolbar = element('div', 'cv-toolbar');
      const openBtn = pubButton('Open PDF in New Tab', url);
      if (openBtn) toolbar.append(openBtn);

      const frame = element('iframe', 'cv-viewer');
      frame.src = url;
      frame.title = 'Curriculum Vitae';

      container.append(toolbar, frame);
      return;
    }
  } catch {
    // File not found or request failed
  }

  showCvPlaceholder(container);
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
  const dateP = element('p', 'entry-date', post.date);
  if (post.lastModified && post.lastModified !== post.date) {
    const modifiedSpan = element('span', 'post-last-modified', ` · Last modified: ${post.lastModified}`);
    dateP.append(modifiedSpan);
  }
  heading.append(dateP, element('h1', '', post.title));
  article.append(heading, postBody(post.body || []));
  appendLinks(article, post.links);
  return post.title;
}

function renderContacts() {
  const links = Array.isArray(content.profile.links) ? content.profile.links : [];
  const contacts = [...links];
  if (content.profile.email) {
    contacts.unshift({
      label: 'Email',
      text: content.profile.email,
      url: 'mailto:' + content.profile.email,
    });
    const emailLink = document.querySelector('.social-footer a[href^="mailto:"]');
    if (emailLink) {
      emailLink.href = 'mailto:' + content.profile.email;
      emailLink.setAttribute('aria-label', `Email ${content.profile.email}`);
      emailLink.title = content.profile.email;
    }
  }

  for (const item of links) {
    if (!item.label || !item.url) continue;
    const socialLink = document.querySelector(`.social-footer a[aria-label="${item.label}"]`);
    if (socialLink) {
      socialLink.href = item.url;
    }
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
  const container = document.querySelector('#contact-list');
  if (container) container.replaceChildren(...rows);
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

  const postTitle = route === 'blog' ? renderPost(rest.join('/')) : null;
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
renderNews();
renderExperiences();
renderPublications();
renderWorks();
renderCv();
renderPostList();
renderContacts();

initStudio(content, {
  onContentUpdate: () => {
    renderProfile();
    renderNews();
    renderExperiences();
    renderPublications();
    renderWorks();
    renderCv();
    renderPostList();
    renderContacts();
  },
});

document.addEventListener('click', handleNavigation);
window.addEventListener('popstate', () => showRoute({ moveFocus: true }));
window.addEventListener('hashchange', () => showRoute({ moveFocus: true }));
showRoute();
