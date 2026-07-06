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
   AI_MODEL; defaults to claude-opus-4-8. */

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
  const client = new Anthropic();

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
  const stream = client.messages.stream({
    model: process.env.AI_MODEL || 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
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

module.exports = { generateBlogDraft, describeAiError };
