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

/* Fetch wrapper — always attaches token, returns parsed JSON */
async function apiFetch(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'X-Editor-Token': getToken(), 'Content-Type': 'application/json' },
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  return r.json();
}

/* Logout */
async function logout() {
  await apiFetch('/api/logout', 'POST');
  localStorage.clear();
  location.href = '/admin';
}

/* Slugify a string */
function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/* Convert File to base64 string */
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
