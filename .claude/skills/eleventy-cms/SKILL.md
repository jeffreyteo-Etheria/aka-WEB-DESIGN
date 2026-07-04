---
name: eleventy-cms
description: Build a self-hosted CMS on top of Eleventy (11ty) — a pure Node.js admin server with JSON data files that lets non-technical users publish content without touching code. Invoke when adding new content types, new admin pages, new API routes, or extending the editor-server.js CMS for the AKA Digital site.
---

# Skill: Eleventy CMS — Content Management System

## What This Skill Does

This skill guides building and extending the AKA Digital CMS pattern:
- **Pure Node.js admin server** (`editor-server.js`) — no Express, no database
- **JSON data files** in `src/_data/` as the content store
- **Eleventy** rebuilds the static site when content changes
- **Role-based auth** (super / team) with in-memory sessions
- **Admin HTML pages** for each content type (Blog, Case Study, Event, Job, CRM Hub)

---

## When to Use This Skill

- Adding a new content type (e.g. Testimonials, Services, Press Releases)
- Adding a new admin page or form
- Extending an existing CRUD route
- Debugging the admin dashboard or API
- Setting up a new project using this same CMS pattern

---

## Architecture Summary

```
User edits in browser (akadigital.net/admin)
  ↓
editor-server.js receives API call
  ↓
Reads/writes src/_data/*.json
  ↓
npm run build triggered (Eleventy + Tailwind)
  ↓
dist/ folder updated
  ↓
Live site reflects changes immediately (same server)
```

---

## File Structure

```
project/
├── editor-server.js          ← CMS server (all API + admin + static serving)
├── editor/
│   └── admin/
│       ├── admin.css         ← shared admin styles
│       ├── admin.js          ← shared helpers (apiFetch, requireAuth, logout)
│       ├── login.html        ← login page
│       ├── dashboard.html    ← main hub with quick actions + content lists
│       ├── blog-form.html    ← Blog CRUD form
│       ├── case-study-form.html
│       ├── events-form.html
│       ├── job-form.html
│       └── crm-hub.html      ← CRM · Make.com · Social · Settings tabs
├── src/
│   ├── _data/
│   │   ├── blogs.json
│   │   ├── case_studies.json
│   │   ├── jobs.json
│   │   ├── events.json
│   │   └── cms_settings.json
│   └── careers.njk           ← example: data-driven from jobs.json
└── package.json              ← "start": "node editor-server.js"
```

---

## Step-by-Step: Add a New Content Type

### 1. Create the JSON data file

`src/_data/testimonials.json`
```json
[]
```

### 2. Add API routes in editor-server.js

Find the section `/* JOBS / CAREERS */` as a reference. Add after it:

```javascript
/* ═══════════════════════════════════════════════════════════════
   TESTIMONIALS
   ═══════════════════════════════════════════════════════════════ */

if (p === '/api/testimonials' && m === 'GET') {
  return j(res, 200, readData('testimonials'));
}

if (p === '/api/testimonials/new' && m === 'POST') {
  const b     = await readBody(req);
  const items = readData('testimonials');
  const slug  = b.slug || slugify(b.name || 'testimonial-' + Date.now());
  if (items.find(x => x.slug === slug)) return j(res, 409, { error: 'Slug exists' });
  const entry = {
    slug,
    name:    b.name    || '',
    title:   b.title   || '',
    company: b.company || '',
    quote:   b.quote   || '',
    avatar:  b.avatar  || '',
    featured: !!b.featured,
  };
  items.unshift(entry);
  writeData('testimonials', items);
  return j(res, 200, { ok: true, slug: entry.slug });
}

if (p.startsWith('/api/testimonials/') && m === 'PUT') {
  const slug  = p.replace('/api/testimonials/', '');
  const items = readData('testimonials');
  const idx   = items.findIndex(x => x.slug === slug);
  if (idx === -1) return j(res, 404, { error: 'Not found' });
  items[idx] = { ...items[idx], ...await readBody(req), slug };
  writeData('testimonials', items);
  return j(res, 200, { ok: true });
}

if (p.startsWith('/api/testimonials/') && m === 'DELETE') {
  if (!isSuper(req)) return j(res, 403, { error: 'Super admin only' });
  writeData('testimonials', readData('testimonials').filter(x => x.slug !== p.replace('/api/testimonials/', '')));
  return j(res, 200, { ok: true });
}
```

### 3. Create the admin form page

`editor/admin/testimonial-form.html` — copy `job-form.html` as a starting template.

Key sections every form needs:
```html
<!-- 1. Auth check -->
<script>requireAuth();</script>

<!-- 2. Edit mode detection -->
<script>
const params = new URLSearchParams(location.search);
const editSlug = params.get('edit');
if (editSlug) {
  // Load existing data and populate form fields
  apiFetch('/api/testimonials').then(items => {
    const item = items.find(x => x.slug === editSlug);
    if (item) { /* populate fields */ }
  });
}
</script>

<!-- 3. Form submit handler -->
<script>
document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = { name: ..., quote: ..., ... };
  const url  = editSlug ? `/api/testimonials/${editSlug}` : '/api/testimonials/new';
  const meth = editSlug ? 'PUT' : 'POST';
  const res  = await apiFetch(url, meth, data);
  if (res.ok) location.href = '/admin/dashboard';
});
</script>
```

### 4. Add to dashboard sidebar + list

In `dashboard.html`:
```html
<!-- Sidebar nav -->
<a href="/admin/testimonial-form" class="nav-item">
  <span class="nav-icon">❝</span> New Testimonial
</a>

<!-- Quick action card -->
<a href="/admin/testimonial-form" class="quick-card">
  <div class="quick-icon">❝</div>
  <div class="quick-label">Testimonial</div>
  <div class="quick-desc">Add a client quote</div>
</a>

<!-- List section -->
<section class="content-section">
  <div class="section-header">
    <h2>Testimonials</h2>
    <a href="/admin/testimonial-form" class="btn-sm">+ New</a>
  </div>
  <div id="testimonialList" class="content-list">
    <div class="loading">Loading…</div>
  </div>
</section>
```

```javascript
// In dashboard script
apiFetch('/api/testimonials').then(items => {
  const el = document.getElementById('testimonialList');
  if (!items?.length) { el.innerHTML = '<p class="empty">No testimonials yet.</p>'; return; }
  el.innerHTML = items.map(t => `
    <div class="list-item">
      <div class="list-item-info">
        <span class="list-item-title">${t.name} — ${t.company}</span>
        <span class="list-item-meta">${t.title}</span>
      </div>
      <div class="list-item-actions">
        <a href="/admin/testimonial-form?edit=${t.slug}" class="btn-xs">Edit</a>
        ${role === 'super' ? `<button class="btn-xs danger" onclick="delItem('testimonials','${t.slug}')">Delete</button>` : ''}
      </div>
    </div>`).join('');
});
```

### 5. Use in Nunjucks template

```njk
{% for item in testimonials %}
  {% if item.featured %}
    <blockquote>{{ item.quote }}</blockquote>
    <cite>{{ item.name }}, {{ item.title }} — {{ item.company }}</cite>
  {% endif %}
{% endfor %}
```

---

## Key Patterns Reference

### Reply helpers (editor-server.js)
```javascript
const j = (res, st, d) => reply(res, st, d, 'application/json');
const h = (res, st, d) => reply(res, st, d, 'text/html');
// reply() checks Buffer.isBuffer(data) — if Buffer, res.end(data) directly
```

### SSE (Server-Sent Events) for long operations
```javascript
res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
res.write(`data: ${JSON.stringify({ status: 'building', msg: 'Starting...' })}\n\n`);
// ... do work ...
res.write(`data: ${JSON.stringify({ status: 'done', msg: 'Complete!' })}\n\n`);
res.end();
```

Client-side (EventSource):
```javascript
const es = new EventSource('/api/build');
es.onmessage = ev => {
  const d = JSON.parse(ev.data);
  logEl.textContent += d.msg + '\n';
  if (d.status === 'done' || d.status === 'error') es.close();
};
```

### Image upload
POST to `/api/upload` with `{ base64: "data:image/...", filename: "photo.jpg" }`
Returns `{ ok: true, url: "/images/uploads/upload-1234567890.jpg" }`

### Toggle (active/featured) fields
```html
<label class="toggle-group">
  <input type="checkbox" id="active" class="toggle-switch">
  <span class="toggle-slider"></span>
  Active
</label>
```
```javascript
// Read: document.getElementById('active').checked
// Write: document.getElementById('active').checked = item.active
// Send: { active: document.getElementById('active').checked }
```

---

## Role Access Matrix

| Action | super | team |
|---|---|---|
| View dashboard | ✓ | ✓ |
| Create content | ✓ | ✓ |
| Edit content | ✓ | ✓ |
| Delete content | ✓ | ✗ |
| CRM Hub | ✓ | ✓ |
| Settings tab | ✓ | ✗ |
| Publish Live (FTP) | ✓ | ✗ |
| Build Site | ✓ | ✓ |

---

## CMS Settings (cms_settings.json)

All webhook and platform URLs live here — editable from the Settings tab in CRM Hub:
- `webhook_url` — Google Apps Script (contact form)
- `make_webhook_url` — Make.com automation
- `google_sheet_url` — CRM Google Sheet
- `ads_platform_url`, `socialmind_url`, `geomind_url`, `adsmind_url`, `crmmind_url` — platform links

Read in Nunjucks: `{{ cms_settings.webhook_url }}`

---

## Build & Start Commands

```bash
npm run build   # Tailwind CSS + Eleventy → dist/
npm start       # node editor-server.js (port 3001 or $PORT)
npm run dev     # local dev with CSS watch + eleventy watch
```

---

## Hostinger Node.js Deployment

1. hPanel → Git → connect `jeffreyteo-Etheria/aka-WEB-DESIGN` → deploy to `/akadigital-cms`
2. hPanel → Node.js → Create App:
   - Root: `/akadigital-cms`
   - Startup: `editor-server.js`
   - URL: `akadigital.net`
3. Node.js console: `npm install` then `npm run build`
4. Upload images via FTP to `/akadigital-cms/public/images/` (252 MB, one-time)
5. Admin dashboard is accessed directly at `akadigital.net/admin` (no separate subdomain — a Hostinger `admin.akadigital.net` subdomain was tried and abandoned because it required a subfolder inside the main site's shared `public_html`, which collided with the live `/admin` path)
6. FTP deploy env vars (for Publish Live button): `FTP_HOST`, `FTP_USER`, `FTP_PASS`, `FTP_DIR=/public_html`
