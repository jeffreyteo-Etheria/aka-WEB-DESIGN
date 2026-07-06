/* AKA Digital CMS — Shared admin utilities */

function getToken() { return localStorage.getItem('aka_cms_token') || ''; }

/* Redirect to login if not authenticated */
function requireAuth() {
  const tok = getToken();
  if (!tok) { location.href = '/admin'; return; }
  fetch('/api/status', { headers: { 'X-Editor-Token': tok } })
    .then(r => r.json())
    .then(d => { if (!d.authed) { localStorage.clear(); location.href = '/admin'; } })
    .catch(() => {});
}

/* Fetch wrapper — always attaches token, returns parsed JSON.
   On a 401 (session expired or server restarted since login), clear the
   stale token and send the user back to login with an explanation instead
   of leaving them stuck on a bare "Unauthorized" message. */
async function apiFetch(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'X-Editor-Token': getToken(), 'Content-Type': 'application/json' },
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  const data = await r.json();
  if (r.status === 401) {
    localStorage.clear();
    location.href = '/admin?expired=1';
  }
  return data;
}

/* Logout */
async function logout() {
  await apiFetch('/api/logout', 'POST');
  localStorage.clear();
  location.href = '/admin';
}

/* Runs a full site build, streaming progress into statusEl, then calls
   done(success, message). Chained after a Publish save so that the Publish
   button on each form is the single, final action that takes an article all
   the way to the live site — no separate Dashboard step. */
function buildAndReport(statusEl, done) {
  let finished = false;
  const es = new EventSource('/api/build?token=' + encodeURIComponent(getToken()));
  es.onmessage = ev => {
    try {
      const d = JSON.parse(ev.data);
      if (d.status === 'building') statusEl.textContent = '⏳ Saved — publishing to the live site…';
      if (d.status === 'done')  { finished = true; es.close(); done(true, d.msg); }
      if (d.status === 'error') { finished = true; es.close(); done(false, d.msg); }
    } catch {}
  };
  es.onerror = () => {
    es.close();
    if (!finished) done(false, 'Lost connection during the site rebuild. Your article IS saved — go to the Dashboard and click Build Site to finish publishing.');
  };
}

/* Slugify a string */
function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/* Upload an image file to /api/upload as multipart/form-data.
   Deliberately NOT sent through apiFetch/JSON+base64 — that path runs the
   payload through validatePayload()'s generic string-length cap (50,000
   chars, meant for text fields), which rejects almost any real photo once
   base64-encoded. Multipart has no such cap and skips the ~33% base64
   size bloat. Returns { ok, url } or { ok:false, error }. */
async function uploadImage(file, maxBytes = 10 * 1024 * 1024) {
  if (file.size > maxBytes) {
    return { ok: false, error: `Image too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)` };
  }
  const form = new FormData();
  form.append('image', file, file.name);
  const r = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'X-Editor-Token': getToken() },
    body: form,
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) { localStorage.clear(); location.href = '/admin?expired=1'; }
  if (!r.ok || !data.url) return { ok: false, error: data.error || 'Upload failed' };
  return { ok: true, url: data.url };
}
