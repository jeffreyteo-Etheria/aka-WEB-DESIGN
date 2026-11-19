/* One-time content changes applied to the CMS store at server startup.

   CMS content (case studies, blogs…) lives in the CMS content store, not in
   Git — a repo edit to src/_data/case_studies.json never reaches the live
   site. When a change has to be made to that live content from code, it goes
   here as a migration: it runs on every startup but only acts while the old
   content is still present, so it is applied exactly once.

   Also exports REDIRECTS (old path → new path) for content whose URL changed. */

const fs = require('fs');
const path = require('path');

/* Replace text in every string of an object/array, recursively. */
function replaceDeep(value, pairs) {
  if (typeof value === 'string') {
    return pairs.reduce((s, [from, to]) => s.split(from).join(to), value);
  }
  if (Array.isArray(value)) return value.map(v => replaceDeep(v, pairs));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = replaceDeep(v, pairs);
    return out;
  }
  return value;
}

/* 2026-11 — "EU Holidays" case study becomes the generic "SG Travel Agency"
   (client name, all copy, URL and cover image name). Old URL redirects. */
const EU_OLD_SLUG = 'eu-holidays-influencer';
const EU_NEW_SLUG = 'sg-travel-agency-influencer';
const EU_NEW_TITLE = 'Inspiring Travel Dreams: A Travel KOL Campaign';
const EU_TEXT = [
  ['EU Holidays Travel', 'SG Travel Agency'],
  ["EU Holidays'", "SG Travel Agency's"],
  ['EU Holidays', 'SG Travel Agency'],
];
const EU_IMAGES = [
  ['/images/case-studies/eu-holidays-social.png', '/images/case-studies/sg-travel-agency-cover.jpg'],
];

function migrateEuHolidays(ctx) {
  const list = ctx.readData('case_studies');
  if (!Array.isArray(list)) return false;
  const idx = list.findIndex(c => c.slug === EU_OLD_SLUG);
  if (idx === -1) return false; // already migrated (or never existed)

  const entry = { ...replaceDeep(list[idx], EU_TEXT), slug: EU_NEW_SLUG, title: EU_NEW_TITLE };
  list[idx] = entry;
  ctx.writeData('case_studies', list);
  ctx.deleteCaseStudyNjk(EU_OLD_SLUG);
  ctx.writeCaseStudyNjk(EU_NEW_SLUG, entry);
  return true;
}

/* Swaps the old TikTok-screenshot cover for the new city backdrop — only
   once that image file has actually been deployed, so it can't break. */
function migrateSgTravelCover(ctx) {
  const list = ctx.readData('case_studies');
  if (!Array.isArray(list)) return false;
  const idx = list.findIndex(c => c.slug === EU_NEW_SLUG);
  if (idx === -1) return false;
  let entry = list[idx];
  let changed = false;
  for (const [from, to] of EU_IMAGES) {
    if (JSON.stringify(entry).includes(from) && fs.existsSync(path.join(ctx.publicDir, to))) {
      entry = replaceDeep(entry, [[from, to]]);
      changed = true;
    }
  }
  if (!changed) return false;
  list[idx] = entry;
  ctx.writeData('case_studies', list);
  return true;
}

const MIGRATIONS = [
  ['eu-holidays-to-sg-travel-agency', migrateEuHolidays],
  ['sg-travel-agency-cover-image', migrateSgTravelCover],
];

/* ctx: { readData, writeData, writeCaseStudyNjk, deleteCaseStudyNjk, publicDir }.
   Never throws — a failed migration must not stop the CMS from starting. */
function runContentMigrations(ctx) {
  const applied = [];
  for (const [name, fn] of MIGRATIONS) {
    try { if (fn(ctx)) applied.push(name); }
    catch (e) { console.error(`[migrations] ${name} failed:`, e.message); }
  }
  return applied;
}

const REDIRECTS = {
  [`/case-studies/${EU_OLD_SLUG}`]: `/case-studies/${EU_NEW_SLUG}/`,
  [`/case-studies/${EU_OLD_SLUG}/`]: `/case-studies/${EU_NEW_SLUG}/`,
};

module.exports = { runContentMigrations, REDIRECTS, replaceDeep };
