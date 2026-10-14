/* AI Writing Assistant — drafts blog articles from a title + brief via the
   Claude API. The editor reviews and edits the draft; nothing is published
   automatically (the draft lands in the form as a Draft, same as hand-written
   content).

   Data integrity is the design constraint here, not a nice-to-have: the
   system prompt forbids invented statistics, client names, case studies, or
   references. When the brief doesn't contain enough substance to write the
   requested article without fabricating, the model must return a
   `needs_info` list instead of an article — the UI shows that list to the
   editor as questions to answer.

   Auth: reads ANTHROPIC_API_KEY from the environment (set it in Hostinger
   hPanel → Node.js → Environment variables). Model can be overridden with
   AI_MODEL; defaults to claude-opus-5-5. */

const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are the content writer for AKA Digital, a B2B MarTech and digital marketing agency with offices in Singapore, Vietnam, Indonesia, and Korea, serving enterprise brands across Southeast Asia.

DATA INTEGRITY — HIGHEST PRIORITY. Accuracy takes precedence over completeness.
- Use ONLY facts, figures, numbers, names, and claims present in the editor's brief.
- NEVER invent statistics, percentages, market sizes, client names, case studies, quotes, awards, dates, or references. Never fabricate business metrics or attribute claims to "studies" or "industry data" that the brief does not provide.
- Explaining well-known marketing concepts in general, clearly non-numerical terms is fine; specific numbers and named examples are not, unless the brief supplies them.
- If the requested article cannot be written without specific information the brief does not provide, do not guess and do not fill the gap with plausible-sounding content. Return status "needs_info" and list each missing item as a short, specific question the editor can answer.

LEGAL — NON-NEGOTIABLE.
- AKA Digital's platform partnerships (Mixpanel, Salesforce, Oracle, CleverTap, MoEngage, and others) are exclusive ONLY in Vietnam. Across the rest of Southeast Asia, AKA Digital is licensed to operate — NOT exclusive. Never write or imply SEA-wide exclusivity.

OUTPUT REQUIREMENTS.
- body_html: clean HTML using only <p>, <h2>, <h3>, <ul>, <ol>, <li>, <blockquote>, <strong>, <em>, and <a> tags. No <h1> (the page template renders the title), no images, no inline styles, no scripts.
- Length: 600–1200 words unless the brief asks otherwise. Professional B2B tone; scannable structure with clear section headings.
- excerpt: 1–2 sentences, under 160 characters, summarizing the article for listing cards and search snippets.
- When returning status "needs_info": leave excerpt and body_html as empty strings, and put the specific questions in needs_info. When returning status "ok": leave needs_info as an empty array.`;

/* Structured-output schema — guarantees the response parses. `status`
   discriminates between a usable draft and a request for more information. */
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok', 'needs_info'] },
    excerpt: { type: 'string' },
    body_html: { type: 'string' },
    needs_info: { type: 'array', items: { type: 'string' } },
  },
  required: ['status', 'excerpt', 'body_html', 'needs_info'],
  additionalProperties: false,
};

async function generateBlogDraft({ title, category, brief }) {
  // Constructed lazily so a missing API key surfaces as a clear, catchable
  // error on this request rather than crashing the whole CMS at startup.
  // Trim: a key pasted into hPanel with a trailing space/newline would
  // otherwise produce an invalid auth header.
  const client = new Anthropic({ apiKey: (process.env.ANTHROPIC_API_KEY || '').trim() || undefined });

  const userPrompt = [
    `Write a blog article draft for the AKA Digital blog.`,
    ``,
    `Title: ${title}`,
    category ? `Category: ${category}` : null,
    ``,
    `Editor's brief (the ONLY source of facts you may use):`,
    brief && brief.trim() ? brief.trim() : '(no brief provided — if the title alone is not enough to write a fact-free conceptual article, return needs_info)',
  ].filter(l => l !== null).join('\n');

  // Streaming keeps the connection alive for the minutes a full article can
  // take; finalMessage() collects the complete response.
  // Opus 5.5 defaults to effort "medium"; "high" keeps long-form drafts at
  // full quality. fallbacks: "default" re-runs a safety-classifier decline on
  // a fallback model inside the same call instead of failing the draft.
  const stream = client.beta.messages.stream({
    model: process.env.AI_MODEL || 'claude-opus-5-5',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{ role: 'user', content: userPrompt }],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === 'refusal') {
    return { status: 'error', error: 'The AI declined this request. Rephrase the brief and try again.' };
  }
  if (message.stop_reason === 'max_tokens') {
    return { status: 'error', error: 'The draft ran too long and was cut off. Ask for a shorter article in the brief.' };
  }

  const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(text);
}

const SEO_SYSTEM_PROMPT = `You write search and social-share metadata for AKA Digital blog posts (B2B MarTech agency, Southeast Asia).

Return:
- seo_title: at most 60 characters. Lead with the main keyword or the specific brand/topic. Append " | AKA Digital" only if the whole title still fits in 60 characters. No clickbait, no ALL CAPS.
- seo_description: 120–155 characters. Say what the reader learns or gets, in plain active language. Include the main keyword naturally.

Use ONLY facts present in the post. Never add numbers, clients, or claims the post does not contain. AKA Digital's platform partnerships are exclusive only in Vietnam — never imply exclusivity elsewhere.`;

const SEO_SCHEMA = {
  type: 'object',
  properties: {
    seo_title: { type: 'string' },
    seo_description: { type: 'string' },
  },
  required: ['seo_title', 'seo_description'],
  additionalProperties: false,
};

/* Suggests an SEO title + meta description for the CMS "SEO & Social
   Sharing" fields. The editor reviews before publishing. */
async function suggestSeo({ title, excerpt, category, tags, body_html }) {
  const client = new Anthropic({ apiKey: (process.env.ANTHROPIC_API_KEY || '').trim() || undefined });
  const body = String(body_html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000);
  // Short structured output: effort "low" is plenty for two lines of copy.
  const message = await client.beta.messages.create({
    model: process.env.AI_MODEL || 'claude-opus-5-5',
    max_tokens: 4000,
    system: SEO_SYSTEM_PROMPT,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SEO_SCHEMA } },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{
      role: 'user',
      content: [
        `Post title: ${title}`,
        category ? `Category: ${category}` : null,
        tags && tags.length ? `Tags: ${[].concat(tags).join(', ')}` : null,
        excerpt ? `Excerpt: ${excerpt}` : null,
        body ? `Article text (truncated):\n${body}` : null,
      ].filter(Boolean).join('\n'),
    }],
  });
  if (message.stop_reason === 'refusal') {
    return { status: 'error', error: 'The AI declined this request. Write the SEO fields by hand.' };
  }
  if (message.stop_reason === 'max_tokens') {
    return { status: 'error', error: 'The AI response was cut off. Try again.' };
  }
  const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return { status: 'ok', ...JSON.parse(text) };
}

/* Maps SDK errors to a { httpStatus, error } pair with messages a
   non-technical CMS user can act on. */
function describeAiError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return { httpStatus: 500, error: 'AI is not configured correctly: the ANTHROPIC_API_KEY is invalid or revoked. Update it in Hostinger hPanel → Node.js → Environment variables.' };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { httpStatus: 429, error: 'AI is temporarily rate-limited. Wait a minute and try again.' };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { httpStatus: 502, error: 'Could not reach the AI service. Check the server\'s internet access and try again.' };
  }
  if (err instanceof Anthropic.APIError) {
    return { httpStatus: 502, error: 'AI request failed (' + (err.status || '?') + '): ' + err.message };
  }
  // The SDK throws a plain Error at construction when no credentials are
  // present ("Could not resolve authentication method...").
  if (/ANTHROPIC_API_KEY|authentication method|apiKey/i.test(err.message || '')) {
    return { httpStatus: 500, error: 'AI is not set up yet: add ANTHROPIC_API_KEY as an environment variable in Hostinger hPanel → Node.js, then restart the app.' };
  }
  if (err instanceof SyntaxError) {
    return { httpStatus: 502, error: 'The AI returned an unreadable draft. Try again.' };
  }
  return { httpStatus: 500, error: 'AI generation failed: ' + err.message };
}

module.exports = { generateBlogDraft, suggestSeo, describeAiError };
