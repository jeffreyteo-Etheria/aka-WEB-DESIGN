#!/usr/bin/env node
/**
 * AKA Digital — CMS + Visual Editor Server  v2.0
 *
 * Run:  node editor-server.js
 * CMS:  http://localhost:3001/admin
 *
 * Two roles:
 *   super  →  full access (all data files, settings, build, export)
 *   team   →  blogs and events only
 *
 * Credentials are set below — change before sharing with your team.
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const {
  validatePayload,
  getClientIp,
  createRateLimiter,
  appendAuditLog,
  appendSecurityLog,
  getSecurityHeaders,
} = require('./scripts/security-helpers');
const securityConfig = require('./config/security.config');

/* Some hosts (e.g. Hostinger's Passenger/alt-nodejs runtime) run this process
   with a PATH that doesn't include the directory npm actually lives in, even
   though node itself starts fine — causing "npm: command not found" when we
   shell out to run the site build. Force the running node's own bin
   directory onto PATH for any child process we spawn. */
const EXEC_ENV = {
  ...process.env,
  PATH: path.dirname(process.execPath) + path.delimiter + (process.env.PATH || ''),
};

/* ─────────────────────────────────────────────────────────────────────────
   CONFIG — change passwords before sharing
   ───────────────────────────────────────────────────────────────────────── */

const PORT = process.env.PORT || 3001;

const USERS = [
  {
    username: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASS || 'change-me',
    role:     'super',
    display:  'Super Admin',
  },
  {
    username: process.env.TEAM_USER || 'team',
    password: process.env.TEAM_PASS || 'change-me',
    role:     'team',
    display:  'Team Member',
  },
];
const loginLimiter = createRateLimiter(securityConfig.rateLimits.login);
const apiLimiter = createRateLimiter(securityConfig.rateLimits.api);

/* ─────────────────────────────────────────────────────────────────────────
   PATHS
   ───────────────────────────────────────────────────────────────────────── */

const ROOT       = __dirname;
const DIST       = path.join(ROOT, 'dist');
const DATA       = path.join(ROOT, 'src', '_data');
const PUBLIC     = path.join(ROOT, 'public');
const EDITOR     = path.join(ROOT, 'editor');
const ADMIN      = path.join(ROOT, 'editor', 'admin');
const EDITS      = path.join(DATA,   '_edits.json');
const UPLOADS    = path.join(PUBLIC, 'images', 'uploads');
const BLOG_PAGES = path.join(ROOT, 'src', 'blog');
const CMS_USERS  = path.join(ROOT, 'cms_users.json');
const SESSIONS_FILE = path.join(ROOT, '.sessions.json');

[UPLOADS, ADMIN, BLOG_PAGES].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

/* ── Google-authorized CMS users (stored outside Eleventy data dir) ──────── */
function readUsers() {
  try { return JSON.parse(fs.readFileSync(CMS_USERS, 'utf8')); } catch { return []; }
}
function writeUsers(data) {
  fs.writeFileSync(CMS_USERS, JSON.stringify(data, null, 2));
}

/* Write / delete the Eleventy .njk wrapper that gives a blog post its URL */
function writeBlogNjk(slug) {
  const content = `---\nlayout: layouts/blog-post.njk\npermalink: /blog/${slug}/index.html\npostSlug: ${slug}\n---\n`;
  fs.writeFileSync(path.join(BLOG_PAGES, `${slug}.njk`), content);
}
function deleteBlogNjk(slug) {
  const fp = path.join(BLOG_PAGES, `${slug}.njk`);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
}

/* ─────────────────────────────────────────────────────────────────────────
   SESSION STORE  { token → { username, role, display } }
   Persisted to disk so logins survive a process restart (Hostinger restarts
   this app on every redeploy — without persistence, that silently logs out
   every user with a bare "Unauthorized" and no explanation).
   ───────────────────────────────────────────────────────────────────────── */

function loadSessions() {
  try {
    const raw = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    const now = Date.now();
    return new Map(Object.entries(raw).filter(([, s]) => !s.expiresAt || s.expiresAt > now));
  } catch { return new Map(); }
}
function persistSessions() {
  const obj = Object.fromEntries(SESSIONS);
  fs.writeFile(SESSIONS_FILE, JSON.stringify(obj), () => {});
}

const SESSIONS = loadSessions();
const mkToken  = () => crypto.randomBytes(32).toString('hex');

function getSession(req) {
  /* Accept token from header (API calls) OR query string (EventSource, which can't set headers) */
  const t = req.headers['x-editor-token']
    || new URL(req.url, 'http://localhost').searchParams.get('token')
    || '';
  const session = SESSIONS.get(t);
  if (!session) return null;
  if (session.expiresAt && Date.now() > session.expiresAt) {
    SESSIONS.delete(t);
    persistSessions();
    return null;
  }
  session.lastSeen = Date.now();
  return session;
}
function isSuper(req) { const s = getSession(req); return s && s.role === 'super'; }
function isAuthed(req) { return !!getSession(req); }

/* ─────────────────────────────────────────────────────────────────────────
   MIME
   ───────────────────────────────────────────────────────────────────────── */

const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml',
  '.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2',
  '.woff':'font/woff','.ttf':'font/ttf','.mp4':'video/mp4',
  '.pdf':'application/pdf','.xml':'application/xml',
};
const mime = ext => MIME[ext] || 'application/octet-stream';

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────────────────── */

function reply(res, status, data, ct) {
  res.writeHead(status, {
    'Content-Type': ct || 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Editor-Token, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...getSecurityHeaders(),
  });
  if (Buffer.isBuffer(data)) {
    res.end(data);
  } else {
    res.end(typeof data === 'string' ? data : JSON.stringify(data));
  }
}
const j   = (res, st, d) => reply(res, st, d, 'application/json');
const h   = (res, st, d) => reply(res, st, d, 'text/html');

function readBody(req) {
  return new Promise((res) => {
    let b = '';
    let size = 0;
    req.on('data', c => {
      size += Buffer.byteLength(c);
      if (size > securityConfig.maxPayloadSizeBytes) {
        req.destroy();
        return;
      }
      b += c;
    });
    req.on('end', () => { try { res(JSON.parse(b || '{}')); } catch { res({}); } });
    req.on('error', () => res({}));
  });
}

async function readValidatedBody(req, res, context) {
  const payload = await readBody(req);
  const validation = validatePayload(payload);
  if (!validation.valid) {
    appendSecurityLog('invalid_payload', { context, path: req.url, error: validation.error, clientIp: getClientIp(req) });
    j(res, 400, { error: validation.error });
    return null;
  }
  return validation.value;
}

function readMultipart(req, boundary) {
  return new Promise((res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const sep = Buffer.from('--' + boundary);
      const files = {}, fields = {};
      let start = buf.indexOf(sep) + sep.length + 2;
      while (start < buf.length) {
        const end = buf.indexOf(sep, start);
        if (end === -1) break;
        const part   = buf.slice(start, end - 2);
        const hEnd   = part.indexOf('\r\n\r\n');
        const header = part.slice(0, hEnd).toString();
        const body   = part.slice(hEnd + 4);
        const nameM  = header.match(/name="([^"]+)"/);
        const fileM  = header.match(/filename="([^"]+)"/);
        const ctM    = header.match(/Content-Type:\s*(\S+)/i);
        if (nameM) {
          if (fileM) files[nameM[1]] = { filename: fileM[1], data: body, ct: ctM ? ctM[1] : 'image/jpeg' };
          else       fields[nameM[1]] = body.toString();
        }
        start = end + sep.length + 2;
      }
      res({ files, fields });
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   DATA FILE HELPERS
   ───────────────────────────────────────────────────────────────────────── */

function readData(file) {
  const fp = path.join(DATA, file + '.json');
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return []; }
}

function writeData(file, data) {
  fs.writeFileSync(path.join(DATA, file + '.json'), JSON.stringify(data, null, 2));
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/* ─────────────────────────────────────────────────────────────────────────
   EDITS PERSISTENCE (visual editor)
   ───────────────────────────────────────────────────────────────────────── */

function loadEdits() {
  try { return JSON.parse(fs.readFileSync(EDITS, 'utf8')); }
  catch { return { pending: [], approved: [] }; }
}
function saveEdits(d) { fs.writeFileSync(EDITS, JSON.stringify(d, null, 2)); }

const INJECT = `
<link  rel="stylesheet" href="/__editor/editor.css"/>
<script src="/__editor/editor.js" defer></script>`;

function applyApprovedEdits(html, approved) {
  if (!approved || !approved.length) return html;
  const patch = `<script>(function(){
var E=${JSON.stringify(approved)};
function run(){E.forEach(function(e){try{
  var el=document.querySelector(e.selector);
  if(!el)return;
  if(e.type==='text')   el.innerHTML=e.value;
  if(e.type==='image')  { el.src=e.value; if(el.tagName==='DIV')el.style.backgroundImage='url('+e.value+')'; }
  if(e.type==='href')   el.href=e.value;
  if(e.type==='delete') el.remove();
  if(e.type==='hide')   el.style.display='none';
}catch(x){}})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',run):run();
})();</script>`;
  return html.replace('</body>', patch + '\n</body>');
}

/* ─────────────────────────────────────────────────────────────────────────
   STATIC FILE RESOLVER
   ───────────────────────────────────────────────────────────────────────── */

function resolveFile(pathname, dir) {
  let p = path.join(dir, pathname === '/' ? 'index.html' : pathname);
  if (!path.extname(p)) {
    if (fs.existsSync(p + '/index.html')) return p + '/index.html';
    if (fs.existsSync(p + '.html'))       return p + '.html';
  }
  return p;
}

/* ─────────────────────────────────────────────────────────────────────────
   HTTP SERVER
   ───────────────────────────────────────────────────────────────────────── */

http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost`);
  const p = u.pathname;
  const m = req.method;
  const clientIp = getClientIp(req);

  if (m === 'OPTIONS') return reply(res, 200, '', 'text/plain');

  /* ── 1. Admin UI pages (/admin and /admin/*) ─────────────────────────── */
  if (p === '/admin' || p === '/admin/' || p.startsWith('/admin/')) {
    const subpath = p === '/admin' || p === '/admin/' ? '/login.html' : p.replace('/admin', '');
    const fp = resolveFile(subpath, ADMIN);
    if (fs.existsSync(fp) && !fs.statSync(fp).isDirectory()) {
      return reply(res, 200, fs.readFileSync(fp), mime(path.extname(fp)));
    }
    return h(res, 404, '<h1>404 – Admin page not found</h1>');
  }

  /* ── 2. Editor assets ────────────────────────────────────────────────── */
  if (p.startsWith('/__editor/')) {
    const f = path.join(EDITOR, p.replace('/__editor/', ''));
    if (!fs.existsSync(f)) return j(res, 404, { error: 'not found' });
    return reply(res, 200, fs.readFileSync(f), mime(path.extname(f)));
  }

  /* ── 3. API ──────────────────────────────────────────────────────────── */
  if (p.startsWith('/api/')) {
    if (p === '/api/login' && m === 'POST') {
      const limit = loginLimiter(clientIp);
      if (!limit.allowed) {
        appendSecurityLog('login_rate_limited', { clientIp });
        return j(res, 429, { error: 'Too many login attempts' });
      }
      const b = await readValidatedBody(req, res, 'login');
      if (b === null) return;
      const user = USERS.find(u => u.username === b.username && u.password === b.password);
      if (!user) {
        appendSecurityLog('failed_login', { clientIp, username: b.username || '' });
        return j(res, 401, { error: 'Invalid credentials' });
      }
      const t = mkToken();
      SESSIONS.set(t, { username: user.username, role: user.role, display: user.display, createdAt: Date.now(), expiresAt: Date.now() + securityConfig.sessionTtlMs });
      persistSessions();
      appendAuditLog('login_succeeded', { username: user.username, role: user.role, clientIp });
      return j(res, 200, { ok: true, token: t, role: user.role, display: user.display });
    }

    /* ── LOGOUT ── */
    if (p === '/api/logout' && m === 'POST') {
      const t = req.headers['x-editor-token'] || '';
      SESSIONS.delete(t);
      persistSessions();
      appendAuditLog('logout', { clientIp, token: t ? '[redacted]' : '' });
      return j(res, 200, { ok: true });
    }

    /* ── SESSION CHECK ── */
    if (p === '/api/status') {
      const s = getSession(req);
      return j(res, 200, { ok: true, authed: !!s, role: s?.role || null, display: s?.display || null });
    }

    if (p === '/api/health') {
      return j(res, 200, { ok: true, uptime: process.uptime().toFixed(2) });
    }

    /* ── PUBLIC CONFIG (Google Client ID — safe to expose, it's a public value) ── */
    if (p === '/api/config') {
      return j(res, 200, { google_client_id: process.env.GOOGLE_CLIENT_ID || '' });
    }

    /* ── GOOGLE OAUTH LOGIN ── */
    if (p === '/api/login/google' && m === 'POST') {
      const b = await readBody(req);
      if (!b.credential) return j(res, 400, { error: 'No credential provided' });
      try {
        const gRes  = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${b.credential}`);
        const info  = await gRes.json();
        if (info.error || !info.email) return j(res, 401, { error: 'Invalid Google token' });
        if (info.email_verified !== 'true' && info.email_verified !== true)
          return j(res, 401, { error: 'Google email not verified' });
        const users = readUsers();
        const user  = users.find(u => u.email === info.email && u.active !== false);
        if (!user) return j(res, 403, { error: 'Access not granted. Ask your administrator to add your Gmail address.' });
        const t = mkToken();
        SESSIONS.set(t, { username: info.email, role: user.role || 'team', display: user.name || info.name || info.email });
        persistSessions();
        return j(res, 200, { ok: true, token: t, role: user.role || 'team', display: user.name || info.name || info.email });
      } catch (e) {
        return j(res, 500, { error: 'Could not verify with Google: ' + e.message });
      }
    }

    /* Auth gate for all remaining API routes */
    if (!isAuthed(req)) return j(res, 401, { error: 'Unauthorized' });

    const rateLimit = apiLimiter(clientIp);
    if (!rateLimit.allowed) {
      appendSecurityLog('api_rate_limited', { clientIp, path: p });
      return j(res, 429, { error: 'Too many requests' });
    }

    const session = getSession(req);

    /* ═══════════════════════════════════════════════════════════════
       BLOGS  (available to both roles)
       ═══════════════════════════════════════════════════════════════ */

    /* GET all blogs */
    if (p === '/api/blogs' && m === 'GET') {
      return j(res, 200, readData('blogs'));
    }

    /* CREATE blog post */
    if (p === '/api/blogs/new' && m === 'POST') {
      const b  = await readValidatedBody(req, res, 'blogs.create');
      if (b === null) return;
      const blogs = readData('blogs');
      const slug = slugify(b.slug || b.title || 'untitled-' + Date.now());

      if (blogs.find(x => x.slug === slug)) {
        return j(res, 409, { error: 'A post with this slug already exists' });
      }

      const post = {
        slug,
        title:        b.title        || '',
        excerpt:      b.excerpt       || '',
        cover_image:  b.cover_image   || '',
        date:         b.date          || new Date().toISOString().split('T')[0],
        author:       b.author        || 'AKA Digital Team',
        author_title: b.author_title  || 'AKA Digital',
        category:     b.category      || 'MarTech',
        tags:         Array.isArray(b.tags) ? b.tags : (b.tags || '').split(',').map(t => t.trim()).filter(Boolean),
        read_time:    parseInt(b.read_time) || 5,
        featured:     !!b.featured,
        body_html:    b.body_html     || '',
      };

      blogs.unshift(post); // newest first
      writeData('blogs', blogs);
      writeBlogNjk(post.slug);
      return j(res, 200, { ok: true, slug: post.slug });
    }

    /* UPDATE blog post */
    if (p.startsWith('/api/blogs/') && m === 'PUT') {
      const slug  = p.replace('/api/blogs/', '');
      const blogs = readData('blogs');
      const idx   = blogs.findIndex(x => x.slug === slug);
      if (idx === -1) return j(res, 404, { error: 'Post not found' });
      const b = await readValidatedBody(req, res, 'blogs.update');
      if (b === null) return;
      blogs[idx] = { ...blogs[idx], ...b, slug }; // preserve slug
      writeData('blogs', blogs);
      return j(res, 200, { ok: true });
    }

    /* DELETE blog post (super admin only) */
    if (p.startsWith('/api/blogs/') && m === 'DELETE') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const slug  = p.replace('/api/blogs/', '');
      const blogs = readData('blogs').filter(x => x.slug !== slug);
      writeData('blogs', blogs);
      deleteBlogNjk(slug);
      return j(res, 200, { ok: true });
    }

    /* ═══════════════════════════════════════════════════════════════
       EVENTS  (available to both roles)
       ═══════════════════════════════════════════════════════════════ */

    /* GET all events */
    if (p === '/api/events' && m === 'GET') {
      return j(res, 200, readData('events'));
    }

    /* CREATE event */
    if (p === '/api/events/new' && m === 'POST') {
      const b      = await readValidatedBody(req, res, 'events.create');
      if (b === null) return;
      const events = readData('events');
      const slug   = slugify(b.slug || b.title || 'event-' + Date.now());

      if (events.find(x => x.slug === slug)) {
        return j(res, 409, { error: 'An event with this slug already exists' });
      }

      const event = {
        slug,
        title:       b.title       || '',
        description: b.description || '',
        date:        b.date        || new Date().toISOString().split('T')[0],
        location:    b.location    || '',
        type:        b.type        || 'Event',
        image:       b.image       || '',
        href:        b.href        || '/contact',
        featured:    !!b.featured,
      };

      events.unshift(event);
      writeData('events', events);
      return j(res, 200, { ok: true, slug: event.slug });
    }

    /* UPDATE event */
    if (p.startsWith('/api/events/') && m === 'PUT') {
      const slug   = p.replace('/api/events/', '');
      const events = readData('events');
      const idx    = events.findIndex(x => x.slug === slug);
      if (idx === -1) return j(res, 404, { error: 'Event not found' });
      const b = await readValidatedBody(req, res, 'events.update');
      if (b === null) return;
      events[idx] = { ...events[idx], ...b, slug };
      writeData('events', events);
      return j(res, 200, { ok: true });
    }

    /* DELETE event (super admin only) */
    if (p.startsWith('/api/events/') && m === 'DELETE') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const slug   = p.replace('/api/events/', '');
      const events = readData('events').filter(x => x.slug !== slug);
      writeData('events', events);
      return j(res, 200, { ok: true });
    }

    /* ═══════════════════════════════════════════════════════════════
       CASE STUDIES  (team can create/edit; super can delete)
       ═══════════════════════════════════════════════════════════════ */

    if (p === '/api/case-studies' && m === 'GET') {
      return j(res, 200, readData('case_studies'));
    }

    if (p === '/api/case-studies/new' && m === 'POST') {
      const b  = await readValidatedBody(req, res, 'case_studies.create');
      if (b === null) return;
      const cs = readData('case_studies');
      const slug = slugify(b.slug || b.title || 'case-' + Date.now());
      if (cs.find(x => x.slug === slug)) return j(res, 409, { error: 'Slug already exists' });
      const entry = {
        slug,
        client:         b.client         || '',
        industry:       b.industry        || '',
        country:        b.country         || '',
        year:           parseInt(b.year)  || new Date().getFullYear(),
        award:          b.award           || '',
        featured:       !!b.featured,
        featured_home:  !!b.featured_home,
        category:       b.category        || 'crm-automation',
        category_label: b.category_label  || '',
        title:          b.title           || '',
        summary:        b.summary         || '',
        cover_image:    b.cover_image     || '',
        video_youtube:  b.video_youtube   || '',
        video_thumbnail:b.video_thumbnail || '',
        video_cover:    b.video_cover     || '',
        solutions_used: Array.isArray(b.solutions_used) ? b.solutions_used : [],
        challenge:      b.challenge       || '',
        approach:       b.approach        || '',
        outcome:        b.outcome         || '',
        results:        Array.isArray(b.results) ? b.results : [],
        testimonial:    b.testimonial     || '',
        tags:           Array.isArray(b.tags) ? b.tags : (b.tags || '').split(',').map(t => t.trim()).filter(Boolean),
      };
      cs.unshift(entry);
      writeData('case_studies', cs);
      return j(res, 200, { ok: true, slug: entry.slug });
    }

    if (p.startsWith('/api/case-studies/') && m === 'PUT') {
      const slug = p.replace('/api/case-studies/', '');
      const cs   = readData('case_studies');
      const idx  = cs.findIndex(x => x.slug === slug);
      if (idx === -1) return j(res, 404, { error: 'Case study not found' });
      const b = await readValidatedBody(req, res, 'case_studies.update');
      if (b === null) return;
      cs[idx] = { ...cs[idx], ...b, slug };
      writeData('case_studies', cs);
      return j(res, 200, { ok: true });
    }

    if (p.startsWith('/api/case-studies/') && m === 'DELETE') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const slug = p.replace('/api/case-studies/', '');
      writeData('case_studies', readData('case_studies').filter(x => x.slug !== slug));
      return j(res, 200, { ok: true });
    }

    /* ═══════════════════════════════════════════════════════════════
       JOBS / CAREERS  (team can create/edit; super can delete)
       ═══════════════════════════════════════════════════════════════ */

    if (p === '/api/jobs' && m === 'GET') {
      return j(res, 200, readData('jobs'));
    }

    if (p === '/api/jobs/new' && m === 'POST') {
      const b    = await readValidatedBody(req, res, 'jobs.create');
      if (b === null) return;
      const jobs = readData('jobs');
      const slug = slugify(b.slug || b.title || 'job-' + Date.now());
      if (jobs.find(x => x.slug === slug)) return j(res, 409, { error: 'Slug already exists' });
      const entry = {
        slug,
        title:       b.title        || '',
        location:    b.location     || '',
        type:        b.type         || 'Full-time',
        department:  b.department   || '',
        description: b.description  || '',
        requirements: Array.isArray(b.requirements) ? b.requirements
                      : (b.requirements || '').split('\n').map(r => r.trim()).filter(Boolean),
        apply_email: b.apply_email  || 'Hello@akadigital.net',
        active:      b.active !== false,
      };
      jobs.push(entry);
      writeData('jobs', jobs);
      return j(res, 200, { ok: true, slug: entry.slug });
    }

    if (p.startsWith('/api/jobs/') && m === 'PUT') {
      const slug = p.replace('/api/jobs/', '');
      const jobs = readData('jobs');
      const idx  = jobs.findIndex(x => x.slug === slug);
      if (idx === -1) return j(res, 404, { error: 'Job not found' });
      const b = await readValidatedBody(req, res, 'jobs.update');
      if (b === null) return;
      if (b.requirements && !Array.isArray(b.requirements)) {
        b.requirements = b.requirements.split('\n').map(r => r.trim()).filter(Boolean);
      }
      jobs[idx] = { ...jobs[idx], ...b, slug };
      writeData('jobs', jobs);
      return j(res, 200, { ok: true });
    }

    if (p.startsWith('/api/jobs/') && m === 'DELETE') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const slug = p.replace('/api/jobs/', '');
      writeData('jobs', readData('jobs').filter(x => x.slug !== slug));
      return j(res, 200, { ok: true });
    }

    /* ═══════════════════════════════════════════════════════════════
       CMS SETTINGS  (super admin only — webhook URLs, platform URLs)
       ═══════════════════════════════════════════════════════════════ */

    if (p === '/api/settings' && m === 'GET') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      return j(res, 200, readData('cms_settings'));
    }

    if (p === '/api/settings' && m === 'PUT') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const b       = await readValidatedBody(req, res, 'settings.update');
      if (b === null) return;
      const current = readData('cms_settings');
      const updated = { ...current, ...b };
      writeData('cms_settings', updated);
      return j(res, 200, { ok: true });
    }

    /* ═══════════════════════════════════════════════════════════════
       SITE SETTINGS — CTA links + popup content (super admin only)
       ═══════════════════════════════════════════════════════════════ */

    if (p === '/api/site-settings' && m === 'GET') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      return j(res, 200, readData('settings'));
    }

    if (p === '/api/site-settings' && m === 'PUT') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const b       = await readValidatedBody(req, res, 'site_settings.update');
      if (b === null) return;
      const current = readData('settings');
      const updated = { ...current, cta: { ...current.cta, ...b.cta }, popup: { ...current.popup, ...b.popup, bullets: b.popup.bullets || current.popup.bullets } };
      writeData('settings', updated);
      return j(res, 200, { ok: true });
    }

    /* ═══════════════════════════════════════════════════════════════
       GOOGLE USER MANAGEMENT  (super admin only)
       ═══════════════════════════════════════════════════════════════ */

    if (p === '/api/users' && m === 'GET') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      return j(res, 200, readUsers());
    }

    if (p === '/api/users/new' && m === 'POST') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const b     = await readValidatedBody(req, res, 'users.create');
      if (b === null) return;
      const email = (b.email || '').toLowerCase().trim();
      if (!email || !email.includes('@')) return j(res, 400, { error: 'Valid email required' });
      const users = readUsers();
      if (users.find(u => u.email === email)) return j(res, 409, { error: 'Email already exists' });
      users.push({ email, name: b.name || '', role: b.role || 'team', active: true });
      writeUsers(users);
      return j(res, 200, { ok: true });
    }

    if (p.startsWith('/api/users/') && m === 'PUT') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const email = decodeURIComponent(p.replace('/api/users/', ''));
      const users = readUsers();
      const idx   = users.findIndex(u => u.email === email);
      if (idx === -1) return j(res, 404, { error: 'User not found' });
      const b = await readValidatedBody(req, res, 'users.update');
      if (b === null) return;
      users[idx] = { ...users[idx], ...b, email };
      writeUsers(users);
      return j(res, 200, { ok: true });
    }

    if (p.startsWith('/api/users/') && m === 'DELETE') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const email = decodeURIComponent(p.replace('/api/users/', ''));
      writeUsers(readUsers().filter(u => u.email !== email));
      return j(res, 200, { ok: true });
    }

    /* ═══════════════════════════════════════════════════════════════
       SUPER ADMIN ONLY — all other data files
       ═══════════════════════════════════════════════════════════════ */

    /* Get all _data JSON files */
    if (p === '/api/data' && m === 'GET') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const out = {};
      fs.readdirSync(DATA).filter(f => f.endsWith('.json') && !f.startsWith('_')).forEach(f => {
        try { out[f.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch {}
      });
      return j(res, 200, out);
    }

    /* Update a specific data field by dot-path */
    if (p.startsWith('/api/data/') && m === 'POST') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const file = path.join(DATA, p.replace('/api/data/', '') + '.json');
      if (!fs.existsSync(file)) return j(res, 404, { error: 'File not found' });
      const b = await readValidatedBody(req, res, 'data.update');
      if (b === null) return;
      try {
        const obj  = JSON.parse(fs.readFileSync(file, 'utf8'));
        const keys = (b.path || '').split('.').filter(Boolean);
        let ref = obj;
        keys.slice(0, -1).forEach(k => { if (typeof ref[k] === 'object') ref = ref[k]; });
        ref[keys[keys.length - 1]] = b.value;
        fs.writeFileSync(file, JSON.stringify(obj, null, 2));
        return j(res, 200, { ok: true });
      } catch (e) { return j(res, 500, { error: e.message }); }
    }

    /* ═══════════════════════════════════════════════════════════════
       VISUAL EDITOR (both roles can view, super can approve)
       ═══════════════════════════════════════════════════════════════ */

    if (p === '/api/edits' && m === 'GET')  return j(res, 200, loadEdits());

    if (p === '/api/edits' && m === 'POST') {
      const b = await readValidatedBody(req, res, 'edits.save');
      if (b === null) return;
      const e = loadEdits();
      e.pending = b.changes || [];
      e.lastSaved = new Date().toISOString();
      saveEdits(e);
      return j(res, 200, { ok: true, count: e.pending.length });
    }

    if (p === '/api/edits/clear' && m === 'POST') {
      const e = loadEdits(); e.pending = []; saveEdits(e);
      return j(res, 200, { ok: true });
    }

    if (p === '/api/approve' && m === 'POST') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const e = loadEdits();
      e.approved = [...(e.approved || []), ...e.pending];
      e.pending  = [];
      e.lastApproved = new Date().toISOString();
      saveEdits(e);
      return j(res, 200, { ok: true, total: e.approved.length });
    }

    if (p === '/api/approve/revert' && m === 'POST') {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
      const b = await readValidatedBody(req, res, 'edits.revert');
      if (b === null) return;
      const e = loadEdits();
      e.approved = (e.approved || []).filter(x => x.id !== b.id);
      saveEdits(e);
      return j(res, 200, { ok: true });
    }

    /* ═══════════════════════════════════════════════════════════════
       IMAGE UPLOAD (both roles)
       ═══════════════════════════════════════════════════════════════ */

    if (p === '/api/upload' && m === 'POST') {
      const ct = (req.headers['content-type'] || '').split(';')[0].trim();
      if (ct === 'application/json') {
        const b = await readValidatedBody(req, res, 'upload.json');
        if (b === null) return;
        if (!b.base64 || !b.filename) return j(res, 400, { error: 'Missing base64/filename' });
        const ext  = path.extname(b.filename) || '.jpg';
        const name = `upload-${Date.now()}${ext}`;
        fs.writeFileSync(path.join(UPLOADS, name), Buffer.from(b.base64.replace(/^data:[^;]+;base64,/, ''), 'base64'));
        return j(res, 200, { ok: true, url: `/images/uploads/${name}` });
      }
      const boundary = (req.headers['content-type'] || '').split('boundary=')[1];
      if (!boundary) return j(res, 400, { error: 'No boundary' });
      const { files } = await readMultipart(req, boundary);
      const file = files.image;
      if (!file) return j(res, 400, { error: 'No image field' });
      const ext  = path.extname(file.filename) || '.jpg';
      const name = `upload-${Date.now()}${ext}`;
      fs.writeFileSync(path.join(UPLOADS, name), file.data);
      return j(res, 200, { ok: true, url: `/images/uploads/${name}` });
    }

    /* ═══════════════════════════════════════════════════════════════
       BUILD + EXPORT  (both roles)
       ═══════════════════════════════════════════════════════════════ */

    if (p === '/api/build' && (m === 'POST' || m === 'GET')) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
      res.write(`data: ${JSON.stringify({ status: 'building', msg: 'Running npm run build...' })}\n\n`);
      exec('npm run build', { cwd: ROOT, env: EXEC_ENV }, (err, stdout, stderr) => {
        if (err) res.write(`data: ${JSON.stringify({ status: 'error', msg: (stderr || err.message).slice(0, 800) })}\n\n`);
        else     res.write(`data: ${JSON.stringify({ status: 'done',  msg: 'Build complete! Site is live.' })}\n\n`);
        res.end();
      });
      return;
    }

    /* Export ZIP for Hostinger */
    if (p === '/api/export' && (m === 'POST' || m === 'GET')) {
      if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
        return j(res, 400, { error: 'Run build first' });
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
      res.write(`data: ${JSON.stringify({ status: 'building', msg: 'Packaging for Hostinger...' })}\n\n`);
      const date    = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const zipName = `akadigital-hostinger-deploy-${date}.zip`;
      fs.mkdirSync(path.join(ROOT, 'exports'), { recursive: true });
      const zipCmd = process.platform === 'win32'
        ? `powershell -Command "Compress-Archive -Force -Path dist\\* -DestinationPath exports\\${zipName}"`
        : `cd dist && zip -r ../exports/${zipName} .`;
      exec(zipCmd, { cwd: ROOT }, (err) => {
        if (err) res.write(`data: ${JSON.stringify({ status: 'error', msg: err.message.slice(0, 400) })}\n\n`);
        else     res.write(`data: ${JSON.stringify({ status: 'done',  msg: `ZIP ready: exports/${zipName}` })}\n\n`);
        res.end();
      });
      return;
    }

    /* ═══════════════════════════════════════════════════════════════
       DEPLOY TO HOSTINGER VIA FTP  (super admin only)
       Env vars required: FTP_HOST, FTP_USER, FTP_PASS
       Optional:          FTP_DIR (default: /public_html)
       ═══════════════════════════════════════════════════════════════ */

    if (p === '/api/deploy' && (m === 'POST' || m === 'GET')) {
      if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });

      const FTP_HOST = process.env.FTP_HOST || '';
      const FTP_USER = process.env.FTP_USER || '';
      const FTP_PASS = process.env.FTP_PASS || '';
      const FTP_DIR  = process.env.FTP_DIR  || '/public_html';

      if (!FTP_HOST || !FTP_USER || !FTP_PASS) {
        return j(res, 400, {
          error: 'FTP credentials not set. Add FTP_HOST, FTP_USER, FTP_PASS as environment variables in Render dashboard.',
        });
      }

      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
      const send = (status, msg) => res.write(`data: ${JSON.stringify({ status, msg })}\n\n`);

      send('building', 'Building site...');

      exec('npm run build', { cwd: ROOT, env: EXEC_ENV }, async (err, stdout, stderr) => {
        if (err) {
          send('error', 'Build failed: ' + (stderr || err.message).slice(0, 500));
          return res.end();
        }
        send('deploying', 'Build complete. Connecting to Hostinger FTP...');

        try {
          const ftp    = require('basic-ftp');
          const client = new ftp.Client(60000);
          client.ftp.verbose = false;

          await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASS, secure: false });
          send('deploying', 'Connected. Uploading files to ' + FTP_DIR + '...');

          await client.ensureDir(FTP_DIR);
          await client.uploadFromDir(path.join(ROOT, 'dist'), FTP_DIR);
          client.close();

          send('done', 'Live! Site deployed to akadigital.net');
        } catch (ftpErr) {
          send('error', 'FTP error: ' + ftpErr.message);
        }
        res.end();
      });
      return;
    }

    return j(res, 404, { error: 'Unknown API route' });
  }

  /* ── 4. Serve static site (dist/ + public/ fallback) ─────────────────── */
  let fp = resolveFile(p, DIST);

  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    const pub = resolveFile(p, PUBLIC);
    if (fs.existsSync(pub) && !fs.statSync(pub).isDirectory()) fp = pub;
  }

  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    const nf = path.join(DIST, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html' });
    return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : Buffer.from('<h1>404</h1>'));
  }

  const ext  = path.extname(fp);
  const data = fs.readFileSync(fp);

  if (ext === '.html') {
    const edits = loadEdits();
    let html = data.toString();
    html = applyApprovedEdits(html, edits.approved || []);
    html = html.replace('</body>', INJECT + '\n</body>');
    return reply(res, 200, html, 'text/html');
  }

  reply(res, 200, data, mime(ext));

}).listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       AKA Digital — CMS + Editor Server  v2.0           ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  🌐  Site:    http://localhost:${PORT}                      ║`);
  console.log(`║  🔑  Admin:   http://localhost:${PORT}/admin                ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Set ADMIN_USER/ADMIN_PASS and TEAM_USER/TEAM_PASS in the environment to customize credentials. ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Auto-build on startup so dist/ is always fresh after a deployment
  console.log('[startup] Running initial build...');
  exec('npm run build', { cwd: ROOT, env: EXEC_ENV }, (err, stdout, stderr) => {
    if (err) {
      console.error('[startup] Build failed:', stderr || err.message);
    } else {
      console.log('[startup] Build complete ✓');
    }
  });
});
