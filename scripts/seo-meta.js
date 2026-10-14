/* SEO + social share-card meta (title, description, og:image, BlogPosting
   schema) for every page. Blog posts created in the CMS get a stub page with
   no title/description front matter — their real content lives in
   blogs.json — so the meta has to be looked up from the post by postSlug,
   otherwise every shared link renders as a generic "AKA Digital" card.
   Shared by .eleventy.js and scripts/preview-renderer.js so the published
   site and the CMS preview can't diverge. */

const fs = require('fs');
const path = require('path');

// Default share image when a page/post has none (or one platforms can't show)
const DEFAULT_OG_IMAGE = '/images/logos/aka-logo-rec.png';

// LinkedIn, Facebook and X don't render AVIF or SVG share images
const UNSHAREABLE_IMAGE = /\.(avif|svg)(\?|#|$)/i;

const SHARE_CARD_DIR = path.join(__dirname, '..', 'public', 'images', 'blog', 'share');

/* A 1200x630 JPG made from a cover that doesn't work as a share image (AVIF,
   too small, wrong shape) lives at share/<cover file name>.jpg. Keyed by the
   cover, not the post, so replacing the cover in the CMS retires the card. */
function shareCard(cover) {
  if (!cover || /^https?:/i.test(cover)) return '';
  const name = path.basename(cover.split(/[?#]/)[0]).replace(/\.[^.]+$/, '') + '.jpg';
  return fs.existsSync(path.join(SHARE_CARD_DIR, name)) ? `/images/blog/share/${name}` : '';
}

function absUrl(siteUrl, p) {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  return String(siteUrl || '').replace(/\/$/, '') + (p.startsWith('/') ? p : '/' + p).replace(/ /g, '%20');
}

function plainText(s) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function clip(s, max) {
  return s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function isoDate(d) {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t) ? t.toISOString() : '';
}

/* Called from base.njk / blog-post.njk as
   seoMeta({ postSlug, blogs, settings, suggestions, title, description, url: page.url }).
   Precedence for posts: CMS SEO field → seo_suggestions.json → page front
   matter → post content. */
function seoMeta(o) {
  o = o || {};
  const s = o.settings || {};
  const site = s.siteUrl || '';
  const post = o.postSlug ? (o.blogs || []).find(b => b.slug === o.postSlug) : null;
  const sug = (post && o.suggestions && o.suggestions[post.slug]) || {};

  const title = (post && post.seo_title) || sug.title || o.title
    || (post && post.title ? `${post.title} | ${s.name || 'AKA Digital'}` : '')
    || s.name || '';
  const description = clip(plainText(
    (post && (post.seo_description || sug.description || post.excerpt)) || o.description || s.description
  ), 300);

  // Share image: CMS override → share card made from the cover → cover → site default
  let image = (post && (post.og_image || shareCard(post.cover_image) || post.cover_image)) || '';
  if (!image || UNSHAREABLE_IMAGE.test(image)) image = s.og_image || DEFAULT_OG_IMAGE;
  image = absUrl(site, image);

  const url = absUrl(site, o.url || '/');
  const meta = {
    title,
    description,
    image,
    imageAlt: post ? plainText(post.title) : (s.name || ''),
    url,
    type: post ? 'article' : 'website',
    published: post ? isoDate(post.date) : '',
    modified: post ? isoDate(post.updated_at || post.date) : '',
    author: post ? post.author || '' : '',
    section: post ? post.category || '' : '',
    tags: post && Array.isArray(post.tags) ? post.tags : [],
    schema: null,
  };

  if (post) {
    meta.schema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: clip(plainText(post.title), 110),
      description,
      image: [image],
      datePublished: meta.published || undefined,
      dateModified: meta.modified || undefined,
      author: post.author
        ? { '@type': 'Person', name: post.author, jobTitle: post.author_title || undefined }
        : { '@id': `${site}/#organization` },
      publisher: { '@id': `${site}/#organization` },
      isPartOf: { '@id': `${site}/#website` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      articleSection: post.category || undefined,
      keywords: meta.tags.length ? meta.tags.join(', ') : undefined,
      inLanguage: 'en',
    };
  }
  return meta;
}

// JSON for a <script type="application/ld+json"> block; escaping "<" stops a
// title containing "</script>" from breaking out of the tag
function jsonLd(v) {
  return JSON.stringify(v).replace(/</g, '\\u003c');
}

module.exports = { seoMeta, jsonLd };
