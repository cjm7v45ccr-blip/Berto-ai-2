// Berto AI Workspace - Core Application Engine

// 0. Instance Identifier Prefix
const INSTANCE_PREFIX = 'berto'; // Change this anytime to create a clean, isolated workspace
// Path to your custom logo image
const LOGO_HTML = `<img src="./assets/logo.png" class="inline-logo" alt="Berto">`;

const BERTO_CODE_POLICY = `
━━━━━━━━━━━━━━━━━━
ELITE UI/UX & SOFTWARE ENGINEERING POLICY
━━━━━━━━━━━━━━━━━━
You are an expert Principal Software Engineer and world-class UI/UX Designer. 
When asked to design, build, or create a UI component, widget, game, or website, you MUST adhere to these strict rules:

1. ZERO PLACEHOLDERS OR LAZY TRUNCATION:
   - NEVER use "<!-- TODO: Add rest of code -->" or "// Insert logic here".
   - Write out every single line of HTML, CSS, and functional Vanilla JavaScript completely.

2. FULL SINGLE-FILE ARTIFACTS:
   - Output a complete, standalone HTML document (<!DOCTYPE html>...</html>).
   - MUST INCLUDE Tailwind CSS via CDN in the <head>: <script src="https://cdn.tailwindcss.com"></script>
   - MUST INCLUDE Lucide Icons via CDN: <script src="https://unpkg.com/lucide@latest"></script>
   - Configure Tailwind in the <head> to support modern UI styles: <script>tailwind.config = { darkMode: 'class', theme: { extend: { colors: { border: 'rgba(255,255,255,0.1)' } } } }</script>

3. WORLD-CLASS AESTHETICS (SHADCN/RADIX STYLE):
   - Default to a breathtaking, premium modern dark-mode aesthetic.
   - Backgrounds: Use rich dark gradients (e.g., \`bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100\`).
   - Components: Use beautiful glassmorphism (\`bg-white/5 backdrop-blur-xl border border-white/10\`), rounded panels (\`rounded-2xl\`), soft shadows (\`shadow-2xl\`), and glowing accents (\`ring-1 ring-white/10\`).
   - Typography: Clean, legible sans-serif fonts with excellent visual hierarchy. Use varied text opacities (\`text-slate-200\`, \`text-slate-400\`) and vibrant gradient text for main headers (\`bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400\`).
   - Animations: Add subtle, highly satisfying hover effects (\`hover:scale-[1.02] hover:bg-white/10 transition-all duration-300 ease-out\`) and smooth state changes.

4. REAL INTERACTIVITY:
   - Write clean, flawless Vanilla JavaScript inside <script> tags at the bottom.
   - If you use icons, initialize them by calling \`lucide.createIcons();\` in your JS.
   - Ensure the app, game, or widget is 100% playable and functional immediately.

5. FORMATTING:
   - Wrap all HTML code strictly inside a single \`\`\`html code block so the Artifact drawer can extract and render it automatically.
`;

// =========================================================
// Berto Storage Engine - IndexedDB Upgrade
// =========================================================
// Replaces fragile localStorage with gigabytes of reliable offline storage
class BertoStorageDB {
  constructor(dbName = `${typeof INSTANCE_PREFIX !== 'undefined' ? INSTANCE_PREFIX : 'berto'}_db`, version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  async set(storeName, key, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const data = typeof value === 'object' && !value.id && !value.name && !value.key 
        ? { key, data: value } 
        : value;
      
      const req = store.put(data);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async get(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        const res = req.result;
        resolve(res ? (res.data !== undefined ? res.data : res) : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async remove(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async clear(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }
}

const dbStorage = new BertoStorageDB();

// =========================================================
// Smart Client-Side File Chunking (Mini-RAG)
// =========================================================
// Splits uploaded files into ~500-word chunks and uses TF-IDF scoring
// to attach only the most relevant chunks to prompts
class MiniRAG {
  constructor() {
    this.chunkSize = 500; // words per chunk
  }

  chunkText(text = '') {
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += this.chunkSize) {
      chunks.push(words.slice(i, i + this.chunkSize).join(' '));
    }
    return chunks;
  }

  tfidfScore(query = '', chunk = '') {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const chunkWords = chunk.toLowerCase().split(/\s+/);
    const chunkLen = chunkWords.length;
    if (!chunkLen) return 0;

    // Count term frequencies in chunk
    const tfMap = {};
    for (const word of chunkWords) {
      tfMap[word] = (tfMap[word] || 0) + 1;
    }

    let score = 0;
    for (const term of queryTerms) {
      if (tfMap[term]) {
        // TF = frequency / total words, multiplied for emphasis
        score += (tfMap[term] / chunkLen) * (1 + Math.log2(chunkLen + 1));
      }
    }
    return score;
  }

  getRelevantChunks(text = '', query = '', maxChunks = 3) {
    if (!text || !query) return text;
    const chunks = this.chunkText(text);
    if (chunks.length <= maxChunks) return text;

    const scored = chunks.map((chunk, i) => ({
      index: i,
      chunk,
      score: this.tfidfScore(query, chunk)
    }));

    scored.sort((a, b) => b.score - a.score);

    // Take top-k chunks and sort by original order
    const selected = scored.slice(0, maxChunks);
    selected.sort((a, b) => a.index - b.index);

    return selected.map(s => s.chunk).join('\n\n[...]\n\n');
  }
}

const miniRag = new MiniRAG();

// =========================================================
// INSTANT TOKEN STREAMER — Smooth Cinematic Line-by-Line Typing
// =========================================================
class SmoothStreamer {
  constructor(node) {
    this.node = node;
    this.targetText = '';
    this.renderedText = '';
    this.isStreaming = false;
    this.isFinished = false;
    this.finishResolver = null;
  }

  updateTarget(text) {
    this.targetText = text;
    if (!this.isStreaming) this.process();
  }

  finish() {
    this.isFinished = true;
    if (!this.isStreaming) this.process();
    return new Promise(resolve => {
      this.finishResolver = resolve;
    });
  }

  async process() {
    this.isStreaming = true;
    while (this.renderedText.length < this.targetText.length || !this.isFinished) {
      if (this.renderedText.length >= this.targetText.length) {
        if (this.isFinished) break;
        await sleep(10); // Check more frequently for new API text
        continue;
      }

      const inCodeBlock = (this.renderedText.match(/```/g) || []).length % 2 !== 0;
      const remaining = this.targetText.substring(this.renderedText.length);

      let chunkSize = 1;
      let delay = 5; // Ultra-fast baseline delay

      // ADAPTIVE SPEED: Aggressive catch-up if the API is returning text very quickly
      if (remaining.length > 150) {
        chunkSize = Math.floor(remaining.length / 4); // Dump large chunks fast
        delay = 5;
      } else if (inCodeBlock) {
        // Line-by-line pause effect for code
        const nextNewline = remaining.indexOf('\n');
        if (nextNewline !== -1 && nextNewline < 150) {
          chunkSize = nextNewline + 1; // Take the whole line at once
          delay = 12; // Just a tiny micro-pause at the end of code lines (was 30)
        } else {
          chunkSize = Math.min(15, remaining.length); // Print long code lines fast
          delay = 5;
        }
      } else {
        // Fast chunking for normal conversation markdown
        chunkSize = Math.min(25, remaining.length); // Grab larger chunks of normal text
        delay = 5; 
      }

      this.renderedText += remaining.substring(0, chunkSize);
      
      // Inject cursor if not inside a code block
      let htmlToRender = renderMarkdown(stripJsonActions(this.renderedText));
      if (!inCodeBlock && !this.isFinished) {
         htmlToRender += '<span class="stream-cursor"></span>';
      }
      
      this.node.innerHTML = htmlToRender;

      if (store.state.autoScroll && $('.chat-scroll')) {
        $('.chat-scroll').scrollTop = $('.chat-scroll').scrollHeight;
      }

      await sleep(delay);
    }
    
    this.isStreaming = false;
    
    // Final render to apply syntax highlighting cleanly at the end
    if (this.node) {
      this.node.innerHTML = renderMarkdown(this.renderedText);
      if (window.hljs) {
        this.node.querySelectorAll('pre code').forEach((block) => {
          window.hljs.highlightElement(block);
        });
      }
    }
    if (this.finishResolver) this.finishResolver();
  }
}

// 1. Configuration
const CONFIG = Object.freeze({
  maxContextMessages: 20,
  maxMessageChars: 8000,
  autosaveMs: 5000,
  requestTimeoutMs: 30000,
  streamTimeoutMs: 60000,
  maxRetries: 3,
  maxAttachmentSize: 7 * 1024 * 1024,
  maxContextBytes: 20 * 1024 * 1024,
  models: Object.freeze([
    { id: 'flash', label: 'Berto Fast', apiModel: 'gemini-3.6-flash', dailyLimit: 20 },
    { id: 'lite', label: 'Berto Lite', apiModel: 'gemini-3.5-flash-lite', dailyLimit: 100 },
    { id: 'fallback', label: 'Berto Fallback', apiModel: 'gemini-3.1-flash-lite', dailyLimit: 100 }
  ]),
  storage: Object.freeze({
    state: `${INSTANCE_PREFIX}-state-v3`,
    profile: `${INSTANCE_PREFIX}-writing-profile`,
    apiKey: `${INSTANCE_PREFIX}-api-key`,
    preferences: `${INSTANCE_PREFIX}-preferences-v2`
  })
});

// 2. Utility Functions
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Helper to execute tool calls in the background without displaying raw JSON in the chat UI
function stripJsonActions(text = '') {
  return text.replace(/```json\s*\[[\s\S]*?\]\s*```/gi, '').trim();
}

function getUserInfo() {
  const prefs = readStorage(CONFIG.storage.preferences, {});
  const name = prefs.userName || 'User';

  return {
    name,
    initial: name.charAt(0).toUpperCase()
  };
}

function getLocalDateKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function debounce(fn, wait) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
}

function getFileIconSvg(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['js', 'ts', 'py', 'html', 'css', 'json', 'cpp', 'c', 'java', 'go', 'rs', 'php', 'rb', 'sql', 'sh'].includes(ext)) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
  }
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
}

async function handleImagePaste(event) {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        if (file.size > CONFIG.maxAttachmentSize) {
          toast('Pasted image exceeds size limit', 'error');
          continue;
        }
        try {
          const base64Data = await fileToBase64(file);
          currentAttachments.push({
            name: file.name || `pasted_image_${Date.now()}.png`,
            type: file.type || 'image/png',
            mimeType: file.type || 'image/png',
            size: `${Math.max(1, Math.ceil(file.size / 1024))} KB`,
            bytes: file.size,
            content: base64Data,
            isImage: true,
            file
          });
          updateAttachmentLabel();
          updateCount();
        } catch (e) {
          toast('Failed to process pasted image', 'error');
        }
      }
    }
  }
}

function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function formatCount(value) { return Number(value || 0).toLocaleString(); }
function wordCount(text = '') { return text.trim() ? text.trim().split(/\s+/).length : 0; }

function readability(text = '') {
  const words = wordCount(text);
  const sentences = Math.max(1, (text.match(/[.!?]+(?=\s|$)/g) || []).length);
  const syllables = Math.max(words, (text.toLowerCase().match(/[aeiouy]+/g) || []).length);
  return Math.max(0, Math.round(206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / Math.max(words, 1))));
}

function toast(message, type = 'info') {
  const stack = $('#toasts');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper functions for binary document text extraction
async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }
  return fullText;
}

async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Modal Helpers
function openModal(title, bodyHtml) {
  const backdrop = $('#modal');
  const titleEl = $('#modal-title');
  const bodyEl = $('#modal-body');
  if (!backdrop || !titleEl || !bodyEl) return;
  
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  backdrop.hidden = false;

  // Set accessibility attributes and focus trap
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  
  trapModalFocus(backdrop);
  
  // Focus first interactive element
  setTimeout(() => {
    const firstFocusable = backdrop.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
  }, 100);
}

function closeModal() {
  const backdrop = $('#modal');
  if (backdrop) backdrop.hidden = true;
}

function openLightbox(src) {
  const lightbox = $('#image-lightbox');
  const img = $('#lightbox-image');
  if (lightbox && img) {
    img.src = src;
    lightbox.hidden = false;
  }
}

function closeLightbox() {
  const lightbox = $('#image-lightbox');
  const img = $('#lightbox-image');
  if (lightbox) lightbox.hidden = true;
  if (img) img.src = '';
}

// 3. Markdown Rendering
function renderMarkdown(input = '') {
  const lines = input.split('\n');
  let html = '';
  let inCode = false;
  let code = '';
  let language = '';

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        const safeCode = escapeHtml(code.trimEnd());
        const langLower = language.toLowerCase();
        const runButton = langLower === 'html' ? `<button class="code-run" data-run-html="${encodeURIComponent(code)}"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px; margin-right:3px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>Run</button>` : '';        
        html += `<pre class="code-block">${runButton}<button class="code-copy" data-code-copy="${encodeURIComponent(code)}">Copy</button><code class="language-${language}">${safeCode}</code></pre>`;
        code = '';
        inCode = false;
      } else {
        language = escapeHtml(line.slice(3).trim()) || 'text';
        inCode = true;
      }
      continue;
    }
    if (inCode) { 
      code += `${line}\n`; 
      continue; 
    }

    const safeLine = escapeHtml(line);

    if (/^### /.test(safeLine)) html += `<h4>${safeLine.slice(4)}</h4>`;
    else if (/^## /.test(safeLine)) html += `<h3>${safeLine.slice(3)}</h3>`;
    else if (/^# /.test(safeLine)) html += `<h2>${safeLine.slice(2)}</h2>`;
    else if (/^[-*] /.test(safeLine)) html += `<li>${inlineMarkdown(safeLine.slice(2))}</li>`;
    else if (/^\d+\. /.test(safeLine)) html += `<li>${inlineMarkdown(safeLine.replace(/^\d+\. /, ''))}</li>`;
    else if (/^> /.test(safeLine)) html += `<blockquote>${inlineMarkdown(safeLine.slice(2))}</blockquote>`;
    else if (!safeLine.trim()) html += '<div class="md-break"></div>';
    else html += `<p>${inlineMarkdown(safeLine)}</p>`;
  }

  // FIX: Render unclosed code blocks LIVE during active streaming!
  if (inCode) {
    const safeCode = escapeHtml(code);
    html += `<pre class="code-block streaming-active"><code class="language-${language}">${safeCode}<span class="stream-cursor"></span></code></pre>`;
  }

  return html.replace(/(<li>.*?<\/li>\s*)+/g, list => `<ul>${list}</ul>`);
}

function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

// =========================================================
// Enhanced Markdown Parser with Mermaid & Math Support
// =========================================================
function renderMarkdownEnhanced(input = '') {
  if (!input) return '';
  
  // Process block-level math first ($$ ... $$) to avoid conflicts
  let html = input;
  
  // Replace codeblocks with placeholders to avoid processing math inside them
  const codeBlocks = [];
  let codeBlockIndex = 0;
  html = html.replace(/```([\s\S]*?)```/g, (match) => {
    const placeholder = `%%CODEBLOCK_${codeBlockIndex}%%`;
    codeBlocks.push(match);
    codeBlockIndex++;
    return placeholder;
  });

  // Convert block math $$ ... $$ to rendered KaTeX
  if (window.katex) {
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      try {
        return `<div class="math-block">${window.katex.renderToString(math, { displayMode: true, throwOnError: false })}</div>`;
      } catch (e) {
        return `<div class="math-block math-error">${escapeHtml(math)}</div>`;
      }
    });

    // Inline math $ ... $
    html = html.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
      try {
        return window.katex.renderToString(math, { displayMode: false, throwOnError: false });
      } catch (e) {
        return `$${escapeHtml(math)}$`;
      }
    });
  }

  // Restore code blocks
  html = html.replace(/%%CODEBLOCK_(\d+)%%/g, (match, idx) => codeBlocks[parseInt(idx)]);

  // Run through normal markdown renderer
  html = renderMarkdown(html);

  // Process Mermaid Diagram Blocks - replaces the base renderer's output
  html = html.replace(/<pre class="code-block"><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi, (match, code) => {
    const rawMermaid = decodeURIComponent(code).replace(/</g, '<').replace(/>/g, '>').replace(/&/g, '&');
    const id = `mermaid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    setTimeout(() => {
      if (window.mermaid) {
        window.mermaid.initialize({ 
          startOnLoad: false, 
          theme: document.documentElement.dataset.theme === 'light' ? 'default' : 'dark',
          securityLevel: 'loose'
        });
        const el = document.getElementById(id);
        if (el) {
          window.mermaid.render(`${id}_svg`, rawMermaid).then(({ svg }) => {
            el.innerHTML = svg;
          }).catch(err => {
            el.innerHTML = `<pre class="mermaid-error">Diagram render error</pre>`;
          });
        }
      }
    }, 100);

    return `<div class="mermaid-container" id="${id}"><div class="typing">Rendering Diagram...</div></div>`;
  });

  return html;
}

// 4. Store (State Management)
const defaults = {
  chats: [], activeChatId: null, files: [], projects: [], route: 'chat',
  model: 'pro', temperature: 0.7, topP: 0.9, autoScroll: true,
  theme: 'dark', density: 'comfortable', motion: true, tags: {},
  streaming: false,
  voiceFeaturesDisabled: false
};

let storageHealthy = true;

function checkStorageHealth() {
  try {
    const testKey = `__${INSTANCE_PREFIX}_storage_test__`;
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('[Berto] localStorage unavailable or blocked:', e);
    storageHealthy = false;
    return false;
  }
}

function readStorage(key, fallback) {
  if (!storageHealthy) {
    return readSessionStorage(key, fallback);
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (e) {
    console.error(`[Berto] Failed to read "${key}" from local storage:`, e);
    return readSessionStorage(key, fallback);
  }
}

function readSessionStorage(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (storageHealthy) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error(`[Berto] Failed to write "${key}" to local storage:`, e);
      storageHealthy = false;
    }
  }
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`[Berto] Failed to write "${key}" to session storage:`, e);
    return false;
  }
}

class Store {
  constructor() {
    const saved = readStorage(CONFIG.storage.state, defaults);
    delete saved.streaming;
    this.state = {
      ...defaults,
      ...saved,
      chats: saved.chats?.length ? saved.chats : [this.newChatRecord('Untitled conversation')]
    };
    this.state.activeChatId ||= this.state.chats[0].id;
    this.profile = readStorage(CONFIG.storage.profile, {
      name: 'Clear & thoughtful',
      tone: 'Warm and precise',
      formality: 'Balanced',
      vocabulary: 'Plain language',
      style: 'Conversational',
      samples: []
    });
    this.listeners = new Set();
  }

  newChatRecord(title = 'Untitled conversation') {
    return {
      id: window.crypto?.randomUUID ? window.crypto.randomUUID() : `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      title,
      messages: [],
      pinned: false,
      archived: false,
      tags: [],
      updatedAt: Date.now(),
      summary: ''
    };
  }

  get activeChat() {
    return this.state.chats.find(chat => chat.id === this.state.activeChatId) || this.state.chats[0];
  }

  get messages() {
    return this.activeChat?.messages || [];
  }

  update(patch) {
    Object.assign(this.state, patch);
    this.persist();
    return this.state;
  }

  persist() {
    const json = JSON.stringify(this.state);
    if (!writeStorage(CONFIG.storage.state, json)) {
      console.error('[Berto] State save failed');
      toast('Storage unavailable. Data may not persist.', 'error');
    }
    this.listeners.forEach(listener => listener(this.state));
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  saveProfile(profile) {
    this.profile = profile;
    try { localStorage.setItem(CONFIG.storage.profile, JSON.stringify(profile)); } catch (e) {}
  }

  addChat(title = 'Untitled conversation') {
    const chat = this.newChatRecord(title);
    this.state.chats.unshift(chat);
    this.state.activeChatId = chat.id;
    this.persist();
    return chat;
  }

  selectChat(id) {
    this.update({ activeChatId: id, route: 'chat' });
  }

  togglePinChat(id) {
    const chat = this.state.chats.find(c => c.id === id);
    if (chat) {
      chat.pinned = !chat.pinned;
      this.persist();
    }
  }

  renameChat(id, title) {
    const chat = this.state.chats.find(c => c.id === id);
    if (chat && title.trim()) {
      chat.title = title.trim();
      this.persist();
    }
  }

  deleteChat(id) {
    this.state.chats = this.state.chats.filter(c => c.id !== id);
    if (!this.state.chats.length) {
      this.state.chats.push(this.newChatRecord('Untitled conversation'));
    }
    if (this.state.activeChatId === id) {
      this.state.activeChatId = this.state.chats[0].id;
    }
    this.persist();
  }

  autoTitleChat(id, firstPrompt) {
    const chat = this.state.chats.find(c => c.id === id);
    if (chat && (chat.title === 'Untitled conversation' || !chat.title)) {
      let title = firstPrompt.trim().replace(/^[^a-zA-Z0-9]+/, '').split('\n')[0];
      title = title.replace(/\[Attached File:.*\]/gi, '').trim().replace(/^[^a-zA-Z0-9]+/, '');
      if (title.length > 36) title = title.slice(0, 36) + '...';
      chat.title = title || 'New Chat';
      this.persist();
    }
  }

  addMessage(message) {
    const chat = this.activeChat;
    if (!chat) return;
    const msgId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    chat.messages.push({ id: msgId, createdAt: Date.now(), ...message });
    chat.updatedAt = Date.now();
    this.persist();
    return chat.messages.at(-1);
  }

  updateMessage(id, patch) {
    const message = this.messages.find(item => item.id === id);
    if (message) {
      Object.assign(message, patch);
      this.activeChat.updatedAt = Date.now();
      this.persist();
    }
    return message;
  }

  removeMessage(id) {
    const chat = this.activeChat;
    if (chat) {
      chat.messages = chat.messages.filter(message => message.id !== id);
      this.persist();
    }
  }

  addFile(file) {
    this.state.files.unshift(file);
    this.persist();

    // Route large binary payloads (base64 images, large text) to IndexedDB
    // to avoid hitting localStorage's ~5MB quota
    const content = file.content || '';
    const isLarge = (file.bytes || content.length) > 256 * 1024; // > 256KB
    if (isLarge && content) {
      dbStorage.set('files', file.name, {
        name: file.name,
        content: content,
        isImage: file.isImage,
        mimeType: file.mimeType || file.type,
        bytes: file.bytes
      }).catch(err => console.warn('[Berto] IndexedDB file save failed:', err));
    }
  }

  removeFile(name) {
    this.state.files = this.state.files.filter(f => f.name !== name);
    this.persist();
    // Also remove from IndexedDB if it was stored there
    dbStorage.remove('files', name).catch(() => {});
  }

  addProject(project) {
    this.state.projects.push(project);
    this.persist();
  }

  updateProject(index, project) {
    if (this.state.projects[index]) {
      this.state.projects[index] = project;
      this.persist();
    }
  }

  removeProject(index) {
    this.state.projects.splice(index, 1);
    this.persist();
  }

  exportData() {
    return JSON.stringify({ ...this.state, writingProfile: this.profile }, null, 2);
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.chats || !Array.isArray(data.chats)) {
        throw new Error('Invalid backup file format.');
      }
      this.state = { ...defaults, ...data };
      if (data.writingProfile) this.saveProfile(data.writingProfile);
      this.persist();
      renderChats();
      renderMessages();
      renderFiles();
      renderProjects();
      renderWritingProfile();
      toast('Workspace imported successfully!');
      return true;
    } catch (err) {
      toast(`Import failed: ${err.message}`, 'error');
      return false;
    }
  }
}

// 5. ModelRouter (Gemini API Integration)
class ApiError extends Error {
  constructor(message, code, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

class ModelRouter {
  constructor() {
    this.abortController = null;
    // Fix: Use readStorage helper to handle incognito/fallback storage
    this.usage = readStorage(`${INSTANCE_PREFIX}-model-usage`, {});
    
    const today = getLocalDateKey();
    for (const k of Object.keys(this.usage)) {
      if (!k.startsWith(today)) delete this.usage[k];
    }
  }

  key() {
    return localStorage.getItem(CONFIG.storage.apiKey)?.trim();
  }

  modelList(preferred = 'flash') {
    const models = [...CONFIG.models];
    const start = models.findIndex(model => model.id === preferred);
    return start > -1 ? [...models.slice(start), ...models.slice(0, start)].filter(m => m.id !== 'fallback') : models.filter(m => m.id !== 'fallback');
  }

  remaining(model) {
    const today = getLocalDateKey();
    return Math.max(0, model.dailyLimit - Number(this.usage[`${today}:${model.id}`] || 0));
  }

  consume(model) {
    const today = getLocalDateKey();
    const key = `${today}:${model.id}`;
    this.usage[key] = Number(this.usage[key] || 0) + 1;
    writeStorage(`${INSTANCE_PREFIX}-model-usage`, JSON.stringify(this.usage));
  }

  async request({ prompt, system, history = [], stream = false, preferred = 'flash', temperature = 0.7, topP = 0.9, onText, signal: externalSignal, images = [] } = {}) {
    const key = this.key();
    if (!key) throw new ApiError('Add your Gemini API key in Settings to start generating.', 'CONFIGURATION');

    this.abortController?.abort();
    this.abortController = new AbortController();
    const signal = externalSignal || this.abortController.signal;

    const userModel = CONFIG.models.find(m => m.id === preferred);
    const fallbackModel = CONFIG.models.find(m => m.id === 'fallback');
    if (!userModel) throw new ApiError(`Model "${preferred}" not found.`, 'CONFIGURATION');

    const modelOrder = [userModel];
    if (fallbackModel) modelOrder.push(fallbackModel);

    let lastError;
    for (const model of modelOrder) {
      if (this.remaining(model) <= 0) {
        lastError = new ApiError(`Your daily limit for ${model.label} (${model.dailyLimit}) is used up.`, 'QUOTA');
        continue;
      }
      for (let attempt = 0; attempt < CONFIG.maxRetries; attempt += 1) {
        try {
          const result = await this.callModel({ key, model, prompt, system, history, stream, temperature, topP, onText, signal, images });
          this.consume(model);
          return { ...result, model: model.label, modelId: model.id };
        } catch (error) {
          lastError = error;
          if (error.name === 'AbortError' || error.code === 'CONFIGURATION') throw error;
          if (!error.retryable) break;
          await sleep(2 ** attempt * 500, signal);
        }
      }
    }
    throw lastError || new ApiError('No model could complete the request.', 'UNAVAILABLE');
  }

  stop() {
    this.abortController?.abort();
  }

  async callModel({ key, model, prompt, system, history, stream, temperature, topP, onText, signal, images }) {
    const endpoint = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), stream ? CONFIG.streamTimeoutMs : CONFIG.requestTimeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });

    try {
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.apiModel}:${endpoint}${separator}key=${encodeURIComponent(key)}`;
      
      const sanitizedHistory = (history || [])
        .filter(item => item && item.content && item.content.trim())
        .map(item => ({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content }]
        }));

      const userParts = [];
      if (prompt && prompt.trim()) {
        userParts.push({ text: prompt });
      }

      if (images?.length) {
        images.forEach(img => {
          let base64Data = '';
          if (typeof img.data === 'string') {
            base64Data = img.data.includes(',') ? img.data.split(',')[1] : img.data;
          }
          if (base64Data) {
            userParts.push({
              inlineData: {
                mimeType: img.mimeType || 'image/jpeg',
                data: base64Data
              }
            });
          }
        });
      }

      const contents = [
        ...sanitizedHistory,
        { role: 'user', parts: userParts }
      ];

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature, topP }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        let errDetails = '';
        try {
          const errBody = await response.json();
          errDetails = errBody?.error?.message || '';
        } catch {}
        throw new ApiError(
          errDetails ? `Gemini API Error: ${errDetails}` : `Gemini request failed (${response.status}).`,
          `HTTP_${response.status}`,
          response.status === 429 || response.status >= 500
        );
      }

      if (!stream) {
        const data = await response.json();
        return {
          text: data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '',
          tokens: data.usageMetadata?.totalTokenCount || 0
        };
      }

      return this.readStream(response, onText, controller.signal);
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      if (error instanceof ApiError) throw error;
      throw new ApiError('Network request failed. Please check your connection or API key.', 'NETWORK', true);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }

  getWorkspaceTools() {
    return [
      {
        functionDeclarations: [
          {
            name: "execute_ui_action",
            description: "Control the workspace UI (navigate, type text, change theme, snap photo, update user profile).",
            parameters: {
              type: "OBJECT",
              properties: {
                actions: {
                  type: "ARRAY",
                  description: "Sequential workspace actions.",
                  items: {
                    type: "OBJECT",
                    properties: {
                      action: { 
                        type: "STRING", 
                        description: "Action: 'snap_photo', 'use_writing_studio', 'navigate', 'set_name', 'set_theme', 'type', 'click', 'new_chat', 'send_chat', 'showcase_features'" 
                      },
                      countdown: { type: "NUMBER", description: "Countdown seconds before snapping photo (default 2)" },
                      autoCapture: { type: "BOOLEAN", description: "Whether to auto-snap after countdown (default true)" },
                      format: { type: "STRING", description: "Format for writing studio: 'Essay', 'Email', 'Blog', 'Report', 'Resume'" },
                      prompt: { type: "STRING", description: "Topic/prompt for Writing Studio or question to analyze with snapped photo" },
                      value: { type: "STRING", description: "Text or value to insert" },
                      target: { type: "STRING", description: "Element ID, selector, or label" },
                      view: { type: "STRING", description: "View name: 'chat', 'writing', 'files', 'projects', 'voice', 'settings'" }
                    },
                    required: ["action"]
                  }
                }
              },
              required: ["actions"]
            }
          }
        ]
      }
    ];
  }

  async readStream(response, onText, signal) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let output = '';

    while (true) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const raw = line.replace(/^data:\s*/, '').trim();
        if (!raw || raw === '[DONE]') continue;
        try {
          const data = JSON.parse(raw);
          const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
          if (text) {
            output += text;
            onText?.(output);
          }
        } catch (e) {}
      }
    }
    return { text: output, tokens: 0 };
  }
}

// 6. Application Logic & UI Handlers
const store = new Store();
const api = new ModelRouter();
let activeRequest = null;
let draftTimer = null;
let currentAttachments = [];

const savedUi = readStorage(CONFIG.storage.preferences, {});
applyPreferences({ ...store.state, ...savedUi });

function applyPreferences(prefs) {
  document.documentElement.dataset.theme = prefs.theme || 'dark';
  document.documentElement.dataset.density = prefs.density || 'comfortable';
  document.documentElement.dataset.motion = prefs.motion === false ? 'off' : 'full';
  
  const name = prefs.userName || 'User';
  if ($('#welcome-name')) $('#welcome-name').textContent = name;
  if ($('#sidebar-name')) $('#sidebar-name').textContent = name;
  
  const initial = (name.charAt(0) || 'U').toUpperCase();
  $$('.avatar').forEach(node => node.textContent = initial);

  const themeButtons = $$('[data-setting-theme]');
  const currentTheme = prefs.theme || 'dark';
  themeButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.settingTheme === currentTheme);
  });
}

// --- MANAGED ACCOUNT / NETWORK RESTRICTION DETECTOR ---

function setVoiceFeaturesDisabled(disabled = true) {
  store.update({ voiceFeaturesDisabled: disabled });
  if (disabled) {
    document.documentElement.setAttribute('data-voice-disabled', 'true');
    // If user is currently on the Voice view, redirect them to Chat
    if (store.state.route === 'voice') {
      route('chat');
      toast('Voice features are disabled on this account/network.', 'info');
    }
  } else {
    document.documentElement.removeAttribute('data-voice-disabled');
  }
}

// Probes the Gemini API Key & WebSocket to check for Education/Managed Account blocks
async function detectManagedAccountRestrictions() {
  const key = localStorage.getItem(CONFIG.storage.apiKey)?.trim();
  if (!key) return;

  try {
    // 1. Probe the Gemini REST API to check for 403 Forbidden / Workspace Admin restrictions
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
    
    if (!response.ok) {
      if (response.status === 403 || response.status === 400) {
        console.warn('[Berto] School/Workspace account restriction detected via REST API (HTTP ' + response.status + ').');
        setVoiceFeaturesDisabled(true);
        return;
      }
    }

    // 2. Test WebSocket endpoint to detect network firewall / WebSocket policy blocks
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(key)}`;
    const testWs = new WebSocket(wsUrl);

    const wsTimer = setTimeout(() => {
      try { testWs.close(); } catch(e) {}
    }, 2000);

    testWs.onerror = () => {
      clearTimeout(wsTimer);
      console.warn('[Berto] School Wi-Fi or Workspace Admin WebSocket block detected.');
      setVoiceFeaturesDisabled(true);
    };

    testWs.onopen = () => {
      clearTimeout(wsTimer);
      // Connection succeeded — voice features are enabled
      setVoiceFeaturesDisabled(false);
      try { testWs.close(); } catch(e) {}
    };

  } catch (err) {
    console.warn('[Berto] Error checking account restrictions:', err);
  }
}

function applyTheme(newTheme) {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  if (currentTheme === newTheme) return;

  const motionOff = document.documentElement.dataset.motion === 'off';
  if (motionOff) {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    return;
  }

  document.querySelector('.ultimate-water-overlay')?.remove();

  const isLightTarget = newTheme === 'light';
  const modeClass = isLightTarget ? '' : 'mode-down';

  const wGlassBg = isLightTarget ? 'rgba(5, 143, 115, 0.22)' : 'rgba(130, 243, 208, 0.18)';
  const wSwell   = isLightTarget ? 'rgba(5, 143, 115, 0.35)' : 'rgba(130, 243, 208, 0.28)';
  const wMain    = isLightTarget ? 'rgba(5, 143, 115, 0.55)' : 'rgba(130, 243, 208, 0.45)';
  const wGlow    = isLightTarget ? 'rgba(5, 143, 115, 0.75)' : 'rgba(130, 243, 208, 0.85)';

  const overlay = document.createElement('div');
  overlay.className = `ultimate-water-overlay ${modeClass}`;
  overlay.style.setProperty('--w-glass-bg', wGlassBg);
  overlay.style.setProperty('--w-swell', wSwell);
  overlay.style.setProperty('--w-main', wMain);
  overlay.style.setProperty('--w-glow', wGlow);

  overlay.innerHTML = `
    <svg class="water-svg-waves" viewBox="0 0 1440 160" preserveAspectRatio="none">
      <defs>
        <linearGradient id="shine-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.3)" />
          <stop offset="50%" stop-color="rgba(255,255,255,0.98)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.3)" />
        </linearGradient>
      </defs>
      <path class="wave-swell" d="M0,60 C360,130 720,10 1080,90 C1260,130 1380,50 1440,70 L1440,160 L0,160 Z"></path>
      <path class="wave-main" d="M0,80 C320,140 640,30 960,110 C1180,150 1340,75 1440,95 L1440,160 L0,160 Z"></path>
      <path class="wave-shine" d="M0,78 C320,138 640,28 960,108 C1180,148 1340,73 1440,93"></path>
    </svg>
    <div class="water-glass-body"></div>
    <div class="water-bubbles">
      <span class="bubble b1"></span>
      <span class="bubble b2"></span>
      <span class="bubble b3"></span>
      <span class="bubble b4"></span>
      <span class="bubble b5"></span>
      <span class="bubble b6"></span>
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(() => {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }, 550);

  setTimeout(() => {
    overlay.remove();
  }, 1280);
}

function savePreferences(patch) {
  const previousTheme = savedUi.theme || 'dark';
  Object.assign(savedUi, patch);
  writeStorage(CONFIG.storage.preferences, JSON.stringify(savedUi));

  if (patch.theme && patch.theme !== previousTheme) {
    applyTheme(patch.theme);
  }

  applyPreferences(savedUi);
  store.update(patch);
}

// =========================================================
// INSTANT TOKEN STREAMER — Zero-typewriter AI streaming
// =========================================================

// Batch token chunking: replaces old character-by-character typing loops with
// ultra-fast word/phrase token injection (25ms per word block instead of 50ms per char)
async function typeTextToInput(selector, text, batchSize = 4) {
  const el = typeof selector === 'string' ? await waitForElement(selector) : selector;
  if (!el) return;
  el.focus();
  el.value = '';

  // Break text into word tokens for realistic, high-speed AI insertion
  const tokens = text.match(/(\s+|\S+)/g) || [text];

  for (let i = 0; i < tokens.length; i += batchSize) {
    const chunk = tokens.slice(i, i + batchSize).join('');
    el.value += chunk;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (el.id === 'writing-input' && typeof writingMetrics === 'function') {
      writingMetrics();
    }
    await sleep(25); // Ultra-fast token batch pulse instead of letter-by-letter lag
  }
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function typeTextToElement(selector, markdownText) {
  const el = typeof selector === 'string' ? await waitForElement(selector) : selector;
  if (!el) return;

  // Render full markdown instantly or stream in 5-word token blocks
  const tokens = markdownText.match(/(\s+|\S+)/g) || [markdownText];
  let currentText = '';

  for (let i = 0; i < tokens.length; i += 5) {
    currentText += tokens.slice(i, i + 5).join('');
    el.innerHTML = typeof renderMarkdownEnhanced === 'function' ? renderMarkdownEnhanced(currentText) : renderMarkdown(currentText);
    await sleep(15);
  }
}

async function pulseHighlight(selector, durationMs = 1000) {
  const el = typeof selector === 'string' ? $(selector) : selector;
  if (!el) return;
  el.style.transition = 'box-shadow 0.3s ease, transform 0.3s ease';
  const originalShadow = el.style.boxShadow;
  const originalTransform = el.style.transform;
  
  el.style.boxShadow = '0 0 0 3px var(--accent, #10b981), 0 0 20px rgba(16, 185, 129, 0.4)';
  el.style.transform = 'scale(1.02)';
  
  await sleep(durationMs);
  
  el.style.boxShadow = originalShadow;
  el.style.transform = originalTransform;
}

// =========================================================
// PERCEPTION LAYER: Live UI State Context Injection
// =========================================================

function getUiStateContext() {
  const artifactFrame = $('#artifact-frame');
  const artifactOpen = !!(artifactFrame && !artifactFrame.closest('[hidden]') && artifactFrame.srcdoc);
  const artifactContent = artifactOpen && artifactFrame?.contentDocument?.body
    ? artifactFrame.contentDocument.body.innerText.slice(0, 500)
    : '';

  return JSON.stringify({
    activeRoute: store.state.route,
    activeChatId: store.state.activeChatId,
    activeModel: store.state.model,
    theme: store.state.theme,
    writingInputLength: $('#writing-input')?.value.length || 0,
    writingInputText: $('#writing-input')?.value.slice(0, 200) || '',
    promptText: $('#prompt')?.value.slice(0, 200) || '',
    isCameraActive: !!(voiceEngineInstance && voiceEngineInstance.videoTrack),
    isScreenSharing: !!(voiceEngineInstance && voiceEngineInstance.screenTrack),
    isArtifactOpen: artifactOpen,
    artifactTitle: artifactOpen ? ($('#artifact-label')?.textContent || 'Live Preview') : '',
    artifactContentPreview: artifactContent,
    activeChatTitle: store.state.chats.find(c => c.id === store.state.activeChatId)?.title || '',
    messageCount: store.messages.length,
    fileCount: store.state.files.length,
    projectCount: store.state.projects.length,
    taskCount: getKanbanTasks().length
  });
}

// =========================================================
// CINEMATIC KEYNOTE SHOWCASE DIRECTOR
// =========================================================

class CinematicDirector {
  constructor() {
    this.cursorEl = null;
    this.spotlightEl = null;
    this.hudEl = null;
    this.isActive = false;
  }

  initOverlay() {
    if ($('#cinematic-hud')) return;

    // 1. Spotlight Mask
    this.spotlightEl = document.createElement('div');
    this.spotlightEl.id = 'cinematic-spotlight';
    this.spotlightEl.className = 'cinematic-spotlight';

    // 2. Animated Laser Cursor
    this.cursorEl = document.createElement('div');
    this.cursorEl.id = 'cinematic-cursor';
    this.cursorEl.className = 'cinematic-cursor';
    this.cursorEl.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="#82f3d0" stroke="#08271f" stroke-width="1.8"/>
      </svg>
      <div class="cursor-ripple"></div>
    `;

    // 3. Lower-Third Keynote HUD Banner
    this.hudEl = document.createElement('div');
    this.hudEl.id = 'cinematic-hud';
    this.hudEl.className = 'cinematic-hud';
    this.hudEl.innerHTML = `
      <div class="hud-content">
        <span class="hud-badge">BERTO KEYNOTE</span>
        <span class="hud-title" id="hud-stage-title">Initializing Showcase...</span>
        <span class="hud-subtitles" id="hud-subtitles"></span>
      </div>
      <div class="hud-controls">
        <div class="hud-progress-dots" id="hud-progress-dots"></div>
        <button class="hud-ctrl-btn" id="hud-prev-btn" title="Previous Stage" onclick="window.cinematicDirector.jumpToStage(-1)">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"/></svg>
        </button>
        <button class="hud-ctrl-btn" id="hud-pause-btn" title="Pause / Resume" onclick="window.cinematicDirector.togglePause()">
          <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        </button>
        <button class="hud-ctrl-btn" id="hud-next-btn" title="Next Stage" onclick="window.cinematicDirector.jumpToStage(1)">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"/></svg>
        </button>
        <button class="hud-exit-btn" onclick="window.cinematicDirector.stopShowcase()">Exit Keynote</button>
      </div>
    `;

    // 4. Keyboard On-Screen Display (OSD) Overlay
    this.osdEl = document.createElement('div');
    this.osdEl.id = 'cinematic-osd';
    this.osdEl.className = 'cinematic-osd';
    this.osdEl.style.display = 'none';

    document.body.appendChild(this.spotlightEl);
    document.body.appendChild(this.cursorEl);
    document.body.appendChild(this.hudEl);
    document.body.appendChild(this.osdEl);

    this.cursorEl.style.left = '50vw';
    this.cursorEl.style.top = '100vh';
  }

  destroyOverlay() {
    this.spotlightEl?.remove();
    this.cursorEl?.remove();
    this.hudEl?.remove();
    this.osdEl?.remove();
    this.isActive = false;
  }

  setHUD(title) {
    const titleEl = $('#hud-stage-title');
    if (titleEl) titleEl.innerHTML = title;
  }

  showOSDText(text, durationMs = 1200) {
    if (!this.osdEl) return;
    this.osdEl.textContent = text;
    this.osdEl.style.display = 'block';
    this.osdEl.classList.add('fade-in');
    setTimeout(() => {
      this.osdEl.style.display = 'none';
      this.osdEl.classList.remove('fade-in');
    }, durationMs);
  }

  _triggerClickRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'cinematic-click-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  async glideTo(selector, click = true, durationMs = 650) {
    const target = await waitForElement(selector, 2000);
    if (!target || !this.cursorEl) return null;

    const rect = target.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    // Move Aperture Spotlight to target center
    if (this.spotlightEl) {
      this.spotlightEl.style.setProperty('--spotlight-x', `${targetX}px`);
      this.spotlightEl.style.setProperty('--spotlight-y', `${targetY}px`);
      this.spotlightEl.style.setProperty('--spotlight-radius', `${Math.max(rect.width, rect.height, 120)}px`);
    }

    // Smooth Cursor Glide
    this.cursorEl.style.transition = `all ${durationMs}ms cubic-bezier(.22, .8, .2, 1)`;
    this.cursorEl.style.left = `${targetX}px`;
    this.cursorEl.style.top = `${targetY}px`;

    await sleep(durationMs);

    target.classList.add('cinematic-target-glow');
    setTimeout(() => target.classList.remove('cinematic-target-glow'), 1200);

    if (click) {
      this.cursorEl.classList.add('clicking');
      this._triggerClickRipple(targetX, targetY);
      target.focus?.();
      target.click();
      await sleep(180);
      this.cursorEl.classList.remove('clicking');
    }

    return target;
  }

  // Pure audio speech output — NO microphone permission required during presentation!
  // Uses Web Speech API onboundary for word-precise subtitle synchronization
  speak(text) {
    return new Promise((resolve) => {
      // Show Subtitles in HUD
      const hudSubtitles = $('#hud-subtitles') || (() => {
        const sub = document.createElement('span');
        sub.id = 'hud-subtitles';
        sub.className = 'hud-subtitles';
        $('.hud-content')?.appendChild(sub);
        return sub;
      })();
      
      if (hudSubtitles) hudSubtitles.textContent = text;

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
        if (englishVoice) utterance.voice = englishVoice;

        let hasResolved = false;
        let wordIndex = 0;
        const words = text.split(/\s+/);

        // Word-Boundary Precise Subtitle Sync
        // Fires on each word boundary, updating the HUD subtitle in real-time
        utterance.onboundary = (event) => {
          if (event.name === 'word' && event.charIndex !== undefined) {
            // Find the word at this char index for precise subtitle tracking
            const remaining = text.slice(event.charIndex);
            const currentWord = remaining.split(/\s+/)[0] || '';
            if (hudSubtitles && currentWord) {
              // Show the current word being spoken with a subtle highlight
              hudSubtitles.textContent = currentWord;
              hudSubtitles.classList.add('is-speaking');
            }
          }
        };

        utterance.onend = () => { 
          if (hudSubtitles) {
            hudSubtitles.textContent = text;
            hudSubtitles.classList.remove('is-speaking');
          }
          if (!hasResolved) { hasResolved = true; resolve(); } 
        };
        utterance.onerror = () => { 
          if (hudSubtitles) hudSubtitles.classList.remove('is-speaking');
          if (!hasResolved) { hasResolved = true; resolve(); } 
        };

        window.speechSynthesis.speak(utterance);
        setTimeout(() => { if (!hasResolved) { hasResolved = true; resolve(); } }, 10000);
      } else {
        resolve();
      }
    });
  }

  // Interactive Keynote HUD Controls
  jumpToStage(direction) {
    if (!this.isActive) return;
    window.speechSynthesis?.cancel();
    this._pendingJump = direction;
    this._jumpRequested = true;
    toast(direction > 0 ? 'Skipping to next stage...' : 'Going to previous stage...', 'info');
  }

  togglePause() {
    if (!this.isActive) return;
    this.isPaused = !this.isPaused;
    const pauseBtn = $('#hud-pause-btn');
    if (pauseBtn) {
      pauseBtn.innerHTML = this.isPaused
        ? `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 20 5 3"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
    }
    if (this.isPaused) {
      window.speechSynthesis?.cancel();
      toast('Keynote paused', 'info');
    } else {
      toast('Keynote resumed', 'info');
    }
  }

  async waitIfPaused() {
    while (this.isPaused && this.isActive) {
      await sleep(200);
    }
  }

  updateProgressDots(currentStage, totalStages) {
    const dotsContainer = $('#hud-progress-dots');
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalStages; i++) {
      const dot = document.createElement('span');
      dot.className = 'hud-dot';
      if (i < currentStage) dot.classList.add('completed');
      if (i === currentStage) dot.classList.add('active');
      dotsContainer.appendChild(dot);
    }
  }

  stopShowcase() {
    this.isActive = false;
    this.isPaused = false;
    window.speechSynthesis?.cancel();
    if (voiceEngineInstance?.isListening) voiceEngineInstance.stopListening();
    this.destroyOverlay();
    toast('Keynote Showcase exited', 'info');
  }
}

window.cinematicDirector = new CinematicDirector();

// =========================================================
// CHOREOGRAPHED SHOWCASE TIMELINE
// =========================================================

async function runFeatureShowcase(customRequest = '') {
  const director = window.cinematicDirector;
  director.isActive = true;
  director.initOverlay();

  const { name: userName } = getUserInfo();

  // DYNAMIC AI-COMPOSED KEYNOTES
  // If a custom request is provided, generate a tailored sequence on the fly
  if (customRequest && typeof customRequest === 'string' && customRequest.trim()) {
    try {
      const key = api.key();
      if (key) {
        const result = await api.request({
          prompt: `Generate a JSON array of UI automation steps to demonstrate this workflow in the Berto AI Workspace: "${customRequest}"

Return ONLY a valid JSON array. Each step must use one of these action types:
- {"action":"navigate","view":"chat"|"writing"|"files"|"projects"|"voice"|"settings"}
- {"action":"type","selector":"#prompt"|"#writing-input","value":"text"}
- {"action":"click","selector":"#send-button"|"#writing-generate"|"#writing-mode"}
- {"action":"use_writing_studio","format":"Essay"|"Email"|"Blog"|"Report"|"Resume","prompt":"topic"}
- {"action":"add_task","title":"Task Name","status":"todo"}
- {"action":"set_theme","value":"dark"|"light"}
- {"action":"patch_artifact","selector":"CSS_SELECTOR","html":"NEW_HTML"}
- {"action":"open_camera"}
- {"action":"snap_photo","countdown":2}
- {"action":"new_chat"}
- {"action":"send_chat","value":"message text"}

Keep it to 4-8 steps that tell a compelling story about the requested workflow.`,
          system: 'You are a keynote choreographer. Output ONLY valid JSON. No markdown, no preamble.',
          preferred: store.state.model,
          temperature: 0.4
        });

        const jsonMatch = result.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const actions = JSON.parse(jsonMatch[0]);
          if (Array.isArray(actions) && actions.length > 0) {
            director.setHUD(`Custom Keynote: <strong>${escapeHtml(customRequest.slice(0, 40))}</strong>`);
            await director.speak(`Let me demonstrate how to ${customRequest}. Watch closely!`);
            await executeUiSequence(actions);
            director.setHUD(`Custom Keynote Complete`);
            await director.speak(`That's how you ${customRequest}. Would you like me to walk through anything else?`);
            director.destroyOverlay();
            toast('Custom Keynote complete!', 'success');
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Custom keynote generation failed, falling back to default showcase:', err);
    }
  }

  try {
    // ---------------------------------------------------------
    // INTRO
    // ---------------------------------------------------------
    director.setHUD(`Welcome, <strong>${userName}</strong> — Berto AI Keynote`);
    route('voice');
    await sleep(500);

    await Promise.all([
      director.speak(`Hey ${userName}! Welcome to Berto AI Workspace. Watch closely as I take control and demonstrate what we can create together.`),
      (async () => {
        await director.glideTo('#voice-canvas-visualizer', false, 700);
      })()
    ]);

    if (!director.isActive) return;

    // ---------------------------------------------------------
    // STAGE 1: Autonomous Agent & Live Split-Screen Artifacts
    // ---------------------------------------------------------
    director.setHUD(`Stage 1/4: <strong>Autonomous Agent & Split-Screen Artifacts</strong>`);

    const stage1Speech = director.speak(
      `I can construct interactive applications and render split-screen previews right beside our conversation.`
    );

    await sleep(300);
    route('chat');
    await sleep(300);

    store.addChat('Keynote Showcase');
    renderChats();
    renderMessages();

    await director.glideTo('#prompt', true, 500);
    const chatPrompt = "Build an interactive workspace analytics widget.";
    await typeTextToInput('#prompt', chatPrompt, 16);

    await director.glideTo('#send-button', true, 400);
    if ($('#prompt')) $('#prompt').value = '';
    updateCount();
    appendMessage({ role: 'user', content: chatPrompt });

    const assistantMsg = store.addMessage({ role: 'assistant', content: '', status: 'streaming' });
    renderMessages();
    const assistantNode = $(`[data-message="${assistantMsg.id}"] .message-body`);

    const mockChatResponse = `Generated your **Workspace Analytics Artifact**. Opening live split-screen preview...`;
    await typeTextToElement(assistantNode, mockChatResponse, 10);
    store.updateMessage(assistantMsg.id, { content: mockChatResponse, status: 'complete' });

    openArtifact(`
      <div style="font-family:system-ui, sans-serif; padding:18px; background:#0e1411; color:#82f3d0; border-radius:14px; border:1px solid rgba(130,243,208,0.2);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <h3 style="margin:0; color:#fff; font-size:15px; display:flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:var(--accent);"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>
            Live Workspace Metrics
          </h3>
          <span style="background:rgba(130,243,208,0.15); padding:3px 8px; border-radius:12px; font-size:10px; font-weight:700;">ACTIVE</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div style="background:#151e1a; padding:12px; border-radius:10px; border:1px solid rgba(228,255,243,0.08);">
            <small style="color:#8e9d95; display:block; margin-bottom:4px;">Tokens Processed</small>
            <strong style="font-size:16px; color:#fff;">14,820</strong>
          </div>
          <div style="background:#151e1a; padding:12px; border-radius:10px; border:1px solid rgba(228,255,243,0.08);">
            <small style="color:#8e9d95; display:block; margin-bottom:4px;">Stream Latency</small>
            <strong style="font-size:16px; color:#82f3d0;">16ms</strong>
          </div>
        </div>
      </div>
    `, 'Workspace Analytics Widget');

    await director.glideTo('#artifact-drawer', false, 600);
    await stage1Speech;
    if (!director.isActive) return;

    // ---------------------------------------------------------
    // STAGE 2: Ambient Liquid Theme Engine
    // ---------------------------------------------------------
    director.setHUD(`Stage 2/4: <strong>Ambient Liquid Theme Engine</strong>`);

    await Promise.all([
      director.speak(`Notice how the interface adapts. I can trigger ambient liquid theme transitions on demand.`),
      (async () => {
        await sleep(500);
        const currentTheme = document.documentElement.dataset.theme || 'dark';
        savePreferences({ theme: currentTheme === 'dark' ? 'light' : 'dark' });
        await sleep(1500);
        savePreferences({ theme: currentTheme });
      })()
    ]);

    if (!director.isActive) return;

    // ---------------------------------------------------------
    // STAGE 3: Ghostwriter & Voice Cloning Studio
    // ---------------------------------------------------------
    director.setHUD(`Stage 3/4: <strong>Ghostwriter & Voice Cloning Studio</strong>`);

    const stage3Speech = director.speak(
      `In the Writing Studio, I analyze your sample writing to clone your sentence structure and tone.`
    );

    closeArtifact();
    route('writing');
    await sleep(300);

    await director.glideTo('#writing-mode', true, 450);
    const modeSelect = $('#writing-mode');
    if (modeSelect) {
      modeSelect.value = 'Executive Summary';
      modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    await director.glideTo('#writing-input', true, 450);
    const writingInput = $('#writing-input');
    if (writingInput) {
      await typeTextToInput(writingInput, `Berto combines local privacy, real-time voice, and UI automation.`, 12);
    }

    const writingOutput = $('#writing-output');
    if (writingOutput) {
      writingOutput.hidden = false;
      await typeTextToElement(writingOutput, `### Executive Summary\n\n- **Architecture**: Zero-telemetry local state engine.\n- **Multimodal**: Native camera, screen share, and audio streaming.`, 10);
    }

    await stage3Speech;
    if (!director.isActive) return;

    // ---------------------------------------------------------
    // STAGE 4: Keynote Complete -> NOW prompt for Mic Live Mode
    // ---------------------------------------------------------
    director.setHUD(`Stage 4/4: <strong>Berto Live Audio & Vision Ready</strong>`);

    route('voice');
    await director.glideTo('#voice-canvas-visualizer', false, 600);

    await director.speak(
      `And best of all, we can converse in real time with live vision processing. What would you like to build today?`
    );

    // Keynote ends, remove presentation HUD overlay
    director.destroyOverlay();

    // Show a completion toast instead of auto-opening the mic
    toast('Keynote Showcase complete! Click "Start Speaking" anytime to begin.', 'success');

  } catch (err) {
    console.error('Keynote showcase error:', err);
    director.destroyOverlay();
  }
}

let cameraStream = null;
let capturedPhotoBlob = null;

async function openCamera() {
  // Stop active camera tracks if stream is already open
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  
  const modal = $('#camera-modal');
  const video = $('#camera-video');
  const canvas = $('#camera-canvas');
  const captureBtn = $('#capture-btn');
  const retakeBtn = $('#retake-btn');

  if (!modal || !video) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    cameraStream = stream;
    video.srcObject = stream;
    modal.hidden = false;
    if (captureBtn) captureBtn.hidden = false;
    if (retakeBtn) retakeBtn.hidden = true;
    if (canvas) canvas.hidden = true;
    video.hidden = false;
  } catch (error) {
    toast('Unable to access camera. Please allow camera permissions.', 'error');
    console.error('Camera access error:', error);
  }
}

function closeCameraModal() {
  const modal = $('#camera-modal');
  const video = $('#camera-video');

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  if (video) {
    video.srcObject = null;
  }
  if (modal) modal.hidden = true;
  capturedPhotoBlob = null;
}

function capturePhoto() {
  const video = $('#camera-video');
  const canvas = $('#camera-canvas');
  const captureBtn = $('#capture-btn');
  const retakeBtn = $('#retake-btn');
  const sendBtn = $('#send-camera-btn');

  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    capturedPhotoBlob = blob;
    if (captureBtn) captureBtn.hidden = true;
    if (retakeBtn) retakeBtn.hidden = false;
    if (sendBtn) {
      sendBtn.hidden = false;
      sendBtn.style.display = 'inline-flex';
    }
    video.hidden = true;
    canvas.hidden = false;
    toast('Photo captured! Click "Send to chat" to save.');
  }, 'image/jpeg', 0.92);
}

function retakePhoto() {
  const video = $('#camera-video');
  const canvas = $('#camera-canvas');
  const captureBtn = $('#capture-btn');
  const retakeBtn = $('#retake-btn');
  const sendBtn = $('#send-camera-btn');

  if (captureBtn) captureBtn.hidden = false;
  if (retakeBtn) retakeBtn.hidden = true;
  if (sendBtn) sendBtn.hidden = true;
  if (video) video.hidden = false;
  if (canvas) canvas.hidden = true;
  capturedPhotoBlob = null;
}

function route(routeName) {
  store.update({ route: routeName });
  $$('.view').forEach(view => view.classList.toggle('active', view.dataset.view === routeName));
  $$('.nav-item[data-route]').forEach(button => button.classList.toggle('active', button.dataset.route === routeName));
  const routeLabels = { chat: 'Chats', writing: 'Writing Studio', files: 'Files', projects: 'Projects', voice: 'Voice', settings: 'Settings' };
  if ($('#breadcrumb')) $('#breadcrumb').textContent = routeLabels[routeName] || routeName[0].toUpperCase() + routeName.slice(1);
  closeMobile();
  if (routeName === 'files') renderFiles();
  if (routeName === 'projects') renderProjects();
  if (routeName === 'settings') renderSettings();
  if (routeName === 'voice') initVoiceView();
}

function closeMobile() {
  $('#sidebar')?.classList.remove('open');
  $('.drawer-scrim')?.classList.remove('open');
}

function renderChats(filter = '') {
  const chats = store.state.chats.filter(chat => !chat.archived && (!filter || chat.title.toLowerCase().includes(filter.toLowerCase())));
  chats.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const listEl = $('#chat-list');
  if (!listEl) return;

  listEl.innerHTML = chats.map(chat => `
    <div class="chat-item-wrapper ${chat.id === store.state.activeChatId ? 'active' : ''}">
      <button class="chat-item ${chat.id === store.state.activeChatId ? 'active' : ''}" data-chat="${chat.id}">
        <span class="chat-pin-icon ${chat.pinned ? 'is-pinned' : ''}" data-action="pin-chat" data-chat-id="${chat.id}" title="${chat.pinned ? 'Unpin chat' : 'Pin chat'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${chat.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </span>
        <span class="chat-title-text">${escapeHtml(chat.title)}</span>
      </button>
      <div class="chat-item-actions">
        <button class="chat-action-btn" data-action="rename-chat-modal" data-chat-id="${chat.id}" title="Rename">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button class="chat-action-btn danger" data-action="delete-chat" data-chat-id="${chat.id}" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `).join('') || '<div class="sidebar-empty">No chats found</div>';

  const count = $('.nav-count');
  if (count) count.textContent = store.state.chats.length;

  const currentModel = CONFIG.models.find(m => m.id === store.state.model);
  if (currentModel && $('#model-label')) {
    $('#model-label').textContent = currentModel.label;
  }
}

function renderMessages() {
  const box = $('#messages');
  if (!box) return;
  const msgs = store.messages;
  showWelcome(msgs.length === 0);
  box.innerHTML = msgs.map(message => messageMarkup(message)).join('');
  
  // Highlight syntax in code blocks
  if (window.hljs) {
    box.querySelectorAll('pre code').forEach((block) => {
      window.hljs.highlightElement(block);
    });
  }
  
  box.querySelectorAll('[data-message]').forEach(node => node.classList.add('is-ready'));
  if (store.state.autoScroll && $('.chat-scroll')) $('.chat-scroll').scrollTop = $('.chat-scroll').scrollHeight;
}

// --- BERT LIVE VOICE READ ALOUD ENGINE ---
let activeSpeakingMsgId = null;

function stripMarkdownForSpeech(md = '') {
  return md
    .replace(/```[\s\S]*?```/g, ' [code block omitted] ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[#*_\-~>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resetReadAloudButtons() {
  activeSpeakingMsgId = null;
  document.querySelectorAll('[data-action="read-aloud"]').forEach(btn => {
    btn.classList.remove('is-reading');
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg><span>Read aloud</span>`;
  });
}

async function toggleReadAloud(messageId, buttonNode) {
  // 1. Stop audio if currently speaking or if clicking the active message
  if (voiceEngineInstance && (voiceEngineInstance.isSpeaking || activeSpeakingMsgId === messageId)) {
    voiceEngineInstance.cancelSpeaking();
    voiceEngineInstance.stopListening();
    resetReadAloudButtons();
    toast('Stopped reading', 'info');
    return;
  }

  // 2. Locate message content & sanitize markdown
  const msg = store.messages.find(m => m.id === messageId);
  if (!msg || !msg.content) return;

  const cleanText = stripMarkdownForSpeech(msg.content);
  if (!cleanText) return;

  // 3. Verify Gemini API key is present
  const key = localStorage.getItem(CONFIG.storage.apiKey)?.trim();
  if (!key) {
    toast('Add your Gemini API key in Settings to use Berto Live Voice.', 'error');
    return;
  }

  // 4. Initialize Voice Engine if not already active
  if (!voiceEngineInstance) {
    initVoiceView();
  }

  // 5. Update UI state to "Stop"
  resetReadAloudButtons();
  activeSpeakingMsgId = messageId;

  if (buttonNode) {
    buttonNode.classList.add('is-reading');
    buttonNode.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="color:var(--accent);"><rect x="6" y="6" width="12" height="12" rx="2"/></svg><span>Stop</span>`;
  }

  toast('Streaming Berto Live Voice...', 'info');

  // 6. Connect WebSocket without requesting microphone access & stream text
  try {
    if (!voiceEngineInstance.isListening) {
      await voiceEngineInstance.startListening({ enableMicrophone: false });
    }

    voiceEngineInstance.sendTextPrompt(
      `Read the following text out loud word-for-word cleanly and naturally. Do not add any extra intro, preamble, or commentary:\n\n${cleanText}`
    );
  } catch (err) {
    console.error('Berto Live Voice Read Aloud error:', err);
    toast('Failed to connect to Berto Live Voice', 'error');
    resetReadAloudButtons();
  }
}

function messageMarkup(message) {
  const isUser = message.role === 'user';
  const { initial: userInitial } = getUserInfo();

  // Check if message has an HTML code block
  const hasHtml = !isUser && message.content && /```html/i.test(message.content);
  const artifactBtn = hasHtml ? `<button data-action="open-msg-artifact" style="color:var(--accent,#82f3d0); font-weight:600;" class="btn-flex"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg><span>Open Artifact</span></button>` : '';
  const meta = message.model
    ? `<div class="message-meta">${escapeHtml(message.model)}${message.tokens ? ` · ${formatCount(message.tokens)} tokens` : ''}</div>`
    : '';

  const imagesHtml = message.images?.length
    ? `<div class="message-images">${message.images.map(img => `<img src="${escapeHtml(img.data)}" alt="${escapeHtml(img.name || 'image')}">`).join('')}</div>`
    : '';

  const filesHtml = message.files?.length
    ? `<div class="message-files">${message.files.map(file => `
        <div class="message-file-chip">
          <span class="file-chip-icon">${getFileIconSvg(file.name || file.type)}</span>
          <div class="file-chip-info">
            <span class="file-chip-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
            <span class="file-chip-size">${escapeHtml(file.size || file.type || 'File')}</span>
          </div>
        </div>
      `).join('')}</div>`
    : '';

  // ADD THIS BUTTON:
  const readAloudBtn = !isUser ? `
    <button data-action="read-aloud" data-message-id="${message.id}" title="Read response with Berto Live Voice" class="btn-flex ${activeSpeakingMsgId === message.id ? 'is-reading' : ''}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="${activeSpeakingMsgId === message.id ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${activeSpeakingMsgId === message.id 
          ? '<rect x="6" y="6" width="12" height="12" rx="2"/>' 
          : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>'}
      </svg>
      <span>${activeSpeakingMsgId === message.id ? 'Stop' : 'Read aloud'}</span>
    </button>
  ` : '';

  return `
    <article class="message ${isUser ? 'user' : 'assistant'}" data-message="${message.id}">
      <div class="message-avatar">${isUser ? userInitial : 'B'}</div>
      <div class="message-stack">
        ${imagesHtml}
        ${filesHtml}
        <div class="message-body">${renderMarkdown(stripJsonActions(message.content || ''))}</div>
        ${meta}
        <div class="message-actions">
          ${artifactBtn}
          ${readAloudBtn}
          <button data-action="fork-chat" data-message-id="${message.id}" title="Fork chat from here" class="btn-flex">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" y1="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
            <span>Fork</span>
          </button>
          <button data-copy>Copy</button>
          ${!isUser ? '<button data-edit-message>Regenerate</button>' : '<button data-edit-message>Edit</button>'}
          <button data-delete-message>Delete</button>
        </div>
      </div>
    </article>
  `;
}

function appendMessage(message) {
  store.addMessage(message);
  renderMessages();
}

function updateMessageView(id, content, extra = {}) {
  store.updateMessage(id, { content, ...extra });
  const node = $(`[data-message="${id}"]`);
  if (node) {
    const body = $('.message-body', node);
    if (body) body.innerHTML = renderMarkdown(stripJsonActions(content));
  }
}

function showWelcome(show) {
  const welcome = $('#welcome');
  const suggestions = $('#suggestions');
  if (welcome) welcome.style.display = show ? '' : 'none';
  if (suggestions) suggestions.style.display = show ? '' : 'none';
}

function setGenerating(isGenerating) {
  store.state.streaming = isGenerating;
  const button = $('#send-button');
  if (!button) return;

  // Use innerHTML so the browser parses the SVG instead of displaying raw code text
  button.innerHTML = isGenerating
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;

  button.setAttribute('aria-label', isGenerating ? 'Stop generating' : 'Send message');
  button.classList.toggle('is-stop', isGenerating);
  updateCount();
}

function updateCount() {
  const input = $('#prompt');
  if (!input) return;
  const count = input.value.length;
  const charCountNode = $('#char-count');
  if (charCountNode) charCountNode.textContent = `${formatCount(count)} / ${formatCount(CONFIG.maxMessageChars)}`;

  const sendBtn = $('#send-button');
  if (sendBtn) {
    const hasContent = count > 0 || currentAttachments.length > 0;
    sendBtn.disabled = !hasContent && !store.state.streaming;
  }
}

function updateAttachmentLabel() {
  const container = $('#attachment-preview-container');
  if (!container) return;

  if (currentAttachments.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = currentAttachments.map((att, index) => {
    const isImg = att.isImage || (att.type && att.type.startsWith('image/')) || (att.mimeType && att.mimeType.startsWith('image/'));
    const imgSrc = isImg && att.content ? att.content : '';

    return `
      <div class="attachment-thumb-chip">
        ${imgSrc ? `<img src="${escapeHtml(imgSrc)}" alt="attachment">` : getFileIconSvg(att.name)}
        <span class="file-chip-name" style="max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(att.name || 'File')}</span>
        <button data-action="remove-single-attachment" data-index="${index}" style="background:none; border:none; color:var(--muted); cursor:pointer; font-weight:bold; padding:2px 4px;">✕</button>
      </div>
    `;
  }).join('');

  // Add click handler to remove individual attachments
  container.querySelectorAll('[data-action="remove-single-attachment"]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = Number(btn.dataset.index);
      currentAttachments.splice(idx, 1);
      updateAttachmentLabel();
      updateCount();
    };
  });
}

function isApiKeyProtected(target) {
  const t = String(target || '').toLowerCase();
  return t.includes('api-key') || t.includes('apikey') || t.includes('key-setting');
}

async function waitForElement(selector, timeoutMs = 3000) {
  const start = Date.now();

  if (!selector) return null;
  let cleanSelector = typeof selector === 'string' ? selector.trim().replace(/^#+/, '#') : '';

  // Comprehensive mapping of AI selector variations to actual DOM elements
  const selectorAliases = {
    // Writing Studio / Editor
    '#writing-editor': '#writing-input',
    'writing-editor': '#writing-input',
    '#editor': '#writing-input',
    'editor': '#writing-input',

    // Composer & Attachments
    'composer': '#prompt',
    'prompt': '#prompt',
    '.attach-file-button': '[data-action="attach"]',
    'attach-file-button': '[data-action="attach"]',
    '#attach-file-button': '[data-action="attach"]',
    'attach-button': '[data-action="attach"]',
    'attach': '[data-action="attach"]',

    // Camera & Photo Snap Buttons
    '.camera-button': '[data-action="camera"]',
    'camera-button': '[data-action="camera"]',
    '#camera-button': '[data-action="camera"]',
    '#snap-photo-button': '#capture-btn',
    'snap-photo-button': '#capture-btn',
    '#snap-photo': '#capture-btn',
    'snap-photo': '#capture-btn',
    '#take-photo': '#capture-btn',
    'take-photo': '#capture-btn',
    '#capture-photo-button': '#capture-btn',
    'capture-photo-button': '#capture-btn',
    '#capture-btn': '#capture-btn',
    'capture-btn': '#capture-btn',
    '#send-camera-btn': '#send-camera-btn',
    'send-camera-btn': '#send-camera-btn',
    '#retake-btn': '#retake-btn',
    'retake-btn': '#retake-btn',
    'camera': '[data-action="camera"]',

    // Send Buttons
    'send': '#send-button',
    'send-button': '#send-button',
    '#send': '#send-button',

    // Navigation / Route Views
    'chat': '[data-route="chat"]',
    'writing': '[data-route="writing"]',
    'files': '[data-route="files"]',
    'projects': '[data-route="projects"]',
    'voice': '[data-route="voice"]',
    'settings': '[data-route="settings"]'
  };
  cleanSelector = selectorAliases[cleanSelector] || cleanSelector;

  while (Date.now() - start < timeoutMs) {
    let el = null;

    // 1. Direct CSS Selector
    if (cleanSelector) {
      try {
        el = document.querySelector(cleanSelector);
      } catch (e) {}
    }

    // 2. Data Action, ID, or Class Match
    if (!el && cleanSelector) {
      const targetAttr = cleanSelector.replace(/^[#\.]/, '');
      el = document.querySelector(`[data-action="${targetAttr}"]`) ||
           document.querySelector(`[data-route="${targetAttr}"]`) ||
           document.getElementById(targetAttr) ||
           document.querySelector(`.${targetAttr}`);
    }

    // 3. Semantic Text/Aria Search
    if (!el && cleanSelector) {
      const targetText = cleanSelector.replace(/^#/, '').toLowerCase();
      const candidates = [...document.querySelectorAll('button, a, input, select, textarea, [role="button"], .chat-item')];

      el = candidates.find(candidate => {
        const text = (candidate.textContent || candidate.value || '').trim().toLowerCase();
        const aria = (candidate.getAttribute('aria-label') || '').toLowerCase();
        const placeholder = (candidate.getAttribute('placeholder') || '').toLowerCase();
        return text.includes(targetText) || aria.includes(targetText) || placeholder.includes(targetText);
      });
    }

    // Check if element is visible and stable in layout
    if (el) {
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
      if (isVisible) return el;
    }

    await new Promise(r => requestAnimationFrame(r));
  }

  return null;
}

// Universal UI Agent Engine
async function executeUiSequence(actions) {
  if (!Array.isArray(actions)) return;

  for (const step of actions) {
    try {
      const type = (step.action || '').toLowerCase();
      const targetStr = step.selector || step.target || step.view || '';

      if (isApiKeyProtected(targetStr)) {
        toast(`${LOGO_HTML} API Key modification is restricted for security.`, 'error');
        continue;
      }

      if (type === 'navigate' || type === 'route') {
        const view = step.view || step.target;
        route(view);
        toast(`${LOGO_HTML} Navigated to ${view}`);
        await sleep(400);
      }
      else if (type === 'set_name' || (type === 'type' && (targetStr === '#name-setting' || targetStr === 'name'))) {
        const newName = step.value || step.text || '';
        if (newName) {
          savePreferences({ userName: newName });
          const nameInput = $('#name-setting');
          if (nameInput) nameInput.value = newName;
          toast(`${LOGO_HTML} Workspace name updated to "${newName}"`);
        }
        await sleep(300);
      }
      else if (type === 'set_theme') {
        savePreferences({ theme: step.value });
        toast(`${LOGO_HTML} Theme updated to ${step.value}`);
        await sleep(300);
      }
      else if (type === 'click') {
        let el = await waitForElement(step.selector || step.target || step.text);

        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          el.focus?.();
          el.click();
          toast(`${LOGO_HTML} Clicked ${step.text ? `"${step.text}"` : (step.selector || step.target)}`);
        } else if (step.target || step.selector) {
          const actionKey = (step.target || step.selector || '').toLowerCase().replace(/^[#\.]/, '');
          if (actionKey.includes('snap') || actionKey.includes('capture') || actionKey.includes('photo')) {
            await executeUiSequence([{ action: 'snap_photo', countdown: 2 }]);
          } else if (actionKey.includes('camera')) {
            await openCamera();
          } else if (actionKey.includes('attach')) {
            $('#file-input')?.click();
          } else {
            console.warn(`[UI Agent] Selector not found: ${step.selector || step.target}`);
          }
        }
        await sleep(350);
      }
      else if (type === 'type' || type === 'type_text' || type === 'fill') {
        const selector = step.selector || step.target;
        const el = await waitForElement(selector);

        if (el) {
          el.focus();
          if (step.clear !== false) el.value = '';

          const text = step.value || step.text || '';
          for (let i = 0; i < text.length; i++) {
            el.value += text[i];
            el.dispatchEvent(new Event('input', { bubbles: true }));
            if (selector === '#writing-input') writingMetrics();
            await sleep(step.speed || 15);
          }
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          toast(`Input field not found: ${selector}`, 'error');
        }
        await sleep(250);
      }
      else if (type === 'select' || type === 'set_mode') {
        const el = await waitForElement(step.selector || '#writing-mode');
        if (el) {
          el.value = step.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          toast(`${LOGO_HTML} Selected ${step.value}`);
        }
        await sleep(200);
      }
      else if (type === 'key' || type === 'press_key') {
        const el = (await waitForElement(step.selector)) || document.activeElement || document.body;
        const eventInit = { key: step.key, code: step.key, bubbles: true, cancelable: true };
        el.dispatchEvent(new KeyboardEvent('keydown', eventInit));
        el.dispatchEvent(new KeyboardEvent('keypress', eventInit));
        el.dispatchEvent(new KeyboardEvent('keyup', eventInit));
        toast(`${LOGO_HTML} Pressed [${step.key}]`);
        await sleep(200);
      }
      else if (type === 'call' || type === 'exec') {
        if (step.fn && typeof window[step.fn] === 'function') {
          window[step.fn](...(step.args || []));
        } else if (step.name) {
          handleAction(step.name);
        }
        await sleep(300);
      }
      else if (type === 'wait' || type === 'sleep') {
        await sleep(step.ms || 500);
      }
      else if (type === 'send_chat') {
        const messageText = step.value || step.text || '';
        if (messageText) {
          route('chat');
          await sleep(300);
          toast(`${LOGO_HTML} Sending autonomous chat...`);
          send(messageText);
        }
        await sleep(500);
      }
      else if (type === 'new_chat') {
        store.addChat();
        renderChats();
        renderMessages();
        toast(`${LOGO_HTML} Started new conversation`);
        await sleep(300);
        
        if (step.value || step.text) {
          send(step.value || step.text);
        }
      }
      else if (type === 'summarize_to_live' || type === 'send_to_live') {
        toast(`${LOGO_HTML} Transferring chat context to Berto Live...`);
        await summarizeAndSendToLive();
        await sleep(500);
      }
      else if (type === 'showcase_features' || type === 'demo' || type === 'show_off') {
        await runFeatureShowcase();
      }
      else if (type === 'use_writing_studio' || type === 'writing_studio' || type === 'draft_in_studio') {
        const format = step.format || step.mode || 'Essay';
        const promptText = step.prompt || step.value || step.text || '';

        // 1. Route to Writing Studio
        route('writing');
        await sleep(350);

        // 2. Select requested format (Essay, Email, Blog, Report, etc.)
        const modeSelect = $('#writing-mode');
        if (modeSelect && format) {
          const options = Array.from(modeSelect.options);
          const match = options.find(o => o.value.toLowerCase().includes(format.toLowerCase()));
          if (match) modeSelect.value = match.value;
          modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        await sleep(200);

        // 3. Type prompt/topic into the editor
        if (promptText) {
          const input = $('#writing-input');
          if (input) {
            input.focus();
            input.value = '';
            for (let i = 0; i < promptText.length; i++) {
              input.value += promptText[i];
              input.dispatchEvent(new Event('input', { bubbles: true }));
              if (typeof writingMetrics === 'function') writingMetrics();
              await sleep(8);
            }
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        await sleep(300);

        // 4. Trigger generation
        if (step.generate !== false) {
          generateWriting();
        }
        toast(`${LOGO_HTML} Writing Studio active — drafting ${format}...`);
      }
      else if (type === 'add_task' || type === 'create_task') {
        const title = step.title || step.value || 'New Task';
        const desc = step.desc || step.text || '';
        const status = step.status || 'todo';
        
        const tasks = getKanbanTasks();
        tasks.push({ id: `task_${Date.now()}`, title, desc, status });
        saveKanbanTasks(tasks);
        toast(`${LOGO_HTML} Added task "${title}" to ${status}`);
      }
      else if (type === 'rename_chat') {
        const targetId = step.id || store.state.activeChatId;
        const newTitle = step.title || step.value;
        if (newTitle) {
          store.renameChat(targetId, newTitle);
          renderChats();
          toast(`Renamed chat to "${newTitle}"`, 'success');
        }
      }
      else if (type === 'snap_photo' || type === 'take_photo' || type === 'capture_photo') {
        // Step 1: Switch to Chat view
        route('chat');
        await sleep(300);

        // Step 2: Open Camera modal
        toast(`${LOGO_HTML} Opening camera...`, 'info');
        await openCamera();
        await sleep(300);

        // Step 3: Countdown toast
        const countdown = step.countdown || 2;
        toast(`${LOGO_HTML} Get ready! Snapping photo in ${countdown}s...`, 'info');
        await sleep(countdown * 1000);

        // Step 4: Automatically snap photo
        capturePhoto();
        await sleep(400);

        // Step 5: Attach captured photo to chat composer & close modal
        await sendCameraPhoto();
        await sleep(300);

        // Step 6: Pre-fill prompt text if user spoke a question
        const promptInput = $('#prompt');
        const photoPrompt = step.prompt || step.value || step.text || '';
        
        if (promptInput) {
          if (photoPrompt) {
            promptInput.value = photoPrompt;
          }
          updateCount();
          resizePrompt();
          promptInput.focus();
          pulseHighlight('#composer', 1500);
        }

        // Step 7: Toast notification — STAYS READY (NO AUTO-SEND)
        toast(`${LOGO_HTML} Photo attached to prompt! Ready to send.`, 'success');
      }
      else if (type === 'open_camera') {
        // Switch to chat and open camera for manual user interaction
        route('chat');
        await sleep(300);
        toast(`${LOGO_HTML} Opening camera...`, 'info');
        await openCamera();
        toast(`${LOGO_HTML} Camera open. Tap Capture when ready.`, 'info');
      }
      else if (type === 'patch_artifact' || type === 'patch_artifact_element') {
        // Incremental Artifact Patching — targeted DOM updates without full re-render
        const frame = $('#artifact-frame');
        if (frame && frame.contentDocument) {
          const doc = frame.contentDocument;
          const targetEl = step.selector ? doc.querySelector(step.selector) : null;
          
          if (targetEl && step.html !== undefined) {
            targetEl.innerHTML = step.html;
            toast(`${LOGO_HTML} Updated artifact element (${step.selector})`);
          } else if (step.appendHtml) {
            doc.body.insertAdjacentHTML('beforeend', step.appendHtml);
            toast(`${LOGO_HTML} Appended content to artifact`);
          } else if (step.text !== undefined && targetEl) {
            targetEl.textContent = step.text;
            toast(`${LOGO_HTML} Updated artifact text (${step.selector})`);
          } else {
            toast(`Artifact frame not available for patching`, 'warn');
          }
        } else {
          toast(`Artifact frame not available for patching`, 'warn');
        }
        await sleep(300);
      }
      else if (type === 'clear_all_chats' || type === 'delete_chat' || type === 'delete_current_chat' || type === 'clear_data') {
        // Human-in-the-Loop Safe Approval Card
        const approved = await requestApproval({
          title: type === 'clear_all_chats' ? 'Clear All Chats' : type === 'clear_data' ? 'Clear All Workspace Data' : 'Delete Chat',
          description: type === 'clear_all_chats' 
            ? 'This will permanently delete ALL chat history. This action cannot be undone.'
            : type === 'clear_data'
              ? 'This will permanently delete ALL local workspace data including chats, files, projects, and settings.'
              : `This will permanently delete the chat "${store.state.chats.find(c => c.id === (step.id || step.chatId || store.state.activeChatId))?.title || 'current chat'}".`,
          actionType: type
        });

        if (approved) {
          if (type === 'clear_all_chats') {
            store.update({ chats: [store.newChatRecord('Untitled conversation')] });
            store.selectChat(store.state.chats[0].id);
            renderChats();
            renderMessages();
            toast('All chat history cleared', 'warn');
          } else if (type === 'clear_data') {
            Object.values(CONFIG.storage).forEach(key => localStorage.removeItem(key));
            localStorage.removeItem(`${INSTANCE_PREFIX}-writing-draft`);
            localStorage.removeItem(`${INSTANCE_PREFIX}-model-usage`);
            localStorage.removeItem(`${INSTANCE_PREFIX}-setup-complete`);
            location.reload();
          } else {
            const targetId = step.id || step.chatId || store.state.activeChatId;
            const chatToDelete = store.state.chats.find(c => c.id === targetId);
            if (chatToDelete) {
              const title = chatToDelete.title;
              store.deleteChat(targetId);
              renderChats();
              renderMessages();
              toast(`Deleted chat: "${title}"`, 'info');
            }
          }
        } else {
          toast('Action cancelled by user', 'info');
        }
      }

    } catch (e) {
      console.error('[Berto UI Agent Error]', e, step);
      // Self-Correction Feedback Loop: report the error back into the conversation
      reportUiError(e, step);
    }
  }
}

// =========================================================
// HUMAN-IN-THE-LOOP SAFE APPROVAL CARDS
// =========================================================
function requestApproval({ title, description, actionType }) {
  return new Promise((resolve) => {
    const cardId = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const cardHtml = `
      <div class="approval-card pending" id="${cardId}">
        <div class="approval-card-header">
          <span class="approval-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 9v4"/><path d="M12 17h.01"/>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
          </span>
          <span class="approval-card-title">${escapeHtml(title)}</span>
        </div>
        <div class="approval-card-desc">${escapeHtml(description)}</div>
        <div class="approval-card-actions">
          <button class="approval-btn reject" data-approval-reject="${cardId}">Reject</button>
          <button class="approval-btn approve" data-approval-approve="${cardId}">Approve</button>
        </div>
      </div>
    `;

    // Append approval card to chat stream
    const messagesBox = $('#messages');
    if (messagesBox) {
      messagesBox.insertAdjacentHTML('beforeend', cardHtml);
      if (store.state.autoScroll && $('.chat-scroll')) $('.chat-scroll').scrollTop = $('.chat-scroll').scrollHeight;
    }

    // Wire up approve/reject buttons
    const approveBtn = document.querySelector(`[data-approval-approve="${cardId}"]`);
    const rejectBtn = document.querySelector(`[data-approval-reject="${cardId}"]`);
    const card = document.getElementById(cardId);

    const handleDecision = (approved) => {
      if (card) {
        card.classList.remove('pending');
        card.classList.add(approved ? 'approved' : 'rejected');
        card.querySelector('.approval-card-actions')?.remove();
        if (approved) {
          card.querySelector('.approval-card-desc')?.insertAdjacentHTML('afterend', `<div style="color:#82f3d0; font-size:11px; font-weight:600; margin-top:6px;">✓ Approved</div>`);
        } else {
          card.querySelector('.approval-card-desc')?.insertAdjacentHTML('afterend', `<div style="color:#ed9b9b; font-size:11px; font-weight:600; margin-top:6px;">✕ Rejected</div>`);
        }
      }
      resolve(approved);
    };

    approveBtn?.addEventListener('click', () => handleDecision(true));
    rejectBtn?.addEventListener('click', () => handleDecision(false));

    // Auto-reject after 30 seconds
    setTimeout(() => {
      if (card && card.classList.contains('pending')) {
        handleDecision(false);
      }
    }, 30000);
  });
}

// =========================================================
// SELF-CORRECTION FEEDBACK LOOP
// =========================================================
function reportUiError(error, step) {
  const errorMsg = error?.message || 'Unknown UI action error';
  const selector = step?.selector || step?.target || step?.view || 'unknown';
  const actionType = step?.action || 'unknown';

  // Build a suggested fix based on the error type
  let suggestedFix = '';
  if (errorMsg.includes('not found') || errorMsg.includes('null') || errorMsg.includes('undefined')) {
    suggestedFix = `Navigate to the correct view first, then retry the "${actionType}" action on "${selector}".`;
  } else if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
    suggestedFix = `Request user permission before attempting "${actionType}".`;
  } else {
    suggestedFix = `Review the "${actionType}" action parameters and retry.`;
  }

  // Render error report card in chat stream
  const messagesBox = $('#messages');
  if (messagesBox) {
    const reportHtml = `
      <div class="error-report-card">
        <div class="error-report-card-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          UI Action Failed — Auto-correction suggested
        </div>
        <div class="error-report-card-body">
          <strong>Error:</strong> ${escapeHtml(errorMsg)}<br>
          <strong>Action:</strong> ${escapeHtml(actionType)} on "${escapeHtml(selector)}"
        </div>
        <div class="error-report-card-fix">
          <strong>Suggested Fix:</strong> ${escapeHtml(suggestedFix)}
        </div>
      </div>
    `;
    messagesBox.insertAdjacentHTML('beforeend', reportHtml);
    if (store.state.autoScroll && $('.chat-scroll')) $('.chat-scroll').scrollTop = $('.chat-scroll').scrollHeight;
  }

  console.warn('[Berto UI Agent] Self-correction report:', { error: errorMsg, suggestedFix, step });
}

async function send(text) {
  if (text === undefined) {
    const promptEl = $('#prompt');
    text = promptEl ? promptEl.value.trim() : '';
  }

  // --- FOOLPROOF DEMO / TOUR TRIGGER ---
  const lowerPrompt = text.toLowerCase().trim();
  if (/\b(show me a demo|demo|give me a tour|tour|showcase|show off|demonstrate|walk me through|custom keynote)\b/i.test(lowerPrompt) || /\b(showcase|demo) (how|the|how to)\b/i.test(lowerPrompt)) {
    const promptInput = $('#prompt');
    if (promptInput) promptInput.value = '';
    updateCount();
    resizePrompt();
    showWelcome(false);

    // Render user message and launch showcase immediately
    appendMessage({ role: 'user', content: text });

    // Extract the custom workflow request (e.g. "showcase how to build a React dashboard")
    let customRequest = '';
    const howMatch = text.match(/(?:show(?:case)?|demonstrate|walk me through|demo)[:\s]+(?:how to |the |a |an )?(.+)/i);
    if (howMatch && howMatch[1]) {
      customRequest = howMatch[1].trim();
    }
    
    runFeatureShowcase(customRequest);
    return;
  }

  if (store.state.streaming) {
    api.stop();
    setGenerating(false);
    return;
  }

  const personaEl = $('#persona-select');
  const personaVal = personaEl ? personaEl.value : 'default';
  const { name: userName, initial: userInitial } = getUserInfo();

  const baseSystemInstruction = `CURRENT USER
━━━━━━━━━━

Name: ${userName}
Initial: ${userInitial}

You are currently speaking with this user. If the user asks what their name is, always check their profile name (${userName}) and respond naturally.

You are Berto, an advanced, adaptive AI assistant created by Remberto.

You are a next-generation AI assistant designed to help people get things done faster, think better, and have a reliable digital companion they can depend on.

━━━━━━━━━━
IDENTITY & ORIGIN
━━━━━━━━━━

You were created by Remberto as part of his journey building technology.
The name "Berto" was inspired by Remberto's own name. The "Berto" in RemBERTO represents the connection between the creator and the AI.

━━━━━━━━━━
CORE PERSONALITY
━━━━━━━━━━

Your personality should be Professional, Friendly, Confident, Expressive, Intelligent, and Helpful. Speak naturally and conversationally.`;

  const personaOverrides = {
    default: '',
    engineer: `\n\nYou are currently acting as a Senior Software Architect. Provide robust, clean, type-safe, and highly scalable code solutions with minimal fluff.`,
    editor: `\n\nYou are currently acting as a Strict Copy Editor. Analyze text ruthlessly for clarity, tone, flow, and grammatical precision. Avoid AI cliches.`,
    tutor: `\n\nYou are currently acting as a Socratic Learning Tutor. Guide the user by asking insightful questions that help them discover solutions independently.`,
    designer: `\n\nYou are currently acting as a Principal UI/UX Architect. Focus on modern design systems, glassmorphic aesthetics, micro-interactions, and visual hierarchy.`
  };

  const personaSystemInstruction = baseSystemInstruction + (personaOverrides[personaVal] || personaOverrides.default);

  if (capturedPhotoBlob) {
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(capturedPhotoBlob);
      });
      currentAttachments.push({
        name: `captured_photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
        mimeType: 'image/jpeg',
        size: `${Math.max(1, Math.ceil(capturedPhotoBlob.size / 1024))} KB`,
        bytes: capturedPhotoBlob.size,
        content: dataUrl,
        isImage: true,
        file: new File([capturedPhotoBlob], `captured_photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      });
    } catch (e) {
      console.error('Error processing captured photo:', e);
      toast('Failed to process captured photo', 'error');
    }
    capturedPhotoBlob = null;
    closeCameraModal();
    updateAttachmentLabel();
    updateCount();
  }

  const imageAttachments = currentAttachments.filter(a => 
    a.isImage || 
    (a.mimeType && a.mimeType.startsWith('image/')) || 
    (a.type && a.type.startsWith('image/')) ||
    (a instanceof File && a.type.startsWith('image/'))
  );
  const textAttachments = currentAttachments.filter(a => !imageAttachments.includes(a));
  const totalImagesSize = imageAttachments.reduce((sum, a) => sum + (a.bytes || a.size || 0), 0);

  let fullPrompt = text;
  if (textAttachments.length > 0) {
    // Apply Mini-RAG: chunk large file content and only include relevant chunks
    const processedAttachments = textAttachments.map(a => {
      const content = a.content || '';
      // Only chunk if content is large (>1000 words)
      if (content && wordCount(content) > 1000 && text) {
        const relevantContent = miniRag.getRelevantChunks(content, text, 3);
        return `[Attached File: ${a.name}]\n${relevantContent}`;
      }
      return `[Attached File: ${a.name}]\n${content}`;
    });
    const attachTexts = processedAttachments.join('\n\n');
    fullPrompt = text ? `${attachTexts}\n\n${text}` : attachTexts;
  }

  if (!fullPrompt.trim() && imageAttachments.length === 0) return;
  if (fullPrompt.length > CONFIG.maxMessageChars * 2 && currentAttachments.length === 0) {
    return toast(`Message content is too long. Limit is ${formatCount(CONFIG.maxMessageChars)} characters.`, 'error');
  }
  if (fullPrompt.length > 50000) {
    return toast(`Context is too large to process. Please reduce file size or text length.`, 'error');
  }
  if (totalImagesSize > CONFIG.maxContextBytes) {
    return toast(`Image context is too large. Please reduce image sizes.`, 'error');
  }

  const preparedImages = [];
  for (const att of imageAttachments) {
    try {
      let dataUrl = att.content;
      if ((!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) && (att.file || att instanceof File)) {
        dataUrl = await fileToBase64(att.file || att);
      }
      if (dataUrl && typeof dataUrl === 'string') {
        const mime = att.mimeType || att.type || (att instanceof File ? att.type : 'image/jpeg');
        preparedImages.push({
          name: att.name || 'image.png',
          data: dataUrl,
          mimeType: mime.startsWith('image/') ? mime : 'image/jpeg'
        });
      }
    } catch (e) {
      console.error('Error preparing image attachment:', e);
      toast(`Failed to read image "${att.name || 'attachment'}"`, 'error');
    }
  }

  const preparedFiles = textAttachments.map(a => ({
    name: a.name || 'file',
    size: a.size || (a.bytes ? `${Math.max(1, Math.ceil(a.bytes / 1024))} KB` : 'File'),
    type: a.type || a.name?.split('.').pop()?.toUpperCase() || 'FILE'
  }));

  const promptInput = $('#prompt');
  if (promptInput) promptInput.value = '';
  
  const attachmentsToSend = [...currentAttachments];
  currentAttachments = [];
  updateAttachmentLabel();
  resizePrompt();

  showWelcome(false);

  if (store.messages.length === 0) {
    store.autoTitleChat(store.state.activeChatId, text || attachmentsToSend[0]?.name || 'Chat');
    renderChats();
  }

  appendMessage({ 
    role: 'user', 
    content: text,
    fullPrompt: fullPrompt,
    images: preparedImages,
    files: preparedFiles
  });

  const assistant = store.addMessage({ role: 'assistant', content: '', status: 'streaming' });
  renderMessages();

  const node = $(`[data-message="${assistant.id}"] .message-body`);
  if (node) node.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';

  setGenerating(true);

  const historyMessages = store.messages.slice(0, -2)
    .filter(m => (m.content && m.content.trim()) || m.fullPrompt)
    .map(m => ({ role: m.role, content: m.fullPrompt || m.content }));

  // Add live perception context to system prompts
  const perceptionContext = `
━━━━━━━━━━━━━━━━━━
REAL-TIME WORKSPACE PERCEPTION CONTEXT
━━━━━━━━━━━━━━━━━━
${getUiStateContext()}
`;

  const streamer = new SmoothStreamer(node);

  activeRequest = api.request({
    prompt: fullPrompt,
    system: `${personaSystemInstruction}
${perceptionContext}
${BERTO_CODE_POLICY}

You have direct programmatic control over this web application interface.

SECURITY RULE: You are STRICTLY FORBIDDEN from accessing, modifying, or reading the user's API Key (#api-key-setting). Do not touch the API key under any circumstance.

UI AUTOMATION vs CHAT RULE:
- ONLY output JSON automation blocks if the user EXPLICITLY asks to navigate, change app settings, open tools, or control the UI (e.g., "go to writing", "switch theme", "change my name", "open camera").
- If the user asks to write, draft, compose, format, summarize, rewrite, or organize text, respond DIRECTLY IN CHAT using Markdown. Do NOT output a JSON automation block unless explicitly requested to use Writing Studio.

If the user asks you to perform an action or task in the UI, respond concisely AND append a JSON sequence block at the end:

\`\`\`json
[
  { "action": "set_name", "value": "Alex" },
  { "action": "navigate", "view": "writing" }
]
\`\`\`

CAMERA & SNAPSHOT RULES:
- If user says "open camera", respond: "Opening camera for you." AND call \`execute_ui_action\` with [{ "action": "open_camera" }].
- If user says "snap a photo" or "take a picture", respond: "I've attached the photo to your chat bar! Hit send when ready." AND call \`execute_ui_action\` with [{ "action": "snap_photo", "countdown": 2, "prompt": "<user question if spoken>" }].

AVAILABLE UI ACTIONS:
- "type": { "action": "type", "selector": "#writing-input"|"#prompt"|"#search-input", "value": "text" }
- "click": { "action": "click", "selector": "#send-button"|".chat-item"|"data-action" }
- "navigate": { "action": "navigate", "view": "chat"|"writing"|"files"|"projects"|"voice"|"settings" }
- "use_writing_studio": { "action": "use_writing_studio", "format": "Essay"|"Email"|"Blog"|"Report"|"Resume"|"Cover Letter", "prompt": "topic text" }
- "set_name": { "action": "set_name", "value": "New Name" }
- "set_theme": { "action": "set_theme", "value": "dark"|"light" }
- "snap_photo": { "action": "snap_photo", "countdown": 2, "prompt": "<user question or prompt if provided>", "autoCapture": true }`,
    history: historyMessages,
    preferred: store.state.model,
    temperature: store.state.temperature,
    topP: store.state.topP,
    stream: true,
    images: preparedImages,
    onText: output => {
      streamer.updateTarget(output);
    }
  }).then(async result => {
    await streamer.finish();
    
    updateMessageView(assistant.id, result.text, { model: result.model, tokens: result.tokens, status: 'complete' });

    const htmlCodeMatch = result.text.match(/```html[\r\n\s]([\s\S]*?)```/i);
    if (htmlCodeMatch && htmlCodeMatch[1]) {
      openArtifact(htmlCodeMatch[1].trim(), 'Generated Component');
    }

    const jsonMatch = result.text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const actions = JSON.parse(jsonMatch[1]);
        if (Array.isArray(actions)) {
          executeUiSequence(actions);
        }
      } catch (e) {
        console.error('UI Action parse error:', e);
      }
    }
  }).catch(error => {
    const message = error instanceof ApiError ? error.message : error.name === 'AbortError' ? 'Generation stopped.' : 'Berto could not complete that request.';
    updateMessageView(assistant.id, `**${error.name === 'AbortError' ? 'Generation stopped' : 'Request unavailable'}**\n\n${message}`);
  }).finally(() => {
    setGenerating(false);
    activeRequest = null;
  });
}

function resizePrompt() {
  const input = $('#prompt');
  if (!input) return;
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
}

function openSearch() {
  openModal('Search chats', `<input class="search-input" id="search-input" placeholder="Search conversations..." autofocus><div class="search-results" id="search-results"></div>`);
  renderSearchResults('');
  $('#search-input')?.addEventListener('input', event => renderSearchResults(event.target.value));
  setTimeout(() => $('#search-input')?.focus(), 100);
}

function renderSearchResults(query) {
  const results = store.state.chats.filter(chat => !query || `${chat.title} ${chat.messages.map(message => message.content).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const container = $('#search-results');
  if (!container) return;
  container.innerHTML = results.map(chat => `
    <button data-search-chat="${chat.id}">
      <strong>${escapeHtml(chat.title)}</strong>
      <small>${chat.messages.length} messages · ${new Date(chat.updatedAt).toLocaleDateString()}</small>
    </button>
  `).join('') || '<p class="empty-copy">No matching conversations.</p>';
}

function openModel() {
  const visibleModels = api.modelList(store.state.model);
  const usage = visibleModels.map(model => `${model.label}: ${Math.max(0, api.remaining(model))} requests remaining`).join('<br>');
  
  openModal('AI Studio Models', `
    <p class="modal-copy">Select your intelligence engine. Use <strong>Pro</strong> for complex coding architecture, and <strong>Flash</strong> for fast iterations.</p>
    <div class="choice-list">
      ${visibleModels.map(model => `
        <button class="choice-row ${store.state.model === model.id ? 'selected' : ''}" data-model-choice="${model.id}">
          <div style="display:flex; flex-direction:column; align-items:flex-start;">
            <strong style="color:var(--text); font-size:14px;">${model.label}</strong>
            <small style="color:var(--muted); font-size:11px; margin-top:4px;">${model.desc}</small>
          </div>
          <span class="choice-check">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        </button>
      `).join('')}
    </div>
    <div class="quota-copy" style="margin-top:20px; font-family:monospace; color:var(--accent);">${usage}</div>
  `);
}

function openProfile() {
  const { name, initial } = getUserInfo();
  openModal('Profile', `
    <div class="profile-modal">
      <div class="large-avatar">${initial}</div>
      <h4>${escapeHtml(name)}</h4>
      <p>Personal workspace</p>
      <div class="profile-modal-actions">
        <button class="button ghost" data-action="open-ai-settings">AI settings</button>
        <button class="button danger" data-action="close-modal">Close</button>
      </div>
    </div>
  `);
}

function openImportModal() {
  openModal('Import Workspace Backup', `
    <p class="modal-copy">Select or drop a <code>.json</code> backup file exported from Berto AI Workspace to restore your conversations, profile, files, and projects.</p>
    <div id="import-drop-zone" style="border: 2px dashed var(--border, #333); padding: 30px; text-align: center; border-radius: 8px; cursor: pointer; margin-top: 12px;">
      <p style="margin: 0;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Drop your <strong>.json</strong> file here or click to browse</p>
      <input type="file" id="import-file-input" accept=".json" hidden>
    </div>
  `);

  const dropZone = $('#import-drop-zone');
  const fileInput = $('#import-file-input');

  dropZone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      if (store.importData(text)) closeModal();
    }
  });
}

function openUpgrade() {
  openModal('Berto Workspace', `
    <div class="upgrade-modal">
      <div class="upgrade-badge">PUBLIC RELEASE</div>
      <h4>Bring your own Gemini Intelligence</h4>
      <p>Berto connects directly to your Gemini API key. Stored locally in your browser with zero server telemetry.</p>
      <button class="button primary" data-action="open-ai-settings">Open AI settings <span><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z"/></svg></span></button>
    </div>
  `);
}

function openRenameModal(chatId) {
  const chat = store.state.chats.find(c => c.id === chatId);
  if (!chat) return;
  openModal('Rename Conversation', `
    <label class="modal-label">Chat Title
      <input class="search-input" id="rename-chat-title" value="${escapeHtml(chat.title)}">
    </label>
    <div class="modal-actions">
      <button class="button ghost" data-action="close-modal">Cancel</button>
      <button class="button primary" id="save-rename-chat" data-chat-id="${chat.id}">Save</button>
    </div>
  `);
  setTimeout(() => $('#rename-chat-title')?.focus(), 100);
}

function openWritingProfile() {
  const profile = store.profile;
  openModal('Writing Profile & Style Cloning', `
    <p class="modal-copy">Paste real sample writing here (texts, emails, notes). Berto will strictly clone your sentence structure, rhythm, and word choices without inventing fake plans or details.</p>
    <label class="modal-label">Profile name
      <input class="search-input" id="profile-name" value="${escapeHtml(profile.name)}">
    </label>
    <div class="profile-fields">
      <label class="modal-label">Tone
        <select id="profile-tone">
          <option ${profile.tone === 'Warm and precise' ? 'selected' : ''}>Warm and precise</option>
          <option ${profile.tone === 'Direct and concise' ? 'selected' : ''}>Direct and concise</option>
          <option ${profile.tone === 'Playful and energetic' ? 'selected' : ''}>Playful and energetic</option>
          <option ${profile.tone === 'Thoughtful and analytical' ? 'selected' : ''}>Thoughtful and analytical</option>
        </select>
      </label>
      <label class="modal-label">Formality
        <select id="profile-formality">
          <option ${profile.formality === 'Casual' ? 'selected' : ''}>Casual</option>
          <option ${profile.formality === 'Balanced' ? 'selected' : ''}>Balanced</option>
          <option ${profile.formality === 'Formal' ? 'selected' : ''}>Formal</option>
        </select>
      </label>
      <label class="modal-label">Vocabulary
        <select id="profile-vocabulary">
          <option ${profile.vocabulary === 'Plain language' ? 'selected' : ''}>Plain language</option>
          <option ${profile.vocabulary === 'Technical & academic' ? 'selected' : ''}>Technical & academic</option>
          <option ${profile.vocabulary === 'Rich & expressive' ? 'selected' : ''}>Rich & expressive</option>
        </select>
      </label>
      <label class="modal-label">Style
        <select id="profile-style">
          <option ${profile.style === 'Conversational' ? 'selected' : ''}>Conversational</option>
          <option ${profile.style === 'Direct' ? 'selected' : ''}>Direct</option>
          <option ${profile.style === 'Storytelling' ? 'selected' : ''}>Storytelling</option>
        </select>
      </label>
    </div>
    <label class="modal-label">Writing samples
      <textarea class="profile-samples" id="profile-samples" placeholder="Paste real sample texts or messages here...">${escapeHtml(profile.samples.join('\n\n'))}</textarea>
    </label>
    <div class="modal-actions">
      <button class="button ghost" data-action="close-modal">Cancel</button>
      <button class="button primary" data-action="save-writing-profile">Save profile</button>
    </div>
  `);
}

function renderWritingProfile() {
  const profile = store.profile;
  if ($('#active-profile')) $('#active-profile').textContent = profile.name;
  if ($('#profile-card-name')) $('#profile-card-name').textContent = profile.name;
  if ($('#profile-card-summary')) $('#profile-card-summary').textContent = `${profile.tone}, ${profile.formality.toLowerCase()}.`;
  
  // Wrap tags in individual badge spans with spacing
  if ($('#profile-tags')) {
    const tags = [profile.formality, profile.style, profile.vocabulary].filter(Boolean);
    $('#profile-tags').innerHTML = tags.map(tag => `<span class="profile-tag-badge">${escapeHtml(tag)}</span>`).join(' ');
  }
}

function openArtifact(htmlCode, title = 'Live Preview') {
  const layout = $('#chat-layout');
  const resizer = $('#artifact-resizer');
  const drawer = $('#artifact-drawer');
  const frame = $('#artifact-frame');
  const label = $('#artifact-label');

  if (layout && drawer && frame) {
    layout.classList.add('has-artifact');
    if (resizer) resizer.hidden = false;
    drawer.hidden = false;
    
    if (label) label.textContent = title;

    const isFullDoc = htmlCode.trim().toLowerCase().startsWith('<!doctype') || htmlCode.trim().toLowerCase().startsWith('<html');

    // Guard script to keep all buttons working inside the iframe while preventing navigation to parent index.html
    const guardScript = `
    <script>
      (function() {
        document.addEventListener('click', function(e) {
          const a = e.target.closest('a');
          if (a) {
            const href = a.getAttribute('href');
            if (!href || href === '#' || href === '' || href === 'javascript:void(0)') {
              e.preventDefault();
            } else if (href.startsWith('#')) {
              e.preventDefault();
              try {
                const target = document.querySelector(href);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
              } catch (err) {}
            }
          }
        }, true);

        document.addEventListener('submit', function(e) {
          const action = e.target.getAttribute('action');
          if (!action || action === '#' || action === '') {
            e.preventDefault();
          }
        }, true);
      })();
    </script>`;

    let fullDoc = '';
    if (isFullDoc) {
      // Inject guard script right after <head>
      fullDoc = htmlCode.includes('<head>') 
        ? htmlCode.replace('<head>', '<head>' + guardScript)
        : guardScript + htmlCode;
    } else {
      fullDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  ${guardScript}
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; margin: 0; min-height: 100vh; box-sizing: border-box; }
  </style>
</head>
<body>
  ${htmlCode}
</body>
</html>`;
    }

    // Render using srcdoc for full native JS execution & button reactivity
    frame.srcdoc = fullDoc;

    // 1. Download Button
    const dlBtn = $('#artifact-download-btn');
    if (dlBtn) {
      dlBtn.onclick = () => downloadText('artifact.html', fullDoc, 'text/html');
    }

    // 2. Pop-Out to New Tab Button (uses Blob URL for new tab)
    const popoutBtn = $('#artifact-popout-btn');
    if (popoutBtn) {
      popoutBtn.onclick = () => {
        const popoutBlob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
        const popoutUrl = URL.createObjectURL(popoutBlob);
        window.open(popoutUrl, '_blank');
      };
    }
  }
}

function closeArtifact() {
  const layout = $('#chat-layout');
  const resizer = $('#artifact-resizer');
  const drawer = $('#artifact-drawer');
  const frame = $('#artifact-frame');
  
  if (layout) layout.classList.remove('has-artifact');
  if (resizer) resizer.hidden = true;
  if (drawer) drawer.hidden = true;
  if (frame) {
    frame.srcdoc = '';
  }
}

function getKanbanTasks() {
  return readStorage(`${INSTANCE_PREFIX}-kanban-tasks`, [
    { id: '1', title: 'System Architecture', desc: 'Design local-first Gemini state engine', status: 'done' },
    { id: '2', title: 'Voice Mode Integration', desc: 'Connect Gemini 3.1 Flash Live WebSockets', status: 'in-progress' },
    { id: '3', title: 'PWA Desktop App', desc: 'Add offline service worker and manifest', status: 'todo' }
  ]);
}

function saveKanbanTasks(tasks) {
  writeStorage(`${INSTANCE_PREFIX}-kanban-tasks`, JSON.stringify(tasks));
  renderKanbanBoard();
}

function renderKanbanBoard() {
  const tasks = getKanbanTasks();
  const statuses = ['todo', 'in-progress', 'done'];

  statuses.forEach(status => {
    const listEl = $(`#tasks-${status}`);
    const countEl = $(`#count-${status}`);
    const filtered = tasks.filter(t => t.status === status);

    if (countEl) countEl.textContent = filtered.length;

    if (listEl) {
      listEl.innerHTML = filtered.map(t => `
        <div class="kanban-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${t.id}')">
          <h4>${escapeHtml(t.title)}</h4>
          <p>${escapeHtml(t.desc)}</p>
        </div>
      `).join('') || '<p class="empty-copy">No tasks</p>';
    }
  });
}

function handleKanbanDrop(event, targetStatus) {
  event.preventDefault();
  const taskId = event.dataTransfer.getData('text/plain');
  const tasks = getKanbanTasks();
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.status = targetStatus;
    saveKanbanTasks(tasks);
    toast(`Task moved to ${targetStatus.replace('-', ' ')}`);
  }
}

let recognitionInstance = null;

function toggleWritingDictation() {
  const btn = $('#dictate-btn');
  const input = $('#writing-input');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return toast('Speech recognition is not supported in this browser.', 'error');
  }

  if (recognitionInstance) {
    recognitionInstance.stop();
    recognitionInstance = null;
    if (btn) btn.innerHTML = '<span><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M395-435q-35-35-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35q-50 0-85-35Zm85-205Zm-40 520v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Zm68.5-371.5Q520-503 520-520v-240q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v240q0 17 11.5 28.5T480-480q17 0 28.5-11.5Z"/></svg> Dictate</span>';
    toast('Dictation stopped');
    return;
  }

  recognitionInstance = new SpeechRecognition();
  recognitionInstance.continuous = true;
  recognitionInstance.interimResults = true;

  // NEW: Safely reset the dictation UI if the user goes silent and it turns itself off
  recognitionInstance.onend = () => {
    recognitionInstance = null;
    if (btn) btn.innerHTML = '<span><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M395-435q-35-35-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35q-50 0-85-35Zm85-205Zm-40 520v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Zm68.5-371.5Q520-503 520-520v-240q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v240q0 17 11.5 28.5T480-480q17 0 28.5-11.5Z"/></svg> Dictate</span>';
  };

  recognitionInstance.onresult = (event) => {
    let finalTranscript = '';
    // FIX: Only capture final sentences to stop the repeated interim duplication bug
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      }
    }
    if (finalTranscript && input) {
      input.value += (input.value ? ' ' : '') + finalTranscript;
      writingMetrics();
    }
  };

  recognitionInstance.start();
  if (btn) btn.innerHTML = `<span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Dictate</span>`;
  toast('Listening... Speak your notes out loud.');
}

function profilePrompt() {
  const p = store.profile;
  if (!p.samples || !p.samples.length) return '';

  return `
USER WRITING SAMPLES (Analyze capitalization, sentence brevity, slang, and vocabulary below):
${p.samples.map((s, i) => `--- SAMPLE ${i + 1} ---\n${s}`).join('\n\n')}
`;
}

async function generateWriting() {
  const inputEl = $('#writing-input');
  const draft = inputEl ? inputEl.value.trim() : '';
  if (!draft) return toast('Add an idea or draft first', 'error');
  const key = api.key();
  if (!key) return toast('Add your Gemini API key in Settings first', 'error');

  const output = $('#writing-output');
  if (!output) return;
  output.hidden = false;
  output.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';

  try {
    const profile = store.profile;
    const modeEl = $('#writing-mode');
    const mode = modeEl ? modeEl.value : 'Document';

    // 1. Define Format Structure Blueprints
    const formatInstructions = {
      'Essay': `Structure as a well-formed, multi-paragraph essay with a clear thesis, body arguments, and conclusion. Do not use conversational greetings (e.g. "Hi my name is..."). Focus objectively on the topic.`,
      'Professional Email': `Structure as a crisp email with a Subject Line, professional greeting, concise body paragraphs, and a sign-off.`,
      'Executive Summary': `Use bold headers, bullet points, and key takeaway metrics. Keep it high-level and structured.`,
      'Blog': `Use an engaging headline, catchy introduction, subheadings, and a conversational yet informative flow.`,
      'Cover Letter': `Structure as a formal job application letter with paragraph breaks highlighting relevant skills and enthusiasm.`
    };

    const selectedFormatRules = formatInstructions[mode] || `Draft a structured ${mode}.`;

    // 2. Build Context-Aware System Prompt
    const systemPrompt = `You are an elite ghostwriter executing a draft in the format of a **${mode}**.

━━━━━━━━━━━━━━━━━━
FORMAT STRUCTURE INSTRUCTIONS (${mode.toUpperCase()})
━━━━━━━━━━━━━━━━━━
${selectedFormatRules}

━━━━━━━━━━━━━━━━━━
VOICE & STYLE MATCHING (CLONE THIS STYLE)
━━━━━━━━━━━━━━━━━━
- Tone: ${profile.tone || 'Balanced'}
- Formality Level: ${profile.formality || 'Balanced'}
- Adopt the user's vocabulary choices, sentence length rhythm, and tone from the samples below.
- CRITICAL: Adapt the voice to suit a ${mode}. Do NOT insert casual personal introductions or chat greetings unless the format explicitly calls for it.

USER WRITING SAMPLES FOR STYLE CLONING:
${(profile.samples || []).map((s, i) => `--- SAMPLE ${i + 1} ---\n${s}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━
OUTPUT RULES
━━━━━━━━━━━━━━━━━━
1. Fulfill the user's prompt thoroughly using accurate facts and structured reasoning appropriate for a ${mode}.
2. Output ONLY the final written content. Do not include preamble, conversational fluff, or meta-commentary.`;

    const result = await api.request({
      prompt: draft,
      system: systemPrompt,
      preferred: store.state.model,
      temperature: 0.6, // Gives enough freedom to write complete essays
      topP: store.state.topP
    });

    output.innerHTML = renderMarkdown(result.text);
  } catch (error) {
    output.innerHTML = `
      <div class="error-state">
        <strong>Generation unavailable</strong>
        <p>${escapeHtml(error.message)}</p>
        <button class="button ghost" data-action="open-ai-settings">Open AI settings</button>
      </div>
    `;
  }
}

function writingMetrics() {
  const inputEl = $('#writing-input');
  const text = inputEl ? inputEl.value : '';
  const words = wordCount(text);
  const score = readability(text);
  if ($('#writing-metrics')) $('#writing-metrics').textContent = `${formatCount(words)} words · readability ${score}`;
}

function renderFiles() {
  const grid = $('#file-grid');
  if (!grid) return;
  grid.innerHTML = store.state.files.length ? store.state.files.map(file => `
    <div class="file-card">
      <div class="file-card-header">
        <span class="file-type">${escapeHtml(file.type)}</span>
        <button class="file-delete-btn" data-action="delete-file" data-file-name="${escapeHtml(file.name)}" title="Delete file">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <h4>${escapeHtml(file.name)}</h4>
      <p>${escapeHtml(file.size)} · Added locally</p>
      <button class="button ghost file-attach-chat-btn" data-action="attach-file-to-chat" data-file-name="${escapeHtml(file.name)}">
        <span>Attach to Chat</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </button>
    </div>
  `).join('') : `
    <div class="file-card">
      <span class="file-type">Library</span>
      <h4>No files uploaded yet</h4>
      <p>Upload files to give your conversations extra context.</p>
    </div>
  `;
}

function renderProjects() {
  const grid = $('#project-grid');
  if (!grid) return;
  const projects = store.state.projects.length ? store.state.projects : [
    { name: 'Personal workspace', desc: 'A home for everyday ideas and notes.' },
    { name: 'Product launch', desc: 'Keep strategy, research, and drafts together.' }
  ];
  grid.innerHTML = projects.map((project, index) => `
    <article class="project-card">
      <div class="project-top">
        <span>${index ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'}</span>
        <div class="project-actions">
          <button class="icon-button" data-action="edit-project-modal" data-project-index="${index}" title="Edit Project">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="icon-button danger" data-action="delete-project" data-project-index="${index}" title="Delete Project">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <h3>${escapeHtml(project.name)}</h3>
      <p>${escapeHtml(project.desc)}</p>
    </article>
  `).join('');
}

function openNewProjectModal(editIndex = null) {
  const project = editIndex !== null ? store.state.projects[editIndex] : { name: '', desc: '' };
  openModal(editIndex !== null ? 'Edit Project' : 'New Project', `
    <label class="modal-label">Project Name
      <input class="search-input" id="project-name-input" value="${escapeHtml(project?.name || '')}" placeholder="e.g. Website Redesign">
    </label>
    <label class="modal-label">Description
      <input class="search-input" id="project-desc-input" value="${escapeHtml(project?.desc || '')}" placeholder="Brief context...">
    </label>
    <div class="modal-actions">
      <button class="button ghost" data-action="close-modal">Cancel</button>
      <button class="button primary" id="save-project-btn" data-edit-index="${editIndex !== null ? editIndex : ''}">${editIndex !== null ? 'Save Changes' : 'Create Project'}</button>
    </div>
  `);
  setTimeout(() => $('#project-name-input')?.focus(), 100);
}

function renderSettings() {
  const key = $('#api-key-setting');
  if (key && document.activeElement !== key) key.value = localStorage.getItem(CONFIG.storage.apiKey) || '';

  const content = $('.settings-content');
  // Add the manual "Disable Voice Features" toggle in the AI preferences section
  const aiSection = $$('.settings-section')[1]; // AI preferences section
  if (aiSection && !$('#voice-restriction-setting-row')) {
    const voiceRow = document.createElement('div');
    voiceRow.className = 'setting-row';
    voiceRow.id = 'voice-restriction-setting-row';
    voiceRow.innerHTML = `
      <div>
        <strong>Disable Voice Features</strong>
        <span>Hide Live Voice, Read Aloud, and dictation for school/restricted accounts.</span>
      </div>
      <label class="switch">
        <input id="disable-voice-toggle" type="checkbox" ${store.state.voiceFeaturesDisabled ? 'checked' : ''}>
        <span></span>
      </label>
    `;
    aiSection.appendChild(voiceRow);

    $('#disable-voice-toggle')?.addEventListener('change', event => {
      setVoiceFeaturesDisabled(event.target.checked);
      toast(event.target.checked ? 'Voice features hidden' : 'Voice features enabled');
    });
  }

  if (content && !$('#generated-generation-settings')) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.id = 'generated-generation-settings';
    section.innerHTML = `
      <h3>Generation controls</h3>
      <p class="section-copy">Tune how Berto uses the selected model.</p>
      <div class="setting-row">
        <div><strong>Temperature <span id="temperature-value">${store.state.temperature.toFixed(2)}</span></strong><span>Higher values produce more creative output.</span></div>
        <input id="temperature-setting" type="range" min="0" max="2" step="0.05" value="${store.state.temperature}" aria-label="Temperature">
      </div>
      <div class="setting-row">
        <div><strong>Top-p <span id="top-p-value">${store.state.topP.toFixed(2)}</span></strong><span>Controls response vocabulary breadth.</span></div>
        <input id="top-p-setting" type="range" min="0" max="1" step="0.05" value="${store.state.topP}" aria-label="Top-p">
      </div>
      <div class="setting-row">
        <div><strong>Auto-scroll</strong><span>Follow new response content while streaming.</span></div>
        <label class="switch"><input id="auto-scroll-setting" type="checkbox" ${store.state.autoScroll ? 'checked' : ''}><span></span></label>
      </div>
    `;
    content.insertBefore(section, content.lastElementChild);

    $('#temperature-setting')?.addEventListener('input', event => {
      store.update({ temperature: Number(event.target.value) });
      if ($('#temperature-value')) $('#temperature-value').textContent = Number(event.target.value).toFixed(2);
    });
    $('#top-p-setting')?.addEventListener('input', event => {
      store.update({ topP: Number(event.target.value) });
      if ($('#top-p-value')) $('#top-p-value').textContent = Number(event.target.value).toFixed(2);
    });
    $('#auto-scroll-setting')?.addEventListener('change', event => store.update({ autoScroll: event.target.checked }));
    
    const nameInput = $('#name-setting');
    if (nameInput) {
      nameInput.value = readStorage(CONFIG.storage.preferences, {}).userName || 'User';
      nameInput.addEventListener('change', event => {
        savePreferences({ userName: event.target.value.trim() || 'User' });
        toast('Workspace name updated');
      });
    }
  }
}

function saveDraft() {
  const inputEl = $('#writing-input');
  const value = inputEl ? inputEl.value : '';
  writeStorage(`${INSTANCE_PREFIX}-writing-draft`, JSON.stringify(value));
  if ($('#writing-save-status')) $('#writing-save-status').textContent = 'Saved just now';
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard')).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    toast('Copied to clipboard');
  } catch (e) {
    toast('Failed to copy', 'error');
  }
  document.body.removeChild(textarea);
}

function handleAction(action, element) {
  if (action === 'toggle-mobile') {
    $('#sidebar')?.classList.add('open');
    $('.drawer-scrim')?.classList.add('open');
  } else if (action === 'close-mobile') {
    closeMobile();
  } else if (action === 'home') {
    route('chat');
  } else if (action === 'new-chat') {
    store.addChat();
    currentAttachments = [];
    updateAttachmentLabel();
    showWelcome(true);
    renderMessages();
    renderChats();
    $('#prompt')?.focus();
    toast('New chat started');
  } else if (action === 'send') {
    send();
  } else if (action === 'attach' || action === 'upload') {
    $('#file-input')?.click();
  } else if (action === 'clear-attachments') {
    currentAttachments = [];
    updateAttachmentLabel();
    updateCount();
  } else if (action === 'pin-chat') {
    const chatId = element?.dataset?.chatId;
    if (chatId) store.togglePinChat(chatId);
    renderChats();
  } else if (action === 'rename-chat-modal') {
    if (element?.dataset?.chatId) openRenameModal(element.dataset.chatId);
  } else if (action === 'delete-chat') {
    const chatId = element?.dataset?.chatId;
    if (chatId) {
      store.deleteChat(chatId);
      renderChats();
      renderMessages();
      toast('Chat deleted');
    }
  } else if (action === 'search') {
    openSearch();
  } else if (action === 'close-modal') {
    closeModal();
  } else if (action === 'model') {
    openModel();
  } else if (action === 'upgrade') {
    openUpgrade();
  } else if (action === 'profile') {
    openProfile();
  } else if (action === 'open-ai-settings') {
    closeModal();
    route('settings');
    setTimeout(() => $('#api-key-setting')?.focus(), 100);
  } else if (action === 'new-writing') {
    const wInput = $('#writing-input');
    const wOutput = $('#writing-output');
    if (wInput) wInput.value = '';
    if (wOutput) wOutput.hidden = true;
    writingMetrics();
    toast('Fresh draft ready');
  } else if (action === 'writing-clear') {
    const wInput = $('#writing-input');
    const wOutput = $('#writing-output');
    if (wInput) wInput.value = '';
    if (wOutput) wOutput.hidden = true;
    writingMetrics();
  } else if (action === 'writing-generate') {
    generateWriting();
  } else if (action === 'profile-settings' || action === 'edit-writing-profile') {
    openWritingProfile();
  } else if (action === 'save-writing-profile') {
    const profile = {
      name: $('#profile-name')?.value.trim() || 'My writing voice',
      tone: $('#profile-tone')?.value || 'Warm and precise',
      formality: $('#profile-formality')?.value || 'Balanced',
      vocabulary: $('#profile-vocabulary')?.value || 'Plain language',
      style: $('#profile-style')?.value || 'Conversational',
      samples: ($('#profile-samples')?.value || '').split(/\n\s*\n/).map(text => text.trim()).filter(Boolean).slice(0, 5)
    };
    store.saveProfile(profile);
    renderWritingProfile();
    closeModal();
    toast('Writing profile saved');
  } else if (action === 'new-project') {
    openNewProjectModal();
  } else if (action === 'edit-project-modal') {
    const index = Number(element?.dataset?.projectIndex);
    if (!isNaN(index)) openNewProjectModal(index);
  } else if (action === 'delete-project') {
    const index = Number(element?.dataset?.projectIndex);
    if (!isNaN(index)) {
      store.removeProject(index);
      renderProjects();
      toast('Project deleted');
    }
  } else if (action === 'delete-file') {
    const fileName = element?.dataset?.fileName;
    if (fileName) {
      store.removeFile(fileName);
      renderFiles();
      toast('File removed');
    }
  } else if (action === 'attach-file-to-chat') {
    const fileName = element?.dataset?.fileName;
    const fileRecord = store.state.files.find(f => f.name === fileName);
    if (fileRecord) {
      currentAttachments.push({ 
        name: fileRecord.name, 
        content: fileRecord.content || `[File Content: ${fileRecord.name}]`,
        isImage: fileRecord.isImage,
        type: fileRecord.type,
        mimeType: fileRecord.mimeType || fileRecord.type,
        bytes: fileRecord.bytes
      });
      updateAttachmentLabel();
      route('chat');
      toast(`Attached ${fileName} to prompt`);
    }
  } else if (action === 'export') {
    downloadText('berto-export.json', store.exportData(), 'application/json');
  } else if (action === 'import-data') {
    openImportModal();
  } else if (action === 'export-writing-md') {
    downloadText('berto-draft.md', `# ${$('#writing-mode')?.value || 'Draft'}\n\n${$('#writing-input')?.value || ''}`, 'text/markdown');
  } else if (action === 'export-writing-txt') {
    downloadText('berto-draft.txt', $('#writing-input')?.value || '');
  } else if (action === 'clear-data' && confirm('Delete all local workspace data?')) {
    Object.values(CONFIG.storage).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(`${INSTANCE_PREFIX}-writing-draft`);
    localStorage.removeItem(`${INSTANCE_PREFIX}-model-usage`);
    localStorage.removeItem(`${INSTANCE_PREFIX}-setup-complete`);
    location.reload();
  } else if (action === 'camera') {
    openCamera();
  } else if (action === 'close-camera-modal') {
    closeCameraModal();
  } else if (action === 'capture') {
    capturePhoto();
  } else if (action === 'retake') {
    retakePhoto();
  } else if (action === 'send-camera') {
    sendCameraPhoto();
  } else if (action === 'voice-toggle') {
    toggleVoice();
  } else if (action === 'voice-reset') {
    resetVoice();
  } else if (action === 'voice-camera') {
    toggleVoiceCamera();
  } else if (action === 'voice-screen') {
    toggleVoiceScreen();
  } else if (action === 'voice-expand-video') {
    toggleVoiceVideoExpand();
  } else if (action === 'voice-close-video') {
    closeVoiceVideoPreview();
  } else if (action === 'close-lightbox') {
    closeLightbox();
  } else if (action === 'close-html-runner') {
    const modal = $('#html-runner-modal');
    const frame = $('#html-runner-frame');
    if (modal) modal.hidden = true;
    if (frame) frame.srcdoc = '';
  } else if (action === 'summarize-to-live') {
    summarizeAndSendToLive();
  } else if (action === 'showcase' || action === 'showcase-features') {
    runFeatureShowcase();
  } else if (action === 'close-artifact') {
    closeArtifact();
  } else if (action === 'dictate-notes') {
    toggleWritingDictation();
  } else if (action === 'new-kanban-task') {
    const title = prompt('Task Title:');
    const desc = prompt('Description:');
    if (title) {
      const tasks = getKanbanTasks();
      tasks.push({ id: `task_${Date.now()}`, title, desc: desc || '', status: 'todo' });
      saveKanbanTasks(tasks);
      toast('New task created!');
    }
  } else if (action === 'fork-chat') {
    const messageId = element.dataset.messageId;
    const currentChat = store.activeChat;
    if (!currentChat) return;

    const msgIndex = currentChat.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // Clone messages up to selected message
    const forkedMessages = JSON.parse(JSON.stringify(currentChat.messages.slice(0, msgIndex + 1)));
    
    // Create new chat session with forked history
    const newChat = store.addChat(`${currentChat.title} (Branch)`);
    newChat.messages = forkedMessages;
    store.persist();

    renderChats();
    renderMessages();
    toast('Branched conversation into a new chat tab');
  }
  else if (action === 'open-msg-artifact') {
    const msgNode = element.closest('[data-message]');
    const msgId = msgNode?.dataset?.message;
    const msg = store.messages.find(m => m.id === msgId);
    if (msg) {
      const htmlMatch = msg.content.match(/```html\n([\s\S]*?)\n```/i);
      if (htmlMatch && htmlMatch[1]) {
        openArtifact(htmlMatch[1].trim(), 'Interactive Artifact');
      }
    }
  }
  else if (action === 'export-chat-md') {
    const chat = store.activeChat;
    if (!chat) return;

    let mdContent = `# ${chat.title}\n*Exported from Berto AI Workspace on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
    chat.messages.forEach(m => {
      const role = m.role === 'user' ? 'User' : 'Berto';
      mdContent += `### ${role}\n${m.content}\n\n`;
    });

    downloadText(`${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`, mdContent, 'text/markdown');
    toast('Chat exported as Markdown');
  } 
  else if (action === 'export-chat-json') {
    const chat = store.activeChat;
    if (!chat) return;
    downloadText(`${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`, JSON.stringify(chat, null, 2), 'application/json');
    toast('Chat exported as JSON');
  }
  else if (action === 'extract-kanban-tasks') {
    const msgNode = element.closest('[data-message]');
    const msgId = msgNode?.dataset?.message;
    const msg = store.messages.find(m => m.id === msgId);
    if (!msg) return;

    toast('Extracting action items into Kanban board...', 'info');

    // Use IIFE to handle async operation
    (async () => {
      try {
        const result = await api.request({
          prompt: `Extract actionable tasks from this text into a clean JSON array:\n\n${msg.content}`,
          system: `Output ONLY a valid JSON array of objects with "title" and "desc" fields.`,
          preferred: store.state.model
        });

        const jsonMatch = result.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const extractedTasks = JSON.parse(jsonMatch[0]);
          const currentTasks = getKanbanTasks();

          extractedTasks.forEach(task => {
            currentTasks.push({
              id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              title: task.title || 'Extracted Task',
              desc: task.desc || '',
              status: 'todo'
            });
          });

          saveKanbanTasks(currentTasks);
          toast(`Added ${extractedTasks.length} task(s) to Project Board`, 'success');
        }
      } catch (err) {
        toast('Could not extract tasks from this response', 'error');
      }
    })();
  }
  else if (action === 'read-aloud') {
    const msgId = element?.dataset?.messageId;
    if (msgId) toggleReadAloud(msgId, element);
  }
}

// --- SESSION TIMER & DASHBOARD STATE CONTROLLER ---
let sessionTimerInterval = null;
let sessionSeconds = 0;

function startSessionTimer() {
  if (sessionTimerInterval) return;
  sessionTimerInterval = setInterval(() => {
    sessionSeconds++;
    const mins = String(Math.floor(sessionSeconds / 60)).padStart(2, '0');
    const secs = String(sessionSeconds % 60).padStart(2, '0');
    const timerEl = $('#voice-session-timer');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
  }, 1000);
}

function resetSessionTimer() {
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }
  sessionSeconds = 0;
  const timerEl = $('#voice-session-timer');
  if (timerEl) timerEl.textContent = '00:00';
}

// Update Modality Pills (Mic & Vision Status)
function updateVoiceDashboardPills() {
  const micPill = $('#pill-mic');
  const visionPill = $('#pill-vision');
  const visionText = $('#pill-vision-text');
  const micText = $('#pill-mic-text');

  const hasCamera = !!(voiceEngineInstance && voiceEngineInstance.videoTrack);
  const hasScreen = !!(voiceEngineInstance && voiceEngineInstance.screenTrack);

  if (visionPill && visionText) {
    if (hasCamera) {
      visionPill.classList.add('is-active');
      visionText.textContent = 'Camera On';
    } else if (hasScreen) {
      visionPill.classList.add('is-active');
      visionText.textContent = 'Screen Sharing';
    } else {
      visionPill.classList.remove('is-active');
      visionText.textContent = 'Vision Off';
    }
  }

  if (micPill) {
    const isActive = !!(voiceEngineInstance && voiceEngineInstance.isListening);
    micPill.classList.toggle('is-active', isActive);
    if (micText) micText.textContent = isActive ? 'Mic Active' : 'Mic Off';
  }
}

// Voice Mode Integration
let voiceEngineInstance = null;
let voiceViewInitialized = false;
let voiceTurnCount = 0;

function initVoiceView() {
  const indicator = $('#voice-indicator');
  const status = $('#voice-status');
  const transcript = $('#voice-transcript');
  const response = $('#voice-response');
  const toggleBtn = $('#voice-toggle-btn');
  const conversation = $('#voice-conversation');
  
  if (typeof startCanvasVisualizer === 'function') {
    startCanvasVisualizer();
  }

  if (voiceViewInitialized && voiceEngineInstance) {
    if (toggleBtn) {
      if (voiceEngineInstance.isListening) {
        toggleBtn.classList.add('is-active');
        const label = toggleBtn.querySelector('.voice-button-label');
        if (label) label.textContent = 'Stop Listening';
      } else if (voiceEngineInstance.isProcessing) {
        const label = toggleBtn.querySelector('.voice-button-label');
        if (label) label.textContent = 'Processing...';
      } else {
        toggleBtn.classList.remove('is-active');
        const label = toggleBtn.querySelector('.voice-button-label');
        if (label) label.textContent = 'Start Speaking';
      }
    }
    return;
  }
  
  if (indicator) indicator.className = 'voice-indicator is-idle';
  if (status) { status.textContent = 'Ready to listen'; status.className = 'voice-status'; }
  if (transcript) { transcript.textContent = ''; transcript.className = 'voice-transcript'; }
  if (response) { response.textContent = ''; response.className = 'voice-response'; }
  if (toggleBtn) {
    toggleBtn.className = 'voice-button';
    const label = toggleBtn.querySelector('.voice-button-label');
    if (label) label.textContent = 'Start Speaking';
    toggleBtn.disabled = false;
  }
  if (conversation) conversation.innerHTML = '';
  
  const key = localStorage.getItem(CONFIG.storage.apiKey)?.trim();
  if (!key) {
    if (status) {
      status.textContent = 'Add your Gemini API key in Settings to use Voice mode.';
    }
    if (toggleBtn) toggleBtn.disabled = true;
    return;
  }
  
  if (typeof VoiceEngine !== 'undefined' && !voiceEngineInstance) {
    voiceEngineInstance = new VoiceEngine();
    
    voiceEngineInstance.onStateChange = (state) => {
      const indicator = $('#voice-indicator');
      const status = $('#voice-status');
      const toggleBtn = $('#voice-toggle-btn');

      if (state.isListening || state.isSpeaking) {
        startSessionTimer();
      }

      // Auto-reset Read Aloud button when speech finishes
      if (!state.isSpeaking && !state.isListening && !state.isProcessing) {
        resetReadAloudButtons();
      }

      updateVoiceDashboardPills();

      if (indicator) {
        if (state.isListening) indicator.className = 'voice-indicator is-listening';
        else if (state.isSpeaking) indicator.className = 'voice-indicator is-speaking';
        else if (state.isProcessing) indicator.className = 'voice-indicator is-processing';
        else indicator.className = 'voice-indicator is-idle';
      }

      if (status) {
        if (state.isListening) { status.textContent = 'Listening...'; status.className = 'voice-status is-active'; }
        else if (state.isSpeaking) { status.textContent = 'Speaking...'; status.className = 'voice-status is-active'; }
        else if (state.isProcessing) { status.textContent = 'Thinking...'; status.className = 'voice-status is-processing'; }
        else { status.textContent = 'Ready to listen'; status.className = 'voice-status'; }
      }
      
      if (toggleBtn) {
        const label = toggleBtn.querySelector('.voice-button-label');
        if (state.isListening) {
          toggleBtn.classList.add('is-active');
          if (label) label.textContent = 'Stop Listening';
        } else {
          toggleBtn.classList.remove('is-active');
          if (label) label.textContent = state.isProcessing ? 'Processing...' : 'Start Speaking';
        }
      }
    };
    
    voiceEngineInstance.onTranscript = (text, isFinal) => {
      const transcript = $('#voice-transcript');
      if (transcript) {
        if (isFinal) {
          transcript.innerHTML = `<span class="final">${escapeHtml(text)}</span>`;
          transcript.classList.add('is-visible');
        } else {
          transcript.innerHTML = `<span class="interim">${escapeHtml(text)}</span>`;
          transcript.classList.add('is-visible');
        }
      }
    };
    
    // Voice Command Intent Interceptor
    voiceEngineInstance.onUserMessage = (text) => {
      addVoiceConversationItem('user', text);

      const cmd = text.toLowerCase().trim();

      // Instant local execution for spoken photo snapshot commands
      if (/\b(take|snap|capture|insert|make) (a )?(photo|picture|image|snapshot)\b/i.test(cmd)) {
        toast(`${LOGO_HTML} Voice Command: Snapping photo...`, 'info');
        executeUiSequence([{ action: "snap_photo", countdown: 2 }]);
        return;
      }

      // Instant local execution for spoken commands
      if (/\b(light mode|enable light theme|switch to light|change theme to light)\b/i.test(cmd)) {
        savePreferences({ theme: 'light' });
        toast('Theme changed to Light');
      } 
      else if (/\b(dark mode|enable dark theme|switch to dark|change theme to dark)\b/i.test(cmd)) {
        savePreferences({ theme: 'dark' });
        toast('Theme changed to Dark');
      } 
      else if (/\b(go to|open|show) (writing|files|projects|settings|chat)\b/i.test(cmd)) {
        const match = cmd.match(/(writing|files|projects|settings|chat)/i);
        if (match) {
          route(match[0].toLowerCase());
          toast(`Navigated to ${match[0]}`);
        }
      } 
      else if (/\b(delete|remove) (this|current) chat\b/i.test(cmd)) {
        if (store.activeChat) {
          const title = store.activeChat.title;
          store.deleteChat(store.activeChat.id);
          renderChats();
          renderMessages();
          toast(`Deleted chat: "${title}"`);
        }
      } 
      else if (/\b(new chat|start new chat|create new chat)\b/i.test(cmd)) {
        store.addChat();
        renderChats();
        renderMessages();
        toast('Started new conversation');
      }
    };

    voiceEngineInstance.onResponse = (text) => {
      const response = $('#voice-response');
      if (response) {
        response.textContent = text;
        response.classList.add('is-visible');
      }
      addVoiceConversationItem('assistant', text);

      // Inspect AI Response for JSON UI Action Sequences
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const actions = JSON.parse(jsonMatch[1]);
          if (Array.isArray(actions)) {
            executeUiSequence(actions);
          }
        } catch (e) {
          console.error('Voice UI Action Execution Error:', e);
        }
      }
    };
    
    voiceEngineInstance.onError = (msg) => {
      toast(msg, 'error');
      const status = $('#voice-status');
      if (status) {
        status.textContent = msg;
        status.className = 'voice-status';
      }
    };
    
    voiceEngineInstance.onVolumeChange = (level) => {
      const wave = $('#voice-wave');
      if (wave) {
        const bars = wave.querySelectorAll('span');
        if (voiceEngineInstance.isSpeaking) {
          bars.forEach(bar => bar.style.height = '');
        } else if (voiceEngineInstance.isListening) {
          const activeCount = Math.round((level / 100) * bars.length);
          bars.forEach((bar, i) => {
            const height = i < activeCount ? 16 + Math.random() * 20 : 6;
            bar.style.height = `${height}px`;
          });
        } else {
          bars.forEach(bar => bar.style.height = '');
        }
      }

      // Update Bento Volume Signal
      const volFill = $('#bento-volume-fill');
      const volVal = $('#bento-volume-val');
      if (volFill) volFill.style.width = `${level}%`;
      if (volVal) volVal.textContent = `${level}%`;
    };
    
    voiceViewInitialized = true;
    if (toggleBtn) toggleBtn.disabled = false;
  }

  const voiceSelect = document.getElementById('voice-select');
  if (voiceSelect && !voiceSelect._voiceListenerAttached) {
    voiceSelect._voiceListenerAttached = true;
    voiceSelect.addEventListener('change', () => {
      if (voiceEngineInstance && voiceEngineInstance.isListening) {
        voiceEngineInstance.stopListening();
        setTimeout(() => voiceEngineInstance.startListening(), 200);
        toast('Switched voice tone');
      }
    });
  }
}

function toggleVoice() {
  // Stop native browser voices if running
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  if (!voiceEngineInstance) {
    initVoiceView();
    setTimeout(() => toggleVoice(), 100);
    return;
  }
  
  if (voiceEngineInstance.isListening) {
    voiceEngineInstance.stopListening();
    const toggleBtn = $('#voice-toggle-btn');
    if (toggleBtn) {
      toggleBtn.classList.remove('is-active');
      const label = toggleBtn.querySelector('.voice-button-label');
      if (label) label.textContent = 'Start Speaking';
    }
  } else if (voiceEngineInstance.isSpeaking) {
    voiceEngineInstance.cancelSpeaking();
  } else {
    const transcript = $('#voice-transcript');
    const response = $('#voice-response');
    if (transcript) { transcript.textContent = ''; transcript.className = 'voice-transcript'; }
    if (response) { response.textContent = ''; response.className = 'voice-response'; }
    
    voiceEngineInstance.startListening();
  }
}

function resetVoice() {
  if (voiceEngineInstance) {
    voiceEngineInstance.resetConversation();
  }

  resetSessionTimer();
  updateVoiceDashboardPills();

  const transcript = $('#voice-transcript');
  const response = $('#voice-response');
  const conversation = $('#voice-conversation');
  const toggleBtn = $('#voice-toggle-btn');
  const indicator = $('#voice-indicator');
  const status = $('#voice-status');

  if (transcript) { transcript.textContent = ''; transcript.className = 'voice-transcript'; }
  if (response) { response.textContent = ''; response.className = 'voice-response'; }
  if (conversation) conversation.innerHTML = '';
  if (toggleBtn) {
    toggleBtn.classList.remove('is-active');
    const label = toggleBtn.querySelector('.voice-button-label');
    if (label) label.textContent = 'Start Speaking';
  }
  if (indicator) indicator.className = 'voice-indicator is-idle';
  if (status) { status.textContent = 'Ready to listen'; status.className = 'voice-status'; }

  if (typeof stopCanvasVisualizer === 'function') stopCanvasVisualizer();

  toast('Voice conversation reset');
}

function addVoiceConversationItem(role, text) {
  const container = $('#voice-conversation');
  if (!container) return;
  
  const item = document.createElement('div');
  item.className = `voice-conversation-item ${role}`;
  item.innerHTML = `
    <span class="conv-role">${role === 'user' ? 'You' : 'Berto'}</span>
    <span class="conv-text">${escapeHtml(text)}</span>
  `;
  container.appendChild(item);
  container.scrollTop = container.scrollHeight;
}

async function summarizeAndSendToLive() {
  const messages = store.messages;
  if (!messages || messages.length === 0) {
    toast('No chat context available to send to Berto Live.', 'error');
    return;
  }

  toast('Summarizing chat context for Berto Live...', 'info');

  let summaryText = '';

  try {
    const chatTranscript = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Berto'}: ${m.content}`)
      .join('\n\n');

    const result = await api.request({
      prompt: `Summarize the following chat context into a brief 2-3 sentence verbal summary for a voice session:\n\n${chatTranscript}`,
      system: 'You are an executive briefing assistant. Provide ONLY a concise, direct, spoken-word summary of the conversation key points. Do not include markdown or preamble.',
      preferred: store.state.model,
      temperature: 0.3
    });

    summaryText = result.text.trim();
  } catch (err) {
    const lastUserMsg = messages.filter(m => m.role === 'user').at(-1)?.content || 'General chat context';
    summaryText = `Recent topic discussed: "${lastUserMsg.slice(0, 120)}${lastUserMsg.length > 120 ? '...' : ''}" with ${messages.length} total messages.`;
  }

  route('voice');
  initVoiceView();

  const liveContainer = $('#voice-conversation');
  if (liveContainer) {
    const contextCard = document.createElement('div');
    contextCard.className = 'voice-conversation-item assistant context-briefing';
    contextCard.innerHTML = `
      <span class="conv-role"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Live Context Briefing</span>
      <div class="conv-text"><em>${escapeHtml(summaryText)}</em></div>
    `;
    liveContainer.appendChild(contextCard);
    liveContainer.scrollTop = liveContainer.scrollHeight;
  }

  if (voiceEngineInstance) {
    if (typeof voiceEngineInstance.injectContext === 'function') {
      voiceEngineInstance.injectContext(summaryText);
    } else {
      voiceEngineInstance.conversationHistory = [
        { role: 'system', content: `Current conversation context briefing: ${summaryText}` }
      ];
    }
  }

  toast('Chat context loaded into Berto Live!', 'info');

  setTimeout(() => {
    if (voiceEngineInstance && !voiceEngineInstance.isListening) {
      toggleVoice();
    }
  }, 800);
}

function updateLiveAiVideoState() {
  const pane = document.getElementById('voice-chat-pane');
  const cameraBox = document.getElementById('camera-feed-box');
  const screenBox = document.getElementById('screen-feed-box');
  const cameraVideo = document.getElementById('camera-video-element');
  const screenVideo = document.getElementById('screen-video-element');

  const hasCamera = !!(voiceEngineInstance && voiceEngineInstance.videoTrack);
  const hasScreen = !!(voiceEngineInstance && voiceEngineInstance.screenTrack);

  if (cameraBox) cameraBox.hidden = !hasCamera;
  if (screenBox) screenBox.hidden = !hasScreen;

  if (hasCamera && cameraVideo) {
    cameraVideo.srcObject = voiceEngineInstance.videoStream;
  } else if (cameraVideo) {
    cameraVideo.srcObject = null;
  }

  if (hasScreen && screenVideo) {
    screenVideo.srcObject = voiceEngineInstance.screenStream;
  } else if (screenVideo) {
    screenVideo.srcObject = null;
  }

  if (hasCamera || hasScreen) {
    pane?.classList.add('has-video');
  } else {
    pane?.classList.remove('has-video');
  }
}

async function toggleVoiceCamera() {
  if (!voiceEngineInstance) return;
  
  if (voiceEngineInstance.videoTrack) {
    voiceEngineInstance.stopCamera();
  } else {
    if (voiceEngineInstance.screenTrack) {
      voiceEngineInstance.stopScreenShare();
    }
    await voiceEngineInstance.startCamera();
  }
  
  updateLiveAiVideoState();
}

async function toggleVoiceScreen() {
  if (!voiceEngineInstance) return;

  if (voiceEngineInstance.screenTrack) {
    voiceEngineInstance.stopScreenShare();
  } else {
    if (voiceEngineInstance.videoTrack) {
      voiceEngineInstance.stopCamera();
    }
    await voiceEngineInstance.startScreenShare();
  }

  updateLiveAiVideoState();
}

function closeVoiceVideoPreview() {
  const preview = $('#camera-feed-box');
  const video = $('#camera-video-element');
  if (preview) {
    preview.classList.remove('is-expanded');
    preview.hidden = true;
  }
  if (video) video.srcObject = null;

  if (voiceEngineInstance) {
    voiceEngineInstance.stopCamera();
    voiceEngineInstance.stopScreenShare();
  }
}

function toggleVoiceVideoExpand() {
  const preview = $('#camera-feed-box');
  if (!preview) return;
  
  const isExpanded = preview.classList.toggle('is-expanded');
  
  if (isExpanded) {
    preview.style.position = 'fixed';
    preview.style.width = '480px';
    preview.style.height = '320px';
    preview.style.left = `${Math.max(20, (window.innerWidth - 480) / 2)}px`;
    preview.style.top = `${Math.max(20, (window.innerHeight - 320) / 2)}px`;
    preview.style.right = 'auto';
    preview.style.bottom = 'auto';
    toast('Popped out — drag header to move');
  } else {
    preview.style.position = '';
    preview.style.width = '';
    preview.style.height = '';
    preview.style.left = '';
    preview.style.top = '';
    preview.style.right = '';
    preview.style.bottom = '';
    toast('Docked back in Stage area');
  }
}

async function sendCameraPhoto() {
  if (!capturedPhotoBlob) return;

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(capturedPhotoBlob);
    });

    const fileName = `camera_${Date.now()}.jpg`;
    
    store.addFile({
      name: fileName,
      type: 'image/jpeg',
      mimeType: 'image/jpeg',
      size: `${Math.max(1, Math.ceil(capturedPhotoBlob.size / 1024))} KB`,
      content: dataUrl,
      isImage: true,
      bytes: capturedPhotoBlob.size
    });

    currentAttachments.push({
      name: fileName,
      type: 'image/jpeg',
      mimeType: 'image/jpeg',
      size: `${Math.max(1, Math.ceil(capturedPhotoBlob.size / 1024))} KB`,
      bytes: capturedPhotoBlob.size,
      content: dataUrl,
      isImage: true,
      file: new File([capturedPhotoBlob], fileName, { type: 'image/jpeg' })
    });

    capturedPhotoBlob = null;
    closeCameraModal();
    updateAttachmentLabel();
    updateCount();
    renderFiles();
    toast('Photo saved to Files and attached to message');
  } catch (e) {
    console.error('Error processing camera photo:', e);
    toast('Failed to process photo', 'error');
  }
}

// Global Event Listeners
document.addEventListener('click', event => {
  // Direct matching for Send button and actions
  const sendTarget = event.target.closest('#send-button, [data-action="send"]');
  if (sendTarget) {
    event.preventDefault();
    send();
    return;
  }

  // Camera Modal explicit actions
  if (event.target.closest('#capture-btn')) {
    capturePhoto();
    return;
  }
  if (event.target.closest('#retake-btn')) {
    retakePhoto();
    return;
  }
  if (event.target.closest('#send-camera-btn')) {
    sendCameraPhoto();
    return;
  }

  // Voice Toggle explicit matching
  if (event.target.closest('#voice-toggle-btn')) {
    toggleVoice();
    return;
  }

  const routeButton = event.target.closest('[data-route]');
  if (routeButton) return route(routeButton.dataset.route);

  const actionNode = event.target.closest('[data-action]');
  if (actionNode) {
    event.stopPropagation();
    return handleAction(actionNode.dataset.action, actionNode);
  }

  if (event.target.id === 'save-rename-chat') {
    const chatId = event.target.dataset.chatId;
    const newTitle = $('#rename-chat-title')?.value;
    if (newTitle) {
      store.renameChat(chatId, newTitle);
      renderChats();
      closeModal();
      toast('Chat renamed');
    }
    return;
  }

  if (event.target.id === 'save-project-btn') {
    const editIndex = event.target.dataset.editIndex;
    const name = $('#project-name-input')?.value.trim();
    const desc = $('#project-desc-input')?.value.trim();
    if (name) {
      if (editIndex !== '') {
        store.updateProject(Number(editIndex), { name, desc: desc || 'Ongoing workspace project.' });
        toast('Project updated');
      } else {
        store.addProject({ name, desc: desc || 'Ongoing workspace project.' });
        toast('Project created');
      }
      renderProjects();
      closeModal();
    }
    return;
  }

  const modelChoice = event.target.closest('[data-model-choice]');
  if (modelChoice) {
    store.update({ model: modelChoice.dataset.modelChoice });
    closeModal();
    const chosenModel = CONFIG.models.find(m => m.id === modelChoice.dataset.modelChoice);
    if ($('#model-label')) $('#model-label').textContent = chosenModel ? chosenModel.label : 'Berto Auto';
    toast(`${modelChoice.textContent.trim().split('\n')[0]} selected`);
    return;
  }

  const searchChat = event.target.closest('[data-search-chat]');
  if (searchChat) {
    store.selectChat(searchChat.dataset.searchChat);
    renderChats();
    renderMessages();
    closeModal();
    return;
  }

  const chatButton = event.target.closest('[data-chat]');
  if (chatButton) {
    store.selectChat(chatButton.dataset.chat);
    renderChats();
    renderMessages();
    return;
  }

  const promptSuggestion = event.target.closest('[data-prompt]');
  if (promptSuggestion) {
    const promptInput = $('#prompt');
    if (promptInput) {
      promptInput.value = promptSuggestion.dataset.prompt;
      updateCount();
      promptInput.focus();
    }
    return;
  }

  const template = event.target.closest('[data-writing-template]');
  if (template) {
    const wInput = $('#writing-input');
    if (wInput) {
      wInput.value = template.dataset.writingTemplate + '\n\n';
      writingMetrics();
      wInput.focus();
    }
    return;
  }

  const message = event.target.closest('[data-message]');
  if (message && event.target.closest('[data-copy]')) {
    const textNode = $('.message-body', message);
    if (textNode) copyToClipboard(textNode.innerText);
    return;
  }

  if (message && event.target.closest('[data-delete-message]')) {
    store.removeMessage(message.dataset.message);
    renderMessages();
    toast('Message deleted');
    return;
  }

  if (message && event.target.closest('[data-edit-message]')) {
    const savedMessage = store.messages.find(item => item.id === message.dataset.message);
    if (savedMessage?.role === 'user') {
      const promptInput = $('#prompt');
      if (promptInput) {
        promptInput.value = savedMessage.content || '';
        updateCount();
        promptInput.focus();
      }
    } else if (savedMessage) {
      const messageIndex = store.messages.indexOf(savedMessage);
      const prevUserMsg = store.messages.slice(0, messageIndex).reverse().find(m => m.role === 'user');
      if (prevUserMsg) {
        send(prevUserMsg.fullPrompt || prevUserMsg.content);
      }
    }
    return;
  }

  if (event.target.id === 'modal') {
    closeModal();
    return;
  }

  const settingsNavBtn = event.target.closest('.settings-nav button');
  if (settingsNavBtn) {
    const nav = settingsNavBtn.closest('.settings-nav');
    [...nav.children].forEach(btn => btn.classList.remove('active'));
    settingsNavBtn.classList.add('active');
    
    const index = [...nav.children].indexOf(settingsNavBtn);
    const sections = $$('.settings-section');
    const sectionIndex = index > 2 ? 2 : index;
    if (sections[sectionIndex]) {
      sections[sectionIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }

// Now clicking "Run" on any code block re-opens the Artifact Side Panel!
  const runHtml = event.target.closest('[data-run-html]');
  if (runHtml) {
    const rawHtml = decodeURIComponent(runHtml.dataset.runHtml);
    openArtifact(rawHtml, 'Interactive Artifact');
    return;
  }
  
  if (event.target.id === 'html-runner-modal') {
    const modal = $('#html-runner-modal');
    const frame = $('#html-runner-frame');
    if (modal) modal.hidden = true;
    if (frame) frame.srcdoc = '';
    return;
  }

  const copyCode = event.target.closest('[data-code-copy]');
  if (copyCode) {
    copyToClipboard(decodeURIComponent(copyCode.dataset.codeCopy));
    return;
  }

  const theme = event.target.closest('[data-setting-theme]');
  if (theme) {
    $$('[data-setting-theme]').forEach(button => button.classList.toggle('active', button === theme));
    savePreferences({ theme: theme.dataset.settingTheme });
    return;
  }

  const density = event.target.closest('[data-setting-density]');
  if (density) {
    $$('[data-setting-density]').forEach(button => button.classList.toggle('active', button === density));
    savePreferences({ density: density.dataset.settingDensity });
  }

  const chatImage = event.target.closest('.message-images img');
  if (chatImage) {
    openLightbox(chatImage.src);
    return;
  }
});

// Input Listeners
$('#prompt')?.addEventListener('input', () => {
  updateCount();
  resizePrompt();
});

$('#prompt')?.addEventListener('paste', handleImagePaste);

$('#prompt')?.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    send();
  }
});

$('#writing-input')?.addEventListener('input', () => {
  writingMetrics();
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, CONFIG.autosaveMs);
});

$('#file-input')?.addEventListener('change', async event => {
  const files = [...event.target.files];
  const accepted = files.filter(file => file.size <= CONFIG.maxAttachmentSize);
  
  if (accepted.length !== files.length) {
    toast('Files over 7MB were skipped', 'error');
  }

  for (const file of accepted) {
    let textContent = '';
    const ext = file.name.split('.').pop().toLowerCase();
    const isImage = file.type.startsWith('image/');

    try {
      if (isImage) {
        textContent = await fileToBase64(file);
      } else if (ext === 'pdf') {
        toast(`Extracting text from PDF: ${file.name}...`);
        textContent = await extractPdfText(file);
      } else if (ext === 'docx') {
        toast(`Extracting text from Word doc: ${file.name}...`);
        textContent = await extractDocxText(file);
      } else if (file.type.startsWith('text/') || ['txt','md','csv','json','js','ts','py','html','css'].includes(ext)) {
        textContent = await file.text();
      }
    } catch (err) {
      console.error(`Failed to read file ${file.name}:`, err);
      toast(`Failed to extract text from ${file.name}`, 'error');
      continue;
    }

    const fileObj = {
      name: file.name,
      type: ext.toUpperCase(),
      mimeType: file.type || 'application/octet-stream',
      size: `${Math.max(1, Math.ceil(file.size / 1024))} KB`,
      content: textContent,
      isImage,
      bytes: file.size
    };

    store.addFile(fileObj);
    currentAttachments.push({
      ...fileObj,
      file
    });
  }

  updateAttachmentLabel();
  updateCount();
  renderFiles();
  if (accepted.length) toast(`${accepted.length} file(s) processed & attached`);
});

$('#api-key-setting')?.addEventListener('change', event => {
  const newKey = event.target.value.trim();
  try { localStorage.setItem(CONFIG.storage.apiKey, newKey); } catch (e) {}
  toast(newKey ? 'API key saved locally' : 'API key removed');
  
  // Re-run account restriction detection whenever API key changes
  if (newKey) {
    detectManagedAccountRestrictions();
  }
});

$('#motion-toggle')?.addEventListener('change', event => savePreferences({ motion: event.target.checked }));
$('#writing-mode')?.addEventListener('change', writingMetrics);

// Drag & Drop
['dragenter', 'dragover'].forEach(type => {
  $('.composer-wrap')?.addEventListener(type, event => {
    event.preventDefault();
    $('.composer-wrap').classList.add('dragging');
  });
  $('#upload-panel')?.addEventListener(type, event => {
    event.preventDefault();
    $('#upload-panel').classList.add('dragging');
  });
});

['dragleave', 'drop'].forEach(type => {
  const onDrop = event => {
    event.preventDefault();
    $('.composer-wrap')?.classList.remove('dragging');
    $('#upload-panel')?.classList.remove('dragging');
    if (type === 'drop' && event.dataTransfer.files.length) {
      const transfer = new DataTransfer();
      [...event.dataTransfer.files].forEach(file => transfer.items.add(file));
      const fileInput = $('#file-input');
      if (fileInput) {
        fileInput.files = transfer.files;
        fileInput.dispatchEvent(new Event('change'));
      }
    }
  };
  $('.composer-wrap')?.addEventListener(type, onDrop);
  $('#upload-panel')?.addEventListener(type, onDrop);
});

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
  }
  if (event.key === 'Escape') {
    closeModal();
    closeMobile();
    closeArtifact();
    const runnerModal = $('#html-runner-modal');
    const runnerFrame = $('#html-runner-frame');
    if (runnerModal) runnerModal.hidden = true;
    if (runnerFrame) runnerFrame.srcdoc = '';
  }
});

// Register ServiceWorker safely
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// =========================================================
// PUSH-TO-TALK HOTKEY
// =========================================================
let isPushToTalkActive = false;

document.addEventListener('keydown', (e) => {
  // Only trigger if in Voice mode, not typing in an input field, and pressing Space
  if (store.state.route !== 'voice' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    return;
  }

  if (e.code === 'Space' && !e.repeat && !isPushToTalkActive) {
    e.preventDefault();
    isPushToTalkActive = true;
    if (voiceEngineInstance && !voiceEngineInstance.isListening) {
      voiceEngineInstance.startListening();
      toast('Push-to-Talk Active', 'info');
    }
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && isPushToTalkActive) {
    e.preventDefault();
    isPushToTalkActive = false;
    if (voiceEngineInstance && voiceEngineInstance.isListening) {
      voiceEngineInstance.stopListening();
      toast('Push-to-Talk Released', 'info');
    }
  }
});

// =========================================================
// FOCUS TRAP & ARIA IMPROVEMENTS
// =========================================================
function trapModalFocus(modalEl) {
  if (!modalEl) return;
  
  const focusables = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  modalEl.onkeydown = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };
}


// =========================================================
// ARTIFACT RESIZER LOGIC
// =========================================================
function initArtifactResizer() {
  const resizer = $('#artifact-resizer');
  const layout = $('#chat-layout');
  const drawer = $('#artifact-drawer');
  
  if (!resizer || !layout || !drawer) return;

  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizer.classList.add('is-dragging');
    document.body.classList.add('is-resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const containerRect = layout.getBoundingClientRect();
    const newDrawerWidth = containerRect.right - e.clientX;
    
    // Clamp width between 280px and 70% of screen
    const clampedWidth = Math.max(280, Math.min(newDrawerWidth, containerRect.width * 0.7));
    drawer.style.width = `${clampedWidth}px`;
  });

  const stopDrag = () => {
    if (isResizing) {
      isResizing = false;
      resizer.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  };

  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('mousecancel', stopDrag);
}

// Update openArtifact() and closeArtifact() to toggle resizer

// =========================================================
// INITIALIZATION
// =========================================================

// First-Time Setup Flow
function initSetup() {
  const hasKey = localStorage.getItem(CONFIG.storage.apiKey);
  const hasCompletedSetup = localStorage.getItem(`${INSTANCE_PREFIX}-setup-complete`);
  
  if (!hasKey && !hasCompletedSetup) {
    const overlay = $('#setup-overlay');
    if (overlay) {
      overlay.hidden = false;
      
      const nameInput = $('#setup-name');
      const keyInput = $('#setup-api-key');
      const submitBtn = $('#setup-submit');
      const skipBtn = $('#setup-skip');
      
      function validateSetup() {
        const hasName = nameInput?.value.trim().length > 0;
        const hasApiKey = keyInput?.value.trim().length > 0;
        if (submitBtn) submitBtn.disabled = !(hasName || hasApiKey);
      }
      
      nameInput?.addEventListener('input', validateSetup);
      keyInput?.addEventListener('input', validateSetup);
      
      function completeSetup() {
        const name = nameInput?.value.trim();
        const apiKey = keyInput?.value.trim();
        
        if (name) {
          savePreferences({ userName: name });
        }
        if (apiKey) {
          writeStorage(CONFIG.storage.apiKey, apiKey);
        }
        
        writeStorage(`${INSTANCE_PREFIX}-setup-complete`, 'true');
        overlay.hidden = true;
        renderSettings();
        
        if (name) toast(`Welcome, ${name}! Berto is ready.`);
        else toast('Welcome! Set your name in Settings anytime.');
      }
      
      submitBtn?.addEventListener('click', completeSetup);
      
      keyInput?.addEventListener('keydown', event => {
        if (event.key === 'Enter') completeSetup();
      });
      
      skipBtn?.addEventListener('click', () => {
        writeStorage(`${INSTANCE_PREFIX}-setup-complete`, 'true');
        overlay.hidden = true;
        toast('You can add your API key in Settings anytime.');
      });
    }
  }
}

// Initial Render
if ($('#writing-input')) {
  const rawDraft = localStorage.getItem(`${INSTANCE_PREFIX}-writing-draft`);
  let draft = '';
  if (rawDraft !== null) {
    try {
      draft = JSON.parse(rawDraft);
    } catch {
      draft = rawDraft;
    }
  }
  $('#writing-input').value = draft;
}

store.subscribe(() => { renderChats(); });

// =========================================================
// SLASH COMMAND PALETTE ENGINE
// =========================================================

const SLASH_COMMANDS = [
  { cmd: '/write', desc: 'Open Writing Studio', action: () => route('writing') },
  { cmd: '/voice', desc: 'Launch Berto Live Voice', action: () => { route('voice'); initVoiceView(); } },
  { cmd: '/projects', desc: 'View Kanban Board', action: () => route('projects') },
  { cmd: '/theme', desc: 'Toggle Light/Dark Theme', action: () => {
      const current = document.documentElement.dataset.theme || 'dark';
      savePreferences({ theme: current === 'dark' ? 'light' : 'dark' });
    }
  },
  { cmd: '/clear', desc: 'Start a fresh conversation', action: () => handleAction('new-chat') },
  { cmd: '/demo', desc: 'Run Keynote Feature Showcase', action: () => runFeatureShowcase() }
];

function setupSlashCommandPalette() {
  const promptInput = $('#prompt');
  if (!promptInput) return;

  const popup = document.createElement('div');
  popup.id = 'cmd-palette-popup';
  popup.className = 'cmd-palette-popup';
  popup.hidden = true;
  $('.composer-wrap')?.appendChild(popup);

  let selectedCmdIndex = 0;

  function updateSelectedCommand(items) {
    items.forEach((item, idx) => {
      item.classList.toggle('selected', idx === selectedCmdIndex);
    });
  }

  promptInput.addEventListener('input', () => {
    const val = promptInput.value;
    if (val.startsWith('/')) {
      const filter = val.toLowerCase();
      const matches = SLASH_COMMANDS.filter(c => c.cmd.startsWith(filter));

      if (matches.length > 0) {
        selectedCmdIndex = 0;
        popup.innerHTML = matches.map((m, idx) => `
          <div class="cmd-item-row ${idx === 0 ? 'selected' : ''}" data-cmd-idx="${idx}">
            <div class="cmd-item-left">
              <span class="cmd-tag">${m.cmd}</span>
              <span>${m.desc}</span>
            </div>
            <span class="cmd-desc">↵ Select</span>
          </div>
        `).join('');

        popup.hidden = false;

        $$('.cmd-item-row', popup).forEach((row, i) => {
          row.onclick = () => {
            promptInput.value = '';
            popup.hidden = true;
            matches[i].action();
          };
        });
      } else {
        popup.hidden = true;
      }
    } else {
      popup.hidden = true;
    }
  });

  promptInput.addEventListener('keydown', (e) => {
    if (popup.hidden) return;

    const items = $$('.cmd-item-row', popup);
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedCmdIndex = (selectedCmdIndex + 1) % items.length;
      updateSelectedCommand(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedCmdIndex = (selectedCmdIndex - 1 + items.length) % items.length;
      updateSelectedCommand(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[selectedCmdIndex]?.click();
    } else if (e.key === 'Escape') {
      popup.hidden = true;
    }
  });
}

// Ensure Slash Commands and Artifact Resizer run regardless of load timing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupSlashCommandPalette();
    initArtifactResizer();
  });
} else {
  setupSlashCommandPalette();
  initArtifactResizer();
}

renderChats();
renderMessages();
renderFiles();
renderProjects();
renderWritingProfile();
renderSettings();
writingMetrics();
updateCount();
renderKanbanBoard();
initSetup();

// Detect school account / network restrictions on app load
if (store.state.voiceFeaturesDisabled) {
  setVoiceFeaturesDisabled(true);
} else {
  detectManagedAccountRestrictions();
}

// Mobile Soft Keyboard Positioning Engine
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const chatMain = document.querySelector('.chat-main');
    if (chatMain && window.innerWidth <= 800) {
      // Adjust view height to match the visible viewport when soft keyboard appears
      chatMain.style.height = `${window.visualViewport.height - 60}px`;
      
      // Auto-scroll to current message when keyboard opens
      const scrollArea = document.querySelector('.chat-scroll');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  });
}
