/* Live "as-is" preview rendering — reuses the real Eleventy/Nunjucks templates
   so a draft (unsaved) case study renders pixel-identical to what publishing
   will actually produce, without writing any files or running a full site
   build. Mirrors the filters/globals registered in .eleventy.js. */

const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

const ROOT     = path.join(__dirname, '..');
const SRC      = path.join(ROOT, 'src');
const INCLUDES = path.join(SRC, '_includes');
const DATA     = path.join(SRC, '_data');

const env = nunjucks.configure([INCLUDES, SRC], { autoescape: true });

env.addFilter('dateFormat', function (dateVal) {
  return new Date(dateVal).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
});
env.addFilter('phoneDigits', function (v) {
  return String(v || '').replace(/[^\d+]/g, '');
});
env.addFilter('nl2br', function (v) {
  return String(v || '').split('\n').map(function (l) {
    return l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }).join('<br/>');
});
env.addFilter('existingImages', function (val) {
  const ok = (p) => {
    if (!p || typeof p !== 'string') return false;
    if (/^https?:\/\//i.test(p)) return true;
    try { return fs.existsSync(path.join(ROOT, 'public', decodeURI(p.split('?')[0]))); }
    catch (e) { return false; }
  };
  if (Array.isArray(val)) return val.filter(ok);
  return ok(val) ? val : '';
});
env.addFilter('findBySlug', function (arr, slug) {
  return (arr || []).find(item => item.slug === slug);
});
env.addFilter('where', function (arr, key) {
  return (arr || []).filter(item => item[key]);
});
env.addFilter('first', function (arr, count) {
  if (count !== undefined) return (arr || []).slice(0, count);
  return (arr || [])[0];
});
env.addFilter('publishedOnly', function (arr) {
  return (arr || []).filter((item) => item.status === 'published');
});
env.addFilter('eventDateDisplay', function (ev) {
  if (ev.date_label) return ev.date_label;
  const d = ev.date ? new Date(ev.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  return ev.location ? `${d} — ${ev.location}` : d;
});
const { seoMeta, jsonLd } = require('./seo-meta');
env.addGlobal('seoMeta', seoMeta);
env.addFilter('jsonLd', jsonLd);
env.addGlobal('year', () => `${new Date().getFullYear()}`);

function readJson(name) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, name + '.json'), 'utf8')); }
  catch { return name === 'settings' ? {} : []; }
}

/* case-studies/template.njk is only ever reached via {% include %} from a
   per-slug wrapper file — Nunjucks include has no concept of frontmatter, so
   any --- block at the top of an included file renders as literal text. The
   template itself (correctly) no longer has one; strip defensively in case
   it's ever restored, so preview and production can't silently diverge. */
function stripFrontmatter(src) {
  return src.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

/* Every src/_data/*.json file, keyed by name — same global data Eleventy
   gives the layout (nav, footer contacts, cms_settings, …). */
function baseContext(pageUrl) {
  const ctx = {};
  for (const f of fs.readdirSync(DATA)) {
    if (f.endsWith('.json')) ctx[f.slice(0, -5)] = readJson(f.slice(0, -5));
  }
  ctx.page = { url: pageUrl };
  return ctx;
}

/* Wraps rendered inner-page HTML in the real base.njk layout (header, nav,
   footer, popups) — same layout every real page on the site uses. */
function renderInLayout(innerHtml, ctx) {
  return env.render('layouts/base.njk', { ...ctx, content: innerHtml });
}

/* Renders a case study exactly as it will appear once published, using the
   *draft* field values (not yet saved to case_studies.json). `draft` is the
   same shape as a case_studies.json entry. */
function renderCaseStudyPreview(draft) {
  const slug = draft.slug || '__preview__';
  const real = readJson('case_studies').filter(c => c.slug !== slug);
  const ctx = {
    ...baseContext(`/case-studies/${slug}/`),
    case_studies: [draft, ...real],
    studySlug: slug,
    isPreview: true,
    title: `${draft.client ? draft.client + ' — ' : ''}${draft.title || slug} | AKA Digital Case Study`,
    description: (draft.summary || '').slice(0, 300),
  };
  const templateSrc = stripFrontmatter(
    fs.readFileSync(path.join(INCLUDES, 'case-studies', 'template.njk'), 'utf8')
  );
  const inner = env.renderString(templateSrc, ctx);
  return renderInLayout(inner, ctx);
}

/* Renders a blog post exactly as it will appear once published, using the
   *draft* field values (not yet saved to blogs.json). */
function renderBlogPreview(draft) {
  const slug = draft.slug || '__preview__';
  const real = readJson('blogs').filter(b => b.slug !== slug);
  const ctx = {
    ...baseContext(`/blog/${slug}/`),
    blogs: [draft, ...real],
    postSlug: slug,
    isPreview: true,
  };
  const templateSrc = stripFrontmatter(
    fs.readFileSync(path.join(INCLUDES, 'layouts', 'blog-post.njk'), 'utf8')
  );
  const inner = env.renderString(templateSrc, ctx);
  return renderInLayout(inner, ctx);
}

/* Events and jobs have no individual detail page — they only ever show up
   inside a listing (Insights/homepage/blog for events, Careers for jobs).
   So "preview" here means: render that real listing page with the draft
   spliced in, status forced to 'published' just for this render (never
   written to disk) so it survives the same publishedOnly/active filters
   the real page uses — showing exactly where and how it will appear. */
function renderListingPreview(templateRelPath, pageUrl, dataKey, draft) {
  const slug = draft.slug || '__preview__';
  const real = readJson(dataKey).filter(item => item.slug !== slug);
  const ctx = {
    ...baseContext(pageUrl),
    [dataKey]: [{ ...draft, status: 'published' }, ...real],
  };
  const templateSrc = stripFrontmatter(fs.readFileSync(path.join(SRC, templateRelPath), 'utf8'));
  const inner = env.renderString(templateSrc, ctx);
  return renderInLayout(inner, ctx);
}

function renderEventPreview(draft) {
  return renderListingPreview('insights.njk', '/insights/', 'events', draft);
}

function renderJobPreview(draft) {
  return renderListingPreview('careers.njk', '/careers/', 'jobs', draft);
}

module.exports = { renderCaseStudyPreview, renderBlogPreview, renderEventPreview, renderJobPreview };
