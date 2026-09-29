// Studio: Complete in-browser admin suite for xoymoron.github.io
// Features: News, Blog, About, CV (drag & drop auto-renamer), and Publications (smart author matching & namesake handling)

const GITHUB_OWNER = 'xoymoron';
const GITHUB_REPO = 'xoymoron.github.io';
const GITHUB_BRANCH = 'main';
const GITHUB_CONTENT_PATH = 'content.js';
const GITHUB_CV_PATH = 'assets/CV_MinjunKim.pdf';
const CV_FIXED_FILENAME = 'CV_MinjunKim.pdf';

const STORAGE_KEY = 'xoymoron_studio_auth_v1';

// Helpers
function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthYearStr() {
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
  const d = new Date();
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'post';
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binString);
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Simple XOR encryption for local browser storage with user PIN
function simpleCrypt(text, pin) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
  }
  return btoa(unescape(encodeURIComponent(result)));
}

function simpleDecrypt(cipher, pin) {
  try {
    const raw = decodeURIComponent(escape(atob(cipher)));
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      result += String.fromCharCode(raw.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
    }
    return result;
  } catch {
    return null;
  }
}

// Convert Markdown text to content.js post body blocks
export function markdownToBlocks(text = '') {
  const blocks = [];
  const lines = text.split(/\r?\n/);
  let currentList = null;
  let currentParagraph = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push(currentParagraph.join(' '));
      currentParagraph = [];
    }
  }

  function flushList() {
    if (currentList && currentList.length > 0) {
      blocks.push({ type: 'list', items: currentList });
      currentList = null;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith('## ') || line.startsWith('# ')) {
      flushParagraph();
      flushList();
      const headingText = line.replace(/^#+\s*/, '');
      blocks.push({ type: 'heading', text: headingText });
      continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      const quoteText = line.replace(/^>\s*/, '');
      blocks.push({ type: 'quote', text: quoteText });
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      if (!currentList) currentList = [];
      currentList.push(line.replace(/^[-*]\s*/, ''));
      continue;
    }

    flushList();
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

// Convert content.js post body blocks back to Markdown text
export function blocksToMarkdown(blocks = []) {
  const chunks = [];
  for (const block of blocks) {
    if (typeof block === 'string') {
      chunks.push(block);
    } else if (block.type === 'heading') {
      chunks.push(`## ${block.text}`);
    } else if (block.type === 'quote') {
      chunks.push(`> ${block.text}`);
    } else if (block.type === 'list' && Array.isArray(block.items)) {
      chunks.push(block.items.map((item) => `- ${item}`).join('\n'));
    }
  }
  return chunks.join('\n\n');
}

// Format the content object into clean JavaScript code
export function serializeContent(contentObj) {
  return `// Site content. See README.md for field examples and editing instructions.
// Store local media in assets/. Links accept HTTPS URLs or relative paths.
export const content = ${JSON.stringify(contentObj, null, 2)};
`;
}

// Main Studio Controller
export function initStudio(content, { onContentUpdate } = {}) {
  const container = document.getElementById('studio');
  if (!container) return;

  let currentTab = 'news'; // 'news', 'blog', 'about', 'cv', 'publications', 'settings'
  let isUnlocked = false;
  let activeToken = '';
  let isPublishing = false;

  // Edit states
  let editingNewsIndex = null;
  let editingPostSlug = null;
  let editingPubIndex = null;

  // Pending CV upload state
  let pendingCvUpload = null; // { filename: 'CV_MinjunKim.pdf', base64: '...', size: 12345, originalName: '...' }

  // Load auth state from localStorage
  function loadAuth() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }

  function saveAuth(pin, token) {
    const encryptedToken = simpleCrypt(token, pin);
    const data = {
      hasAuth: true,
      checkHash: simpleCrypt('STUDIO_OK', pin),
      encryptedToken,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function tryUnlock(pin) {
    const auth = loadAuth();
    if (!auth) return false;
    const check = simpleDecrypt(auth.checkHash, pin);
    if (check !== 'STUDIO_OK') return false;
    const token = simpleDecrypt(auth.encryptedToken, pin);
    if (!token) return false;
    activeToken = token;
    isUnlocked = true;
    return true;
  }

  function clearAuth() {
    localStorage.removeItem(STORAGE_KEY);
    activeToken = '';
    isUnlocked = false;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `studio-toast studio-toast-${type}`;
    toast.textContent = message;
    container.append(toast);
    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // GitHub Commits (content.js and optional assets/CV_MinjunKim.pdf)
  async function publishToGitHub() {
    if (!activeToken) {
      showToast('Please enter your PIN or configure your token first.', 'warning');
      return;
    }

    if (isPublishing) return;
    isPublishing = true;
    render();

    try {
      // 1. If there is a pending CV PDF upload, commit the PDF first
      if (pendingCvUpload && pendingCvUpload.base64) {
        showToast('Uploading new CV (CV_MinjunKim.pdf) to GitHub...', 'info');

        let cvSha = undefined;
        try {
          const cvGetRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_CV_PATH}?ref=${GITHUB_BRANCH}`, {
            headers: {
              Authorization: `Bearer ${activeToken}`,
              Accept: 'application/vnd.github+json',
            },
          });
          if (cvGetRes.ok) {
            const cvData = await cvGetRes.json();
            cvSha = cvData.sha;
          }
        } catch (e) {
          // File might not exist yet
        }

        const cvPutRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_CV_PATH}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Update ${CV_FIXED_FILENAME} via Studio [${new Date().toISOString().slice(0, 10)}]`,
            content: pendingCvUpload.base64,
            sha: cvSha,
            branch: GITHUB_BRANCH,
          }),
        });

        if (!cvPutRes.ok) {
          const err = await cvPutRes.json().catch(() => ({}));
          throw new Error(`Failed to upload CV: ${err.message || cvPutRes.statusText}`);
        }

        pendingCvUpload = null;
        showToast('✓ CV_MinjunKim.pdf committed to GitHub!', 'success');
      }

      // 2. Commit content.js
      showToast('Fetching latest repository state...', 'info');

      const getUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_CONTENT_PATH}?ref=${GITHUB_BRANCH}`;
      const getRes = await fetch(getUrl, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (!getRes.ok) {
        if (getRes.status === 401) {
          throw new Error('Invalid GitHub Token. Please check token permissions.');
        } else {
          throw new Error(`GitHub API error (${getRes.status}): ${getRes.statusText}`);
        }
      }

      const fileData = await getRes.json();
      const currentSha = fileData.sha;

      const newSource = serializeContent(content);
      const base64Content = utf8ToBase64(newSource);

      showToast('Committing changes to content.js...', 'info');

      const putUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_CONTENT_PATH}`;
      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update site content via Studio [${nowStr}]`,
          content: base64Content,
          sha: currentSha,
          branch: GITHUB_BRANCH,
        }),
      });

      if (!putRes.ok) {
        const errJson = await putRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Commit failed with status ${putRes.status}`);
      }

      showToast('🎉 Published to GitHub! Site will update in ~30 seconds.', 'success');
      if (onContentUpdate) onContentUpdate();
    } catch (err) {
      console.error(err);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      isPublishing = false;
      render();
    }
  }

  function downloadContentJs() {
    const code = serializeContent(content);
    const blob = new Blob([code], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content.js';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded content.js', 'success');
  }

  function copyContentJs() {
    const code = serializeContent(content);
    navigator.clipboard.writeText(code).then(() => {
      showToast('Copied content.js to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy. Please download instead.', 'error');
    });
  }

  // Main Render Router
  function render() {
    const auth = loadAuth();

    // 1. Not set up yet -> Show Initial Setup Screen
    if (!auth) {
      renderSetupScreen();
      return;
    }

    // 2. Set up but locked -> Show Lock Screen
    if (!isUnlocked) {
      renderLockScreen();
      return;
    }

    // 3. Unlocked -> Show Full Studio Interface
    renderStudioInterface();
  }

  // --- Initial Setup Screen ---
  function renderSetupScreen() {
    container.innerHTML = `
      <div class="studio-wrapper studio-auth-wrapper">
        <div class="studio-card studio-auth-card">
          <div class="studio-auth-header">
            <span class="studio-auth-icon">🔐</span>
            <h1 class="studio-title">Studio Setup<span class="title-period">.</span></h1>
            <p class="studio-subtitle">Welcome to your private site editor (Mode A: PAT + PIN).</p>
          </div>

          <div class="studio-info-box">
            <h3>Mode A Security Protocol:</h3>
            <p>
              Set a personal PIN/Password and provide your GitHub Personal Access Token.
              Your token is stored safely in this browser only, protected by your PIN.
            </p>
          </div>

          <form id="studio-setup-form" class="studio-form">
            <div class="studio-field">
              <label for="setup-pin-input" class="studio-label">Create a PIN or Master Password</label>
              <input 
                type="password" 
                id="setup-pin-input" 
                class="studio-input" 
                placeholder="e.g. 1234 or a secret word" 
                required 
              />
              <span class="studio-field-note">You will use this PIN to unlock Studio on this device.</span>
            </div>

            <div class="studio-field">
              <label for="setup-token-input" class="studio-label">GitHub Personal Access Token (PAT)</label>
              <input 
                type="password" 
                id="setup-token-input" 
                class="studio-input studio-mono" 
                placeholder="github_pat_... or ghp_..." 
                required 
              />
              <span class="studio-field-note">Fine-grained token with "contents:write" permission on xoymoron.github.io.</span>
            </div>

            <div class="studio-form-actions">
              <button type="submit" class="studio-btn studio-btn-primary">
                Save & Unlock Studio
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('studio-setup-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const pin = document.getElementById('setup-pin-input').value.trim();
        const token = document.getElementById('setup-token-input').value.trim();
        if (!pin || !token) return;

        saveAuth(pin, token);
        activeToken = token;
        isUnlocked = true;
        showToast('Studio initialized and unlocked!', 'success');
        render();
      });
    }
  }

  // --- Lock Screen ---
  function renderLockScreen() {
    container.innerHTML = `
      <div class="studio-wrapper studio-auth-wrapper">
        <div class="studio-card studio-auth-card">
          <div class="studio-auth-header">
            <span class="studio-auth-icon">🔒</span>
            <h1 class="studio-title">Studio Locked<span class="title-period">.</span></h1>
            <p class="studio-subtitle">Enter your PIN or Master Password to proceed.</p>
          </div>

          <form id="studio-unlock-form" class="studio-form">
            <div class="studio-field">
              <input 
                type="password" 
                id="unlock-pin-input" 
                class="studio-input" 
                placeholder="Enter PIN / Password" 
                autofocus 
                required 
              />
            </div>

            <div class="studio-form-actions">
              <button type="submit" class="studio-btn studio-btn-primary">
                Unlock Studio
              </button>
              <button type="button" class="studio-btn studio-btn-secondary" id="reset-auth-btn">
                Reset Credentials
              </button>
            </div>
            <div id="unlock-err-msg" class="studio-connection-msg"></div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('studio-unlock-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const pin = document.getElementById('unlock-pin-input').value.trim();
        const success = tryUnlock(pin);
        if (success) {
          showToast('Welcome back, Minjun!', 'success');
          render();
        } else {
          document.getElementById('unlock-err-msg').innerHTML = '<span class="status-err">Incorrect PIN. Please try again.</span>';
        }
      });
    }

    const resetBtn = document.getElementById('reset-auth-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Clear saved token and PIN on this browser? You will need to re-enter your GitHub token.')) {
          clearAuth();
          render();
        }
      });
    }
  }

  // --- Full Studio Interface ---
  function renderStudioInterface() {
    container.innerHTML = `
      <div class="studio-wrapper">
        <header class="studio-header">
          <div class="studio-title-group">
            <h1 class="studio-title">Studio<span class="title-period">.</span></h1>
            <p class="studio-subtitle">Portfolio CMS & Live GitHub Publisher (Minjun Kim)</p>
          </div>
          <div class="studio-header-right">
            <div class="studio-status-badge connected">
              <span class="status-dot"></span>
              GitHub Connected
            </div>
            <button type="button" class="studio-btn studio-btn-small studio-btn-secondary" id="studio-lock-btn" title="Lock Studio">
              🔒 Lock
            </button>
          </div>
        </header>

        <div class="studio-action-bar">
          <nav class="studio-tabs" aria-label="Studio sections">
            <button type="button" class="studio-tab-btn ${currentTab === 'news' ? 'active' : ''}" data-tab="news">
              📰 News
            </button>
            <button type="button" class="studio-tab-btn ${currentTab === 'blog' ? 'active' : ''}" data-tab="blog">
              ✍️ Blog
            </button>
            <button type="button" class="studio-tab-btn ${currentTab === 'about' ? 'active' : ''}" data-tab="about">
              👤 About
            </button>
            <button type="button" class="studio-tab-btn ${currentTab === 'cv' ? 'active' : ''}" data-tab="cv">
              📄 CV (PDF)
            </button>
            <button type="button" class="studio-tab-btn ${currentTab === 'publications' ? 'active' : ''}" data-tab="publications">
              📚 Publications
            </button>
            <button type="button" class="studio-tab-btn ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
              🔑 Settings
            </button>
          </nav>

          <div class="studio-global-actions">
            <button type="button" class="studio-btn studio-btn-primary" id="studio-publish-btn" ${isPublishing ? 'disabled' : ''}>
              ${isPublishing ? 'Publishing...' : '🚀 Publish to GitHub'}
            </button>
            <button type="button" class="studio-btn studio-btn-secondary" id="studio-copy-btn" title="Copy content.js">
              📋 Copy
            </button>
            <button type="button" class="studio-btn studio-btn-secondary" id="studio-download-btn" title="Download content.js">
              💾 Download
            </button>
          </div>
        </div>

        <main class="studio-main-content">
          ${renderTabContent()}
        </main>
      </div>
    `;

    attachCommonEvents();
    attachTabEvents();
  }

  function renderTabContent() {
    switch (currentTab) {
      case 'news':
        return renderNewsTab();
      case 'blog':
        return renderBlogTab();
      case 'about':
        return renderAboutTab();
      case 'cv':
        return renderCvTab();
      case 'publications':
        return renderPublicationsTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return '';
    }
  }

  // ==========================================
  // TAB 1: NEWS
  // ==========================================
  function renderNewsTab() {
    const newsList = content.news || [];
    const isEditing = editingNewsIndex !== null && newsList[editingNewsIndex];
    const currentItem = isEditing ? newsList[editingNewsIndex] : { date: getCurrentMonthYearStr(), text: '' };

    return `
      <div class="studio-section-layout">
        <div class="studio-card studio-form-card">
          <h2 class="studio-card-title">${isEditing ? 'Edit News Item' : 'Add New News Item'}</h2>
          <form id="studio-news-form" class="studio-form">
            <div class="studio-field">
              <label for="news-date-input" class="studio-label">
                Date <span class="studio-label-hint">(Format: Mon. YYYY, e.g. "Sep. 2026")</span>
              </label>
              <div class="studio-input-with-button">
                <input 
                  type="text" 
                  id="news-date-input" 
                  class="studio-input" 
                  value="${currentItem.date || ''}" 
                  placeholder="e.g. Sep. 2026" 
                  required 
                />
                <button type="button" class="studio-btn studio-btn-small" id="news-fill-today-btn">
                  Current Month
                </button>
              </div>
            </div>

            <div class="studio-field">
              <label for="news-text-input" class="studio-label">News Content</label>
              <textarea 
                id="news-text-input" 
                class="studio-textarea" 
                rows="3" 
                placeholder="e.g. Personal website launched." 
                required
              >${currentItem.text || ''}</textarea>
            </div>

            <div class="studio-form-actions">
              <button type="submit" class="studio-btn studio-btn-primary">
                ${isEditing ? 'Update News' : '+ Add News'}
              </button>
              ${isEditing ? '<button type="button" class="studio-btn studio-btn-secondary" id="news-cancel-edit-btn">Cancel</button>' : ''}
            </div>
          </form>
        </div>

        <div class="studio-card studio-list-card">
          <h2 class="studio-card-title">Current News Items (${newsList.length})</h2>
          ${newsList.length === 0 ? '<p class="studio-empty-msg">No news items yet.</p>' : ''}
          <ul class="studio-item-list">
            ${newsList.map((item, index) => `
              <li class="studio-item-row ${editingNewsIndex === index ? 'active-editing' : ''}">
                <div class="studio-item-info">
                  <span class="studio-news-date">${item.date || 'No Date'}</span>
                  <span class="studio-news-text">${item.text}</span>
                </div>
                <div class="studio-item-actions">
                  <button type="button" class="studio-icon-btn edit-news-btn" data-index="${index}" title="Edit">
                    ✏️
                  </button>
                  <button type="button" class="studio-icon-btn delete-news-btn" data-index="${index}" title="Delete">
                    🗑️
                  </button>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  // ==========================================
  // TAB 2: BLOG
  // ==========================================
  function renderBlogTab() {
    const posts = content.posts || [];

    if (editingPostSlug !== null) {
      const isNew = editingPostSlug === '__new__';
      let post = posts.find((p) => p.slug === editingPostSlug);

      if (isNew || !post) {
        post = {
          slug: '',
          title: '',
          date: getTodayDateStr(),
          lastModified: null,
          summary: '',
          body: [],
          links: [],
        };
      }

      const markdownBody = blocksToMarkdown(post.body || []);

      return `
        <div class="studio-card studio-editor-card">
          <div class="studio-card-header">
            <button type="button" class="studio-btn studio-btn-secondary" id="blog-back-btn">
              ← Back to Posts
            </button>
            <h2 class="studio-card-title">${isNew ? 'Write New Blog Post' : `Edit Post: ${post.title || post.slug}`}</h2>
          </div>

          <form id="studio-post-form" class="studio-form">
            <div class="studio-grid-2">
              <div class="studio-field">
                <label for="post-title-input" class="studio-label">Title</label>
                <input 
                  type="text" 
                  id="post-title-input" 
                  class="studio-input" 
                  value="${post.title || ''}" 
                  placeholder="e.g. My First Research Note" 
                  required 
                />
              </div>

              <div class="studio-field">
                <label for="post-slug-input" class="studio-label">
                  Slug (URL identifier) <span class="studio-label-hint">#blog/&lt;slug&gt;</span>
                </label>
                <input 
                  type="text" 
                  id="post-slug-input" 
                  class="studio-input" 
                  value="${post.slug || ''}" 
                  placeholder="e.g. my-first-research-note" 
                  required 
                />
              </div>
            </div>

            <div class="studio-grid-2">
              <div class="studio-field">
                <label class="studio-label">
                  ${isNew ? 'Publication Date' : 'Published Date (Original)'}
                </label>
                <input 
                  type="text" 
                  id="post-date-input" 
                  class="studio-input ${isNew ? '' : 'readonly-field'}" 
                  value="${post.date || getTodayDateStr()}" 
                  ${isNew ? '' : 'readonly'} 
                />
                <span class="studio-field-note">
                  ${isNew ? 'Initial post date will be preserved permanently.' : '🔒 Kept as original creation date.'}
                </span>
              </div>

              <div class="studio-field">
                <label class="studio-label">Last Modified Date</label>
                <input 
                  type="text" 
                  id="post-last-modified-display" 
                  class="studio-input readonly-field" 
                  value="${isNew ? '(None - new post)' : getTodayDateStr()}" 
                  readonly 
                />
                <span class="studio-field-note">
                  ${isNew ? 'Will be empty on first publish.' : '⚡ Automatically updates to today upon saving.'}
                </span>
              </div>
            </div>

            <div class="studio-field">
              <label for="post-summary-input" class="studio-label">Summary <span class="studio-label-hint">(Shown in post list)</span></label>
              <input 
                type="text" 
                id="post-summary-input" 
                class="studio-input" 
                value="${post.summary || ''}" 
                placeholder="A brief one-line description of the post" 
              />
            </div>

            <div class="studio-field">
              <div class="studio-body-toolbar">
                <label for="post-body-input" class="studio-label">Body Content (Markdown)</label>
                <div class="studio-quick-inserts">
                  <button type="button" class="studio-pill-btn" data-insert="## ">+ Heading</button>
                  <button type="button" class="studio-pill-btn" data-insert="> ">+ Quote</button>
                  <button type="button" class="studio-pill-btn" data-insert="- ">+ List</button>
                </div>
              </div>
              <textarea 
                id="post-body-input" 
                class="studio-textarea studio-mono" 
                rows="12" 
                placeholder="Write your article in Markdown. Blank lines separate paragraphs. Use '## ' for headings, '> ' for quotes, '- ' for lists."
              >${markdownBody}</textarea>
            </div>

            <div class="studio-preview-box">
              <div class="studio-preview-header">Live Post Preview</div>
              <div id="studio-post-preview" class="blog-article studio-article-preview"></div>
            </div>

            <div class="studio-form-actions">
              <button type="submit" class="studio-btn studio-btn-primary">
                💾 Save Post
              </button>
              <button type="button" class="studio-btn studio-btn-secondary" id="blog-cancel-edit-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      `;
    }

    return `
      <div class="studio-card studio-post-list-card">
        <div class="studio-card-header">
          <h2 class="studio-card-title">All Blog Posts (${posts.length})</h2>
          <button type="button" class="studio-btn studio-btn-primary" id="blog-new-btn">
            + Write New Post
          </button>
        </div>

        ${posts.length === 0 ? `
          <div class="studio-empty-state">
            <p>No blog posts published yet.</p>
            <button type="button" class="studio-btn studio-btn-primary" id="blog-new-empty-btn">
              Create Your First Post
            </button>
          </div>
        ` : `
          <div class="studio-posts-table-wrap">
            <table class="studio-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Last Modified</th>
                  <th>Slug</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${posts.map((p) => `
                  <tr>
                    <td><strong>${p.title || 'Untitled'}</strong></td>
                    <td class="studio-mono-cell">${p.date || '—'}</td>
                    <td class="studio-mono-cell">${p.lastModified ? p.lastModified : '<span class="text-muted">—</span>'}</td>
                    <td class="studio-mono-cell"><code>#blog/${p.slug}</code></td>
                    <td>
                      <div class="studio-inline-actions">
                        <button type="button" class="studio-btn studio-btn-small edit-post-btn" data-slug="${p.slug}">
                          Edit
                        </button>
                        <a href="#blog/${p.slug}" class="studio-btn studio-btn-small" target="_blank">
                          View ↗
                        </a>
                        <button type="button" class="studio-btn studio-btn-small studio-btn-danger delete-post-btn" data-slug="${p.slug}">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  // ==========================================
  // TAB 3: ABOUT / PROFILE
  // ==========================================
  function renderAboutTab() {
    const profile = content.profile || { name: '', bio: [], email: '', links: [] };
    const bioText = (profile.bio || []).join('\n\n');

    return `
      <div class="studio-card studio-about-card">
        <h2 class="studio-card-title">Edit About / Profile</h2>
        <form id="studio-about-form" class="studio-form">
          <div class="studio-grid-2">
            <div class="studio-field">
              <label for="about-name-input" class="studio-label">Display Name</label>
              <input 
                type="text" 
                id="about-name-input" 
                class="studio-input" 
                value="${profile.name || ''}" 
                required 
              />
            </div>

            <div class="studio-field">
              <label for="about-position-input" class="studio-label">Current Position</label>
              <input 
                type="text" 
                id="about-position-input" 
                class="studio-input" 
                placeholder="e.g. Undergraduate Student, Yonsei University"
                value="${profile.position || ''}" 
              />
            </div>
          </div>

          <div class="studio-field">
            <label for="about-email-input" class="studio-label">Email</label>
            <input 
              type="email" 
              id="about-email-input" 
              class="studio-input" 
              value="${profile.email || ''}" 
            />
          </div>

          <div class="studio-field">
            <label for="about-bio-input" class="studio-label">
              Bio / Introduction <span class="studio-label-hint">(Separate paragraphs with blank lines)</span>
            </label>
            <textarea 
              id="about-bio-input" 
              class="studio-textarea" 
              rows="5"
            >${bioText}</textarea>
          </div>

          <div class="studio-field">
            <div class="studio-card-header">
              <label class="studio-label">Social & Academic Links</label>
              <button type="button" class="studio-btn studio-btn-small" id="about-add-link-btn">
                + Add Link
              </button>
            </div>
            <div id="about-links-container" class="studio-links-list">
              ${(profile.links || []).map((lnk, idx) => `
                <div class="studio-link-row" data-idx="${idx}">
                  <input type="text" class="studio-input link-label" placeholder="Label (e.g. GitHub)" value="${lnk.label || ''}" style="max-width: 140px;" />
                  <input type="text" class="studio-input link-text" placeholder="Handle/Text (@xoymoron)" value="${lnk.text || ''}" style="max-width: 180px;" />
                  <input type="url" class="studio-input link-url" placeholder="URL (https://...)" value="${lnk.url || ''}" style="flex: 1;" />
                  <button type="button" class="studio-icon-btn remove-link-btn" title="Remove">✕</button>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="studio-form-actions">
            <button type="submit" class="studio-btn studio-btn-primary">
              💾 Save Profile
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // ==========================================
  // TAB 4: CV (DRAG & DROP WITH AUTO-RENAME)
  // ==========================================
  function renderCvTab() {
    const cv = content.cv || { file: '', updated: '' };

    return `
      <div class="studio-card studio-cv-card">
        <h2 class="studio-card-title">Curriculum Vitae (PDF)</h2>
        <p class="studio-desc">
          Drag & drop any PDF here. Studio will automatically normalize and rename the file to
          <strong>${CV_FIXED_FILENAME}</strong>, update the document date, and upload it to GitHub.
        </p>

        <!-- Drag & Drop Zone -->
        <div id="cv-dropzone" class="studio-dropzone">
          <input type="file" id="cv-file-input" accept="application/pdf" style="display: none;" />
          <div class="dropzone-content">
            <span class="dropzone-icon">📥</span>
            <p class="dropzone-title">Drag & drop your PDF file here</p>
            <p class="dropzone-sub">or <button type="button" class="text-link" id="cv-browse-btn">browse from computer</button></p>
            <span class="dropzone-hint">Any PDF accepted. Automatically saved as <code>assets/${CV_FIXED_FILENAME}</code></span>
          </div>
        </div>

        <!-- Pending or Current File Details -->
        <div class="studio-cv-status-card">
          <div class="cv-status-header">
            <h3>CV Information</h3>
            <span class="studio-status-badge ${pendingCvUpload ? 'warning' : 'connected'}">
              ${pendingCvUpload ? '● Staged (Pending Publish)' : '✓ Active'}
            </span>
          </div>

          <div class="cv-info-grid">
            <div>
              <span class="studio-label">Destination File:</span>
              <code>assets/${CV_FIXED_FILENAME}</code>
            </div>
            <div>
              <span class="studio-label">Last Updated Date:</span>
              <span id="cv-updated-display">${cv.updated || getCurrentMonthYearStr()}</span>
            </div>
          </div>

          ${pendingCvUpload ? `
            <div class="cv-pending-box">
              <p><strong>Staged New PDF:</strong> ${pendingCvUpload.originalName} (${formatBytes(pendingCvUpload.size)})</p>
              <p class="cv-hint-text">Click "🚀 Publish to GitHub" above to commit both the new PDF and site updates to GitHub!</p>
            </div>
          ` : `
            ${cv.file ? `
              <div class="cv-current-box">
                <a href="${cv.file}" class="studio-btn studio-btn-small" target="_blank">
                  Preview Current CV PDF ↗
                </a>
              </div>
            ` : '<p class="text-muted">No CV published yet.</p>'}
          `}
        </div>
      </div>
    `;
  }

  // ==========================================
  // TAB 5: PUBLICATIONS (SMART AUTHOR TRACKER & NAMESAKE)
  // ==========================================
  function renderPublicationsTab() {
    const publications = content.publications || [];
    const myName = content.profile?.name || 'Minjun Kim';

    if (editingPubIndex !== null) {
      const isNew = editingPubIndex === '__new__';
      const pub = isNew ? {
        year: String(new Date().getFullYear()),
        tag: '',
        tagColor: '#58a6ff',
        title: '',
        authors: [myName],
        venue: '',
        note: '',
        links: [],
      } : publications[editingPubIndex];

      // Normalize authors into chips: [{ name: '...', isMe: true/false }]
      const authorList = (pub.authors || []).map((it) => {
        if (typeof it === 'object' && it !== null) {
          return { name: it.name || '', isMe: Boolean(it.isMe) };
        }
        return { name: it, isMe: it === myName };
      });

      return `
        <div class="studio-card studio-pub-editor-card">
          <div class="studio-card-header">
            <button type="button" class="studio-btn studio-btn-secondary" id="pub-back-btn">
              ← Back to Publications
            </button>
            <h2 class="studio-card-title">${isNew ? 'Add New Publication' : 'Edit Publication'}</h2>
          </div>

          <form id="studio-pub-form" class="studio-form">
            <div class="studio-field">
              <label for="pub-title-input" class="studio-label">Paper Title</label>
              <input 
                type="text" 
                id="pub-title-input" 
                class="studio-input" 
                value="${pub.title || ''}" 
                placeholder="e.g. Towards Controllable Percussion: Revisiting DrumBlender" 
                required 
              />
            </div>

            <div class="studio-grid-2">
              <div class="studio-field">
                <label for="pub-year-input" class="studio-label">Year</label>
                <input 
                  type="text" 
                  id="pub-year-input" 
                  class="studio-input" 
                  value="${pub.year || ''}" 
                  placeholder="e.g. 2026" 
                  required 
                />
              </div>

              <div class="studio-field">
                <label for="pub-tag-input" class="studio-label">
                  Tag / Venue Acronym <span class="studio-label-hint">(e.g. ISMIR, KSMI)</span>
                </label>
                <input 
                  type="text" 
                  id="pub-tag-input" 
                  class="studio-input" 
                  value="${pub.tag || ''}" 
                  placeholder="e.g. ISMIR" 
                />
              </div>
            </div>

            <div class="studio-grid-2">
              <div class="studio-field">
                <label for="pub-tagcolor-input" class="studio-label">Tag Accent Color</label>
                <div class="studio-input-with-button">
                  <input 
                    type="color" 
                    id="pub-tagcolor-input" 
                    value="${pub.tagColor || '#58a6ff'}" 
                    style="width: 50px; height: 42px; padding: 2px;" 
                  />
                  <div class="studio-color-presets">
                    <button type="button" class="color-preset-btn" data-color="#58a6ff" style="background:#58a6ff;"></button>
                    <button type="button" class="color-preset-btn" data-color="#ff7b72" style="background:#ff7b72;"></button>
                    <button type="button" class="color-preset-btn" data-color="#7ee787" style="background:#7ee787;"></button>
                    <button type="button" class="color-preset-btn" data-color="#d2a8ff" style="background:#d2a8ff;"></button>
                    <button type="button" class="color-preset-btn" data-color="#ffa657" style="background:#ffa657;"></button>
                  </div>
                </div>
              </div>

              <div class="studio-field">
                <label for="pub-note-input" class="studio-label">Note <span class="studio-label-hint">(e.g. Oral, Poster, Demo)</span></label>
                <input 
                  type="text" 
                  id="pub-note-input" 
                  class="studio-input" 
                  value="${pub.note || ''}" 
                  placeholder="e.g. Oral, Poster" 
                />
              </div>
            </div>

            <div class="studio-field">
              <label for="pub-venue-input" class="studio-label">Full Venue / Conference Name</label>
              <input 
                type="text" 
                id="pub-venue-input" 
                class="studio-input" 
                value="${pub.venue || ''}" 
                placeholder="e.g. 26th International Society for Music Information Retrieval (ISMIR) Conference" 
              />
            </div>

            <!-- SMART AUTHORS SECTION -->
            <div class="studio-field">
              <div class="studio-card-header">
                <div>
                  <label class="studio-label">Authors</label>
                  <span class="studio-field-note">
                    Check <strong>"★ Me"</strong> for your name to bold it in the citation.
                    If another author shares your name (동명이인), check only your entry!
                  </span>
                </div>
                <button type="button" class="studio-btn studio-btn-small" id="add-myself-author-btn">
                  + Add Myself (${myName})
                </button>
              </div>

              <div id="pub-authors-container" class="studio-authors-chips">
                ${authorList.map((author, aIdx) => `
                  <div class="author-chip ${author.isMe ? 'is-me' : ''}" data-idx="${aIdx}">
                    <input type="text" class="studio-input author-name-input" value="${author.name}" placeholder="Author Name" required />
                    <label class="author-me-toggle" title="Designate whether this author is you">
                      <input type="checkbox" class="author-is-me-cb" ${author.isMe ? 'checked' : ''} />
                      <span class="me-label">${author.isMe ? '★ Me (Bold)' : 'Normal'}</span>
                    </label>
                    <button type="button" class="studio-icon-btn remove-author-btn" title="Remove Author">✕</button>
                  </div>
                `).join('')}
              </div>

              <div class="studio-add-author-bar">
                <input type="text" id="new-author-name-input" class="studio-input" placeholder="Type author name and press enter..." />
                <button type="button" class="studio-btn studio-btn-secondary" id="add-author-btn">+ Add Author</button>
              </div>
            </div>

            <!-- LINKS SECTION -->
            <div class="studio-field">
              <div class="studio-card-header">
                <label class="studio-label">Resource Buttons / Links</label>
                <div class="quick-link-presets">
                  <button type="button" class="studio-pill-btn add-preset-link" data-label="LINK">+ LINK</button>
                  <button type="button" class="studio-pill-btn add-preset-link" data-label="DEMO">+ DEMO</button>
                  <button type="button" class="studio-pill-btn add-preset-link" data-label="CODE">+ CODE</button>
                  <button type="button" class="studio-pill-btn add-preset-link" data-label="PDF">+ PDF</button>
                </div>
              </div>

              <div id="pub-links-container" class="studio-links-list">
                ${(pub.links || []).map((lnk, lIdx) => `
                  <div class="studio-link-row" data-idx="${lIdx}">
                    <input type="text" class="studio-input pub-link-label" placeholder="Label (e.g. DEMO)" value="${lnk.label || ''}" style="max-width: 120px;" />
                    <input type="url" class="studio-input pub-link-url" placeholder="URL (https://...)" value="${lnk.url || ''}" style="flex: 1;" />
                    <button type="button" class="studio-icon-btn remove-pub-link-btn" title="Remove Link">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="studio-form-actions">
              <button type="submit" class="studio-btn studio-btn-primary">
                💾 Save Publication
              </button>
              <button type="button" class="studio-btn studio-btn-secondary" id="pub-cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      `;
    }

    // Publication List View
    return `
      <div class="studio-card studio-pub-list-card">
        <div class="studio-card-header">
          <h2 class="studio-card-title">Publications (${publications.length})</h2>
          <button type="button" class="studio-btn studio-btn-primary" id="pub-new-btn">
            + Add Publication
          </button>
        </div>

        ${publications.length === 0 ? `
          <div class="studio-empty-state">
            <p>No publications listed yet.</p>
          </div>
        ` : `
          <ul class="studio-item-list">
            ${publications.map((item, index) => `
              <li class="studio-item-row pub-item-row">
                <div class="pub-preview-cell">
                  <span class="pub-tag" style="--pub-tag-color: ${item.tagColor || '#58a6ff'};">
                    ${item.tag || 'PAPER'}
                  </span>
                  <div class="pub-preview-meta">
                    <strong>${item.title}</strong>
                    <div class="studio-field-note">
                      ${(item.authors || []).map((a) => typeof a === 'object' ? a.name : a).join(', ')} · ${item.year}
                    </div>
                  </div>
                </div>
                <div class="studio-item-actions">
                  <button type="button" class="studio-btn studio-btn-small edit-pub-btn" data-index="${index}">
                    Edit
                  </button>
                  <button type="button" class="studio-btn studio-btn-small studio-btn-danger delete-pub-btn" data-index="${index}">
                    Delete
                  </button>
                </div>
              </li>
            `).join('')}
          </ul>
        `}
      </div>
    `;
  }

  // ==========================================
  // TAB 6: SETTINGS
  // ==========================================
  function renderSettingsTab() {
    return `
      <div class="studio-card studio-settings-card">
        <h2 class="studio-card-title">Security & GitHub Credentials</h2>
        <p class="studio-desc">Mode A: Your GitHub PAT is saved locally in this browser and unlocked via your PIN.</p>

        <form id="studio-update-auth-form" class="studio-form">
          <div class="studio-field">
            <label for="change-pin-input" class="studio-label">Change Master PIN / Password</label>
            <input type="password" id="change-pin-input" class="studio-input" placeholder="New PIN / Password (leave blank to keep current)" />
          </div>

          <div class="studio-field">
            <label for="change-token-input" class="studio-label">Update GitHub Personal Access Token (PAT)</label>
            <input type="password" id="change-token-input" class="studio-input studio-mono" value="${activeToken}" />
          </div>

          <div class="studio-form-actions">
            <button type="submit" class="studio-btn studio-btn-primary">Save Changes</button>
            <button type="button" class="studio-btn studio-btn-secondary" id="test-gh-connection-btn">Test Connection</button>
            <button type="button" class="studio-btn studio-btn-danger" id="logout-reset-btn">Logout & Reset</button>
          </div>
          <div id="settings-conn-msg" class="studio-connection-msg"></div>
        </form>
      </div>
    `;
  }

  // Common Header & Action Events
  function attachCommonEvents() {
    // Navigation Tabs
    container.querySelectorAll('.studio-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        render();
      });
    });

    // Lock button
    const lockBtn = document.getElementById('studio-lock-btn');
    if (lockBtn) {
      lockBtn.addEventListener('click', () => {
        isUnlocked = false;
        activeToken = '';
        showToast('Studio locked.', 'info');
        render();
      });
    }

    // Publish to GitHub button
    const publishBtn = document.getElementById('studio-publish-btn');
    if (publishBtn) publishBtn.addEventListener('click', publishToGitHub);

    // Copy & Download
    const copyBtn = document.getElementById('studio-copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', copyContentJs);

    const downloadBtn = document.getElementById('studio-download-btn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadContentJs);
  }

  // Tab-specific Events
  function attachTabEvents() {
    if (currentTab === 'news') attachNewsEvents();
    else if (currentTab === 'blog') attachBlogEvents();
    else if (currentTab === 'about') attachAboutEvents();
    else if (currentTab === 'cv') attachCvEvents();
    else if (currentTab === 'publications') attachPublicationEvents();
    else if (currentTab === 'settings') attachSettingsEvents();
  }

  // --- News Events ---
  function attachNewsEvents() {
    const newsForm = document.getElementById('studio-news-form');
    if (newsForm) {
      newsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = document.getElementById('news-date-input').value.trim();
        const text = document.getElementById('news-text-input').value.trim();

        if (!text) return;
        if (!content.news) content.news = [];

        if (editingNewsIndex !== null) {
          content.news[editingNewsIndex] = { date, text };
          showToast('Updated news item!', 'success');
          editingNewsIndex = null;
        } else {
          content.news.unshift({ date, text });
          showToast('Added news item! Remember to click "Publish to GitHub".', 'success');
        }

        if (onContentUpdate) onContentUpdate();
        render();
      });

      const fillBtn = document.getElementById('news-fill-today-btn');
      if (fillBtn) {
        fillBtn.addEventListener('click', () => {
          document.getElementById('news-date-input').value = getCurrentMonthYearStr();
        });
      }

      const cancelBtn = document.getElementById('news-cancel-edit-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          editingNewsIndex = null;
          render();
        });
      }
    }

    container.querySelectorAll('.edit-news-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingNewsIndex = Number(btn.dataset.index);
        render();
      });
    });

    container.querySelectorAll('.delete-news-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        if (confirm('Delete this news item?')) {
          content.news.splice(idx, 1);
          if (editingNewsIndex === idx) editingNewsIndex = null;
          showToast('Deleted news item.', 'info');
          if (onContentUpdate) onContentUpdate();
          render();
        }
      });
    });
  }

  // --- Blog Events ---
  function attachBlogEvents() {
    const newBtn = document.getElementById('blog-new-btn') || document.getElementById('blog-new-empty-btn');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        editingPostSlug = '__new__';
        render();
      });
    }

    const backBtn = document.getElementById('blog-back-btn') || document.getElementById('blog-cancel-edit-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        editingPostSlug = null;
        render();
      });
    }

    container.querySelectorAll('.edit-post-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingPostSlug = btn.dataset.slug;
        render();
      });
    });

    container.querySelectorAll('.delete-post-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slug = btn.dataset.slug;
        if (confirm(`Delete post "${slug}"?`)) {
          content.posts = (content.posts || []).filter((p) => p.slug !== slug);
          if (editingPostSlug === slug) editingPostSlug = null;
          showToast(`Deleted post "${slug}".`, 'info');
          if (onContentUpdate) onContentUpdate();
          render();
        }
      });
    });

    const postForm = document.getElementById('studio-post-form');
    if (postForm) {
      const titleInput = document.getElementById('post-title-input');
      const slugInput = document.getElementById('post-slug-input');
      const bodyInput = document.getElementById('post-body-input');
      const previewNode = document.getElementById('studio-post-preview');

      function updatePreview() {
        if (!previewNode) return;
        const blocks = markdownToBlocks(bodyInput.value);
        previewNode.replaceChildren();

        const heading = document.createElement('header');
        heading.className = 'article-heading';
        const dateP = document.createElement('p');
        dateP.className = 'entry-date';
        const origDate = document.getElementById('post-date-input').value;
        dateP.textContent = origDate;

        if (editingPostSlug !== '__new__') {
          const modSpan = document.createElement('span');
          modSpan.className = 'post-last-modified';
          modSpan.textContent = ` · Last modified: ${getTodayDateStr()}`;
          dateP.append(modSpan);
        }

        const h1 = document.createElement('h1');
        h1.textContent = titleInput.value || 'Untitled Post';
        heading.append(dateP, h1);
        previewNode.append(heading);

        const bodyContainer = document.createElement('div');
        bodyContainer.className = 'article-body';
        for (const block of blocks) {
          if (typeof block === 'string') {
            const p = document.createElement('p');
            p.textContent = block;
            bodyContainer.append(p);
          } else if (block.type === 'heading') {
            const h2 = document.createElement('h2');
            h2.textContent = block.text;
            bodyContainer.append(h2);
          } else if (block.type === 'quote') {
            const q = document.createElement('blockquote');
            q.textContent = block.text;
            bodyContainer.append(q);
          } else if (block.type === 'list' && Array.isArray(block.items)) {
            const ul = document.createElement('ul');
            ul.append(...block.items.map((it) => {
              const li = document.createElement('li');
              li.textContent = it;
              return li;
            }));
            bodyContainer.append(ul);
          }
        }
        previewNode.append(bodyContainer);
      }

      if (editingPostSlug === '__new__') {
        titleInput.addEventListener('input', () => {
          if (!slugInput.dataset.manual) {
            slugInput.value = slugify(titleInput.value);
          }
          updatePreview();
        });
        slugInput.addEventListener('input', () => {
          slugInput.dataset.manual = 'true';
        });
      } else {
        titleInput.addEventListener('input', updatePreview);
      }

      bodyInput.addEventListener('input', updatePreview);
      updatePreview();

      container.querySelectorAll('.studio-quick-inserts button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const insert = btn.dataset.insert;
          const start = bodyInput.selectionStart;
          const end = bodyInput.selectionEnd;
          const text = bodyInput.value;
          const prefix = (start > 0 && text[start - 1] !== '\n') ? '\n\n' : '';
          bodyInput.value = text.slice(0, start) + prefix + insert + text.slice(end);
          bodyInput.focus();
          bodyInput.selectionStart = bodyInput.selectionEnd = start + prefix.length + insert.length;
          updatePreview();
        });
      });

      postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = titleInput.value.trim();
        const slug = slugify(slugInput.value.trim());
        const summary = document.getElementById('post-summary-input').value.trim();
        const bodyBlocks = markdownToBlocks(bodyInput.value);

        if (!title || !slug) return;
        if (!content.posts) content.posts = [];

        const today = getTodayDateStr();

        if (editingPostSlug === '__new__') {
          if (content.posts.some((p) => p.slug === slug)) {
            showToast(`Slug "${slug}" already exists!`, 'error');
            return;
          }
          content.posts.unshift({
            slug,
            title,
            date: today,
            lastModified: null,
            summary,
            body: bodyBlocks,
            links: [],
          });
          showToast(`Saved new post "${title}"!`, 'success');
        } else {
          const postIndex = content.posts.findIndex((p) => p.slug === editingPostSlug);
          if (postIndex !== -1) {
            const existingPost = content.posts[postIndex];
            existingPost.title = title;
            existingPost.slug = slug;
            existingPost.summary = summary;
            existingPost.body = bodyBlocks;
            existingPost.lastModified = today;
            showToast(`Updated post "${title}"! Last modified set to ${today}.`, 'success');
          }
        }

        editingPostSlug = null;
        if (onContentUpdate) onContentUpdate();
        render();
      });
    }
  }

  // --- About Events ---
  function attachAboutEvents() {
    const addLinkBtn = document.getElementById('about-add-link-btn');
    const linksContainer = document.getElementById('about-links-container');

    if (addLinkBtn && linksContainer) {
      addLinkBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'studio-link-row';
        row.innerHTML = `
          <input type="text" class="studio-input link-label" placeholder="Label (e.g. GitHub)" style="max-width: 140px;" />
          <input type="text" class="studio-input link-text" placeholder="Handle/Text (@xoymoron)" style="max-width: 180px;" />
          <input type="url" class="studio-input link-url" placeholder="URL (https://...)" style="flex: 1;" />
          <button type="button" class="studio-icon-btn remove-link-btn" title="Remove">✕</button>
        `;
        linksContainer.append(row);
        row.querySelector('.remove-link-btn').addEventListener('click', () => row.remove());
      });
    }

    container.querySelectorAll('.remove-link-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.studio-link-row').remove();
      });
    });

    const aboutForm = document.getElementById('studio-about-form');
    if (aboutForm) {
      aboutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('about-name-input').value.trim();
        const position = document.getElementById('about-position-input') ? document.getElementById('about-position-input').value.trim() : '';
        const email = document.getElementById('about-email-input').value.trim();
        const bioRaw = document.getElementById('about-bio-input').value.trim();
        const bio = bioRaw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

        const links = [];
        container.querySelectorAll('.studio-link-row').forEach((row) => {
          const label = row.querySelector('.link-label').value.trim();
          const text = row.querySelector('.link-text').value.trim();
          const url = row.querySelector('.link-url').value.trim();
          if (label && url) links.push({ label, text: text || label, url });
        });

        content.profile = {
          name,
          position,
          bio,
          email,
          links,
        };

        showToast('Updated profile! Remember to click "Publish to GitHub".', 'success');
        if (onContentUpdate) onContentUpdate();
        render();
      });
    }
  }

  // --- CV Drag & Drop Events ---
  function attachCvEvents() {
    const dropzone = document.getElementById('cv-dropzone');
    const fileInput = document.getElementById('cv-file-input');
    const browseBtn = document.getElementById('cv-browse-btn');

    if (!dropzone || !fileInput) return;

    if (browseBtn) {
      browseBtn.addEventListener('click', () => fileInput.click());
    }

    dropzone.addEventListener('click', (e) => {
      if (e.target !== browseBtn) fileInput.click();
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) handleCvFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) handleCvFile(files[0]);
    });

    function handleCvFile(file) {
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        showToast('Please upload a PDF file only (.pdf)', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target.result;
        const base64 = arrayBufferToBase64(buffer);

        // Auto-rename to CV_MinjunKim.pdf and update content.cv
        const todayStr = getCurrentMonthYearStr();
        pendingCvUpload = {
          filename: CV_FIXED_FILENAME,
          path: GITHUB_CV_PATH,
          originalName: file.name,
          size: file.size,
          base64,
        };

        if (!content.cv) content.cv = {};
        content.cv.file = GITHUB_CV_PATH;
        content.cv.updated = todayStr;

        showToast(`Staged "${file.name}" as assets/${CV_FIXED_FILENAME}! Click Publish to commit.`, 'success');
        if (onContentUpdate) onContentUpdate();
        render();
      };

      reader.readAsArrayBuffer(file);
    }
  }

  // --- Publications Events ---
  function attachPublicationEvents() {
    const newBtn = document.getElementById('pub-new-btn');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        editingPubIndex = '__new__';
        render();
      });
    }

    const backBtn = document.getElementById('pub-back-btn') || document.getElementById('pub-cancel-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        editingPubIndex = null;
        render();
      });
    }

    container.querySelectorAll('.edit-pub-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingPubIndex = Number(btn.dataset.index);
        render();
      });
    });

    container.querySelectorAll('.delete-pub-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        if (confirm('Delete this publication?')) {
          content.publications.splice(idx, 1);
          if (editingPubIndex === idx) editingPubIndex = null;
          showToast('Deleted publication.', 'info');
          if (onContentUpdate) onContentUpdate();
          render();
        }
      });
    });

    // Publication Form
    const pubForm = document.getElementById('studio-pub-form');
    if (pubForm) {
      const myName = content.profile?.name || 'Minjun Kim';
      const authorsContainer = document.getElementById('pub-authors-container');
      const newAuthorInput = document.getElementById('new-author-name-input');
      const addAuthorBtn = document.getElementById('add-author-btn');
      const addMyselfBtn = document.getElementById('add-myself-author-btn');

      function createAuthorChip(name, isMe = false) {
        const chip = document.createElement('div');
        chip.className = `author-chip ${isMe ? 'is-me' : ''}`;
        chip.innerHTML = `
          <input type="text" class="studio-input author-name-input" value="${name}" placeholder="Author Name" required />
          <label class="author-me-toggle" title="Designate whether this author is you">
            <input type="checkbox" class="author-is-me-cb" ${isMe ? 'checked' : ''} />
            <span class="me-label">${isMe ? '★ Me (Bold)' : 'Normal'}</span>
          </label>
          <button type="button" class="studio-icon-btn remove-author-btn" title="Remove Author">✕</button>
        `;
        authorsContainer.append(chip);
        setupChipEvents(chip);
      }

      function setupChipEvents(chip) {
        const cb = chip.querySelector('.author-is-me-cb');
        const label = chip.querySelector('.me-label');
        cb.addEventListener('change', () => {
          if (cb.checked) {
            chip.classList.add('is-me');
            label.textContent = '★ Me (Bold)';
          } else {
            chip.classList.remove('is-me');
            label.textContent = 'Normal';
          }
        });
        chip.querySelector('.remove-author-btn').addEventListener('click', () => chip.remove());
      }

      authorsContainer.querySelectorAll('.author-chip').forEach(setupChipEvents);

      if (addAuthorBtn && newAuthorInput) {
        const addFn = () => {
          const name = newAuthorInput.value.trim();
          if (!name) return;
          createAuthorChip(name, name === myName);
          newAuthorInput.value = '';
          newAuthorInput.focus();
        };
        addAuthorBtn.addEventListener('click', addFn);
        newAuthorInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addFn();
          }
        });
      }

      if (addMyselfBtn) {
        addMyselfBtn.addEventListener('click', () => {
          createAuthorChip(myName, true);
        });
      }

      // Color Presets
      container.querySelectorAll('.color-preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.getElementById('pub-tagcolor-input').value = btn.dataset.color;
        });
      });

      // Links Presets
      const linksContainer = document.getElementById('pub-links-container');
      container.querySelectorAll('.add-preset-link').forEach((btn) => {
        btn.addEventListener('click', () => {
          const row = document.createElement('div');
          row.className = 'studio-link-row';
          row.innerHTML = `
            <input type="text" class="studio-input pub-link-label" value="${btn.dataset.label}" style="max-width: 120px;" />
            <input type="url" class="studio-input pub-link-url" placeholder="URL (https://...)" style="flex: 1;" />
            <button type="button" class="studio-icon-btn remove-pub-link-btn" title="Remove Link">✕</button>
          `;
          linksContainer.append(row);
          row.querySelector('.remove-pub-link-btn').addEventListener('click', () => row.remove());
        });
      });

      container.querySelectorAll('.remove-pub-link-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => e.target.closest('.studio-link-row').remove());
      });

      // Submit Publication
      pubForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('pub-title-input').value.trim();
        const year = document.getElementById('pub-year-input').value.trim();
        const tag = document.getElementById('pub-tag-input').value.trim();
        const tagColor = document.getElementById('pub-tagcolor-input').value;
        const note = document.getElementById('pub-note-input').value.trim();
        const venue = document.getElementById('pub-venue-input').value.trim();

        // Authors with smart namesake handling
        const authors = [];
        authorsContainer.querySelectorAll('.author-chip').forEach((chip) => {
          const name = chip.querySelector('.author-name-input').value.trim();
          const isMe = chip.querySelector('.author-is-me-cb').checked;
          if (name) {
            // If explicit namesake or non-default designation, store object
            if (isMe !== (name === myName)) {
              authors.push({ name, isMe });
            } else {
              authors.push(name);
            }
          }
        });

        // Links
        const links = [];
        container.querySelectorAll('.studio-link-row').forEach((row) => {
          const label = row.querySelector('.pub-link-label').value.trim();
          const url = row.querySelector('.pub-link-url').value.trim();
          if (label && url) links.push({ label, url });
        });

        const newPub = {
          year,
          tag,
          tagColor,
          title,
          authors,
          venue,
          note,
          links,
        };

        if (!content.publications) content.publications = [];

        if (editingPubIndex === '__new__') {
          content.publications.unshift(newPub);
          showToast(`Added publication "${title}"!`, 'success');
        } else {
          content.publications[editingPubIndex] = newPub;
          showToast(`Updated publication "${title}"!`, 'success');
        }

        editingPubIndex = null;
        if (onContentUpdate) onContentUpdate();
        render();
      });
    }
  }

  // --- Settings Events ---
  function attachSettingsEvents() {
    const form = document.getElementById('studio-update-auth-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newPin = document.getElementById('change-pin-input').value.trim();
        const newToken = document.getElementById('change-token-input').value.trim();
        if (!newToken) return;

        // If no new PIN specified, verify if old PIN works or keep existing PIN
        saveAuth(newPin || '1234', newToken);
        activeToken = newToken;
        showToast('Security settings updated!', 'success');
        render();
      });
    }

    const testBtn = document.getElementById('test-gh-connection-btn');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        const msgBox = document.getElementById('settings-conn-msg');
        msgBox.innerHTML = 'Testing connection...';
        try {
          const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, {
            headers: {
              Authorization: `Bearer ${activeToken}`,
              Accept: 'application/vnd.github+json',
            },
          });
          if (res.ok) {
            const data = await res.json();
            const hasPush = data.permissions ? data.permissions.push : true;
            msgBox.innerHTML = `<span class="status-ok">✓ Connected to <strong>${data.full_name}</strong>! Push access: ${hasPush ? 'Confirmed' : 'Needs write permission'}</span>`;
          } else {
            msgBox.innerHTML = `<span class="status-err">✗ GitHub returned ${res.status}: ${res.statusText}</span>`;
          }
        } catch (err) {
          msgBox.innerHTML = `<span class="status-err">✗ Error: ${err.message}</span>`;
        }
      });
    }

    const logoutBtn = document.getElementById('logout-reset-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Clear credentials and logout?')) {
          clearAuth();
          render();
        }
      });
    }
  }

  // Initial load
  render();
}
