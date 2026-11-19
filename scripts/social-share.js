/* Share a published blog post to LinkedIn / Facebook via a Make.com (or
   Zapier) webhook. The CMS never holds LinkedIn or Facebook credentials:
   it sends the post details and the accounts the editor ticked to the
   webhook, and the Make scenario — where the LinkedIn and Facebook
   connections live — does the posting.

   The accounts offered in the blog form come from src/_data/social_accounts.json.
   The webhook URL is the `social_webhook_url` CMS setting (CRM Hub →
   Social Publishing). */

const { seoMeta } = require('./seo-meta');

const TIMEOUT_MS = 15000;

/* Builds the JSON the Make scenario receives. `targets` are account ids;
   the scenario routes on them (e.g. targets contains "linkedin-sg"). */
function buildSharePayload({ post, blogs, settings, suggestions, accounts, targets, caption }) {
  const meta = seoMeta({
    postSlug: post.slug, blogs, settings, suggestions, url: `/blog/${post.slug}/`,
  });
  const chosen = accounts.filter(a => targets.includes(a.id));
  return {
    event: 'blog.published',
    targets: chosen.map(a => a.id),
    accounts: chosen,
    caption: caption || meta.description,
    post: {
      slug: post.slug,
      title: post.title,
      url: meta.url,
      description: meta.description,
      image: meta.image,
      author: post.author || '',
      date: post.date || '',
      category: post.category || '',
      tags: Array.isArray(post.tags) ? post.tags : [],
    },
  };
}

// 1200x630 "We're hiring" card used as the LinkedIn image for job posts
const HIRING_CARD = '/images/careers/we-are-hiring.jpg';
const HIRING_CARD_EXISTS = require('fs').existsSync(require('path').join(__dirname, '..', 'public', HIRING_CARD));

/* Same shape for a job opening, so the same Make scenario posts it: links to
   the job's card on the Careers page (#job-<slug>). */
function buildJobSharePayload({ job, settings, accounts, targets, caption }) {
  const meta = seoMeta({ settings, url: `/careers/#job-${job.slug}` });
  const chosen = accounts.filter(a => targets.includes(a.id));
  const where = [job.location, job.type].filter(Boolean).join(', ');
  const summary = String(job.description || '').replace(/\s+/g, ' ').trim();
  const short = summary.length > 220 ? summary.slice(0, 219).replace(/\s+\S*$/, '') + '…' : summary;
  return {
    event: 'job.published',
    targets: chosen.map(a => a.id),
    accounts: chosen,
    caption: caption || `We're hiring: ${job.title}${where ? ` — ${where}` : ''}.\n\n${short}\n\nApply: ${meta.url}`,
    post: {
      slug: job.slug,
      title: `We're hiring: ${job.title}`,
      url: meta.url,
      description: [where, short].filter(Boolean).join(' · ').slice(0, 300),
      image: HIRING_CARD_EXISTS ? `${String(settings.siteUrl || '').replace(/\/$/, '')}${HIRING_CARD}` : meta.image,
      author: 'AKA Digital',
      date: '',
      category: job.department || 'Careers',
      tags: ['Careers', 'Hiring'],
    },
  };
}

async function sendToWebhook(webhookUrl, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = (await r.text()).slice(0, 300);
    return { ok: r.ok, status: r.status, body: text };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { buildSharePayload, buildJobSharePayload, sendToWebhook };
