/* Content store — keeps CMS content alive across Hostinger Git deploys.

   Hostinger's Git deploy resets the app directory to the repo state, so
   anything the CMS wrote there (posts, events, jobs, uploads…) vanished on
   the next code push. When CMS_CONTENT_DIR points at a folder OUTSIDE the
   deploy directory (e.g. /home/<user>/cms-content), every CMS write is
   mirrored there, and on startup the mirror is copied back over the freshly
   deployed files before the initial build.

   The mirror is the source of truth for the files it holds: once a file is
   mirrored, later repo changes to that same file are ignored on the server.
   Files the CMS never wrote (partners.json, templates, code) still come from
   the repo as usual.

   Not set → every function is a no-op and behaviour is unchanged (local dev). */

const fs = require('fs');
const path = require('path');

/* "~/cms-content" expands to the server account's home folder, so hPanel
   users don't need to know their exact /home/<user> path. */
const RAW_DIR = (process.env.CMS_CONTENT_DIR || '').trim();
const DIR = RAW_DIR.startsWith('~/') ? path.join(require('os').homedir(), RAW_DIR.slice(2)) : RAW_DIR;
const SEEDED_MARKER = '.seeded';
const DELETED_FILE = '.deleted.json';

/* What the CMS writes: seeded into the mirror on first run. */
const SEED_FILES = [
  'src/_data/blogs.json', 'src/_data/case_studies.json', 'src/_data/cms_settings.json',
  'src/_data/contacts.json', 'src/_data/events.json', 'src/_data/jobs.json',
  'src/_data/settings.json', 'src/_data/team.json', 'src/_data/_edits.json',
];
const SEED_DIRS = ['src/blog', 'src/case-studies', 'public/images/uploads'];

let ROOT = null;
let ACTIVE = false;      // true only after a successful restore/seed
let LAST_ERROR = null;   // surfaced on /api/health so a bad path is diagnosable
const enabled = () => ACTIVE;
const rel = abs => path.relative(ROOT, abs).split(path.sep).join('/');

function readDeleted() {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, DELETED_FILE), 'utf8')); } catch { return []; }
}
function writeDeleted(list) {
  fs.writeFileSync(path.join(DIR, DELETED_FILE), JSON.stringify([...new Set(list)], null, 2));
}

function copyInto(srcAbs, destAbs) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.copyFileSync(srcAbs, destAbs);
}

function walk(dirAbs, out = []) {
  if (!fs.existsSync(dirAbs)) return out;
  for (const ent of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const p = path.join(dirAbs, ent.name);
    if (ent.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

/* Call once at startup, before the first build. Never throws: a bad
   CMS_CONTENT_DIR (wrong path, no permission) must not take the site down —
   protection just stays off and the error is reported. */
function restore(rootDir) {
  ROOT = rootDir;
  if (!DIR) return { enabled: false };
  if (!path.isAbsolute(DIR)) {
    LAST_ERROR = 'CMS_CONTENT_DIR must be an absolute path like ~/cms-content (got "' + DIR + '")';
    return { enabled: false, error: LAST_ERROR };
  }
  try {
    const result = restoreUnsafe();
    ACTIVE = true;
    return result;
  } catch (e) {
    LAST_ERROR = e.message;
    return { enabled: false, error: e.message };
  }
}

function restoreUnsafe() {
  fs.mkdirSync(DIR, { recursive: true });

  // First run: seed the mirror from what's deployed right now.
  if (!fs.existsSync(path.join(DIR, SEEDED_MARKER))) {
    let seeded = 0;
    for (const f of SEED_FILES) {
      const src = path.join(ROOT, f);
      if (fs.existsSync(src)) { copyInto(src, path.join(DIR, f)); seeded++; }
    }
    for (const d of SEED_DIRS) {
      for (const src of walk(path.join(ROOT, d))) { copyInto(src, path.join(DIR, rel(src))); seeded++; }
    }
    fs.writeFileSync(path.join(DIR, SEEDED_MARKER), new Date().toISOString());
    return { enabled: true, seeded };
  }

  // Later runs: put every mirrored file back, then re-apply CMS deletions.
  let restored = 0;
  for (const src of walk(DIR)) {
    const r = path.relative(DIR, src).split(path.sep).join('/');
    if (r === SEEDED_MARKER || r === DELETED_FILE) continue;
    copyInto(src, path.join(ROOT, r));
    restored++;
  }
  let removed = 0;
  for (const r of readDeleted()) {
    const target = path.join(ROOT, r);
    if (fs.existsSync(target)) { fs.unlinkSync(target); removed++; }
  }
  return { enabled: true, restored, removed };
}

/* Mirror a file the CMS just wrote. */
function persist(absPath) {
  if (!enabled()) return;
  try {
    const r = rel(absPath);
    copyInto(absPath, path.join(DIR, r));
    const del = readDeleted();
    if (del.includes(r)) writeDeleted(del.filter(x => x !== r));
  } catch (e) { console.error('[content-store] persist failed:', absPath, e.message); }
}

/* Record a file the CMS just deleted, so a deploy can't bring it back. */
function remove(absPath) {
  if (!enabled()) return;
  try {
    const r = rel(absPath);
    const mirrored = path.join(DIR, r);
    if (fs.existsSync(mirrored)) fs.unlinkSync(mirrored);
    writeDeleted([...readDeleted(), r]);
  } catch (e) { console.error('[content-store] remove failed:', absPath, e.message); }
}

module.exports = { restore, persist, remove, isEnabled: () => ACTIVE, lastError: () => LAST_ERROR };
