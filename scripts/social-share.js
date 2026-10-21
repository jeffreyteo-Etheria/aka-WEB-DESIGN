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

module.exports = { buildSharePayload, sendToWebhook };
