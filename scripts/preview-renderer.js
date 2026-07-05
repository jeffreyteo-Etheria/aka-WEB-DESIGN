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

function baseContext(pageUrl) {
  return {
    settings:   readJson('settings'),
    navigation: readJson('navigation'),
    partners:   readJson('partners'),
    solutions:  readJson('solutions'),
    page: { url: pageUrl },
  };
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
    title: `${draft.client ? draft.client + ' — ' : ''}${draft.title || slug} | AKA Digital Case Study`,
    description: (draft.summary || '').slice(0, 300),
  };
  const templateSrc = stripFrontmatter(
    fs.readFileSync(path.join(INCLUDES, 'case-studies', 'template.njk'), 'utf8')
  );
  const inner = env.renderString(templateSrc, ctx);
  return renderInLayout(inner, ctx);
}

module.exports = { renderCaseStudyPreview };
