/* Share on LinkedIn / Facebook — shared by the blog and job editors.

   SharePanel.mount({ container, apiBase, getSlug, noun, captionPlaceholder })
   renders the account checkboxes + caption into `container` and returns
   { setHistory(shares), afterPublish(statusEl) }.

   Nothing is ever posted automatically. After Publish, afterPublish() shows
   a preview of exactly what would be sent; "Approve & post" then requires
   signing in again (Google or team/admin password) before the server sends
   it to the Make.com webhook. The server enforces all of this too. */
(function () {
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let cmsConfig = null;

  function mount({ container, apiBase, getSlug, noun = 'post', captionPlaceholder = 'Caption for the social post.' }) {
    container.innerHTML =
      '<label>Share on LinkedIn &amp; Facebook <span style="font-weight:400;opacity:.7">(optional — after Publish you’ll see a preview and must click “Approve &amp; post” and confirm your sign-in before anything is posted)</span></label>' +
      '<div data-accounts style="display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin:8px 0 12px;"></div>' +
      '<textarea data-caption rows="3" maxlength="2900" placeholder="' + esc(captionPlaceholder) + '"></textarea>' +
      '<label data-repost-wrap style="display:none;font-weight:400;font-size:13px;margin-top:8px;text-transform:none;letter-spacing:normal;">' +
        '<input type="checkbox" data-repost style="width:auto;height:auto;margin:0 6px 0 0;" /> Share again to accounts this ' + esc(noun) + ' was already shared to</label>' +
      '<div data-hint class="hint" style="font-size:12.5px;margin-top:6px;"></div>';
    const $ = sel => container.querySelector(sel);
    let accounts = [], configured = false, history = [];
    const label = id => { const a = accounts.find(x => x.id === id); return a ? a.network + ' — ' + a.label : id; };

    function renderHint() {
      let html = configured ? '' :
        '<span style="color:#d97706">⚠ Not set up yet — a Super Admin must add the Make.com webhook URL in CRM Hub → Social Publishing. Until then nothing is posted.</span><br/>';
      if (history.length) {
        html += 'Already shared: ' + history.map(sh =>
          esc(sh.targets.map(label).join(', ')) + ' (' + new Date(sh.at).toLocaleDateString() + ')').join('; ');
      }
      $('[data-hint]').innerHTML = html;
      $('[data-repost-wrap]').style.display = history.length ? 'block' : 'none';
    }

    apiFetch('/api/social/accounts').then(r => {
      if (!r || r.error) return;
      accounts = r.accounts || [];
      configured = !!r.webhook_configured;
      const box = $('[data-accounts]');
      box.innerHTML = '';
      accounts.forEach(a => {
        const off = a.enabled === false;
        const l = document.createElement('label');
        // explicit resets: host forms style every label/input (uppercase, 100% width)
        l.style.cssText = 'display:flex;align-items:center;gap:8px;font-weight:500;font-size:14px;cursor:pointer;text-transform:none;letter-spacing:normal;width:auto;margin:0;color:inherit;' + (off ? 'opacity:.5;cursor:not-allowed;' : '');
        l.innerHTML = '<input type="checkbox" data-target value="' + esc(a.id) + '"' + (off ? ' disabled' : '') + ' style="width:auto;height:auto;margin:0;flex:none;" /> ' +
          '<span><strong>' + esc(a.network) + '</strong> — ' + esc(a.label) + (off ? ' <em>(' + esc(a.note || 'coming soon') + ')</em>' : '') + '</span>';
        box.appendChild(l);
      });
      renderHint();
    }).catch(() => {});

    async function afterPublish(statusEl) {
      const targets = [...container.querySelectorAll('[data-target]:checked')].map(c => c.value);
      const slug = getSlug();
      if (!targets.length || !slug) return;
      const url = apiBase + encodeURIComponent(slug) + '/share';
      const box = document.createElement('div');
      box.style.cssText = 'margin-top:10px;';
      box.textContent = '⏳ Preparing the LinkedIn post preview…';
      statusEl.appendChild(box);
      const request = { targets, caption: $('[data-caption]').value.trim(), repost: $('[data-repost]').checked };

      let pv;
      try {
        pv = await apiFetch(url, 'POST', { ...request, preview: true });
        if (!pv || pv.error) throw new Error(pv && pv.error || 'No response');
      } catch (e) {
        box.textContent = '⚠ Published, but the share preview failed: ' + e.message;
        box.style.color = '#dc2626';
        return;
      }
      if (!pv.preview) {
        box.textContent = 'Not shared — already posted to ' + pv.skipped.map(label).join(', ') + '. Tick “Share again” to repost.';
        return;
      }
      const p = pv.preview;
      box.style.cssText = 'margin-top:12px;padding:16px;border:2px solid #0a66c2;border-radius:12px;background:#fff;color:#1f2937;max-width:560px;';
      box.innerHTML =
        '<div style="font-weight:800;margin-bottom:6px;">Approve this LinkedIn post?</div>' +
        '<div style="font-size:13px;margin-bottom:10px;">Posting to: <strong>' + esc(p.targets.map(label).join(', ')) + '</strong>' +
          (pv.skipped.length ? ' · already shared, skipped: ' + esc(pv.skipped.map(label).join(', ')) : '') + '</div>' +
        '<div style="white-space:pre-wrap;font-size:14px;margin-bottom:10px;">' + esc(p.caption) + '</div>' +
        '<div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">' +
          '<img src="' + esc(p.post.image) + '" alt="" style="display:block;width:100%;aspect-ratio:1200/630;object-fit:cover;background:#f3f4f6;" />' +
          '<div style="padding:10px 12px;"><div style="font-weight:700;font-size:14px;">' + esc(p.post.title) + '</div>' +
          '<div style="font-size:12px;color:#6b7280;margin-top:2px;">' + esc(p.post.url.replace(/^https?:\/\//, '')) + '</div></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">' +
          '<button type="button" class="btn-publish" data-act="approve">✓ Approve &amp; post to LinkedIn</button>' +
          '<button type="button" class="btn-ghost" data-act="cancel">Don’t post</button>' +
        '</div>';
      const notPosted = () => {
        box.style.cssText = 'margin-top:8px;';
        box.textContent = 'Not posted to LinkedIn. You can share it later by ticking the account and clicking Publish again.';
      };
      box.querySelector('[data-act="cancel"]').addEventListener('click', notPosted);
      // Approve → second layer: sign in again before anything is sent
      box.querySelector('[data-act="approve"]').addEventListener('click', (ev) => {
        ev.target.disabled = true;
        showApprovalSignIn(box, notPosted, async (reauth) => {
          const r = await apiFetch(url, 'POST', { ...request, approved: true, reauth });
          if (!r || r.error) throw new Error(r && r.error || 'No response');
          if (r.sent.length) history.push({ at: new Date().toISOString(), targets: r.sent });
          container.querySelectorAll('[data-target]').forEach(c => { c.checked = false; });
          $('[data-repost]').checked = false;
          renderHint();
          box.style.cssText = 'margin-top:8px;color:#16a34a;';
          box.textContent = '✓ Approved and sent to ' + r.sent.map(label).join(', ') + '. It appears on LinkedIn within a minute.';
        });
      });
    }

    return {
      setHistory(shares) { history = Array.isArray(shares) ? shares : []; renderHint(); },
      afterPublish,
    };
  }

  /* "Confirm it's you" — `send(reauth)` posts and throws on failure;
     nothing is sent until a sign-in is submitted. */
  function showApprovalSignIn(box, onCancel, send) {
    const panel = document.createElement('div');
    panel.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px solid #e5e7eb;';
    panel.innerHTML =
      '<div style="font-weight:800;margin-bottom:4px;">Confirm it’s you</div>' +
      '<div style="font-size:13px;color:#4b5563;margin-bottom:10px;">Sign in again to approve this post. Nothing is posted until you confirm.</div>' +
      '<div data-g style="display:none;margin-bottom:10px;"><div data-gbtn></div></div>' +
      '<form data-pw style="display:none;gap:8px;flex-wrap:wrap;align-items:center;">' +
        '<input name="u" type="text" autocomplete="username" placeholder="Team / admin username" style="flex:1;min-width:160px;" />' +
        '<input name="p" type="password" autocomplete="current-password" placeholder="Password" style="flex:1;min-width:160px;" />' +
        '<button type="submit" class="btn-publish">Confirm &amp; post</button>' +
      '</form>' +
      '<button type="button" data-cancel class="btn-ghost" style="margin-top:8px;">Cancel — don’t post</button>' +
      '<div data-msg style="font-size:13px;margin-top:8px;"></div>';
    box.appendChild(panel);
    const msg = panel.querySelector('[data-msg]');
    const run = async (reauth) => {
      msg.style.color = '#4b5563';
      msg.textContent = 'Confirming and posting…';
      try { await send(reauth); }
      catch (e) { msg.style.color = '#dc2626'; msg.textContent = '⚠ ' + e.message; }
    };
    panel.querySelector('[data-cancel]').addEventListener('click', onCancel);
    const pwForm = panel.querySelector('[data-pw]');
    pwForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = pwForm.elements.u.value.trim(), p = pwForm.elements.p.value;
      if (!u || !p) { msg.style.color = '#dc2626'; msg.textContent = 'Enter your username and password.'; return; }
      pwForm.elements.p.value = '';
      run({ method: 'password', username: u, password: p });
    });

    (cmsConfig ? Promise.resolve(cmsConfig) : fetch('/api/config').then(r => r.json()).then(c => (cmsConfig = c)))
      .then(cfg => {
        if (cfg.password_login_enabled !== false) pwForm.style.display = 'flex';
        if (!cfg.google_client_id) return;
        panel.querySelector('[data-g]').style.display = 'block';
        const render = () => {
          google.accounts.id.initialize({
            client_id: cfg.google_client_id,
            callback: (resp) => run({ method: 'google', credential: resp.credential }),
            auto_select: false,
          });
          google.accounts.id.renderButton(panel.querySelector('[data-gbtn]'), {
            type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: 280,
          });
        };
        if (window.google?.accounts?.id) return render();
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.onload = render;
        document.head.appendChild(s);
      })
      .catch(() => { pwForm.style.display = 'flex'; });
  }

  window.SharePanel = { mount };
})();
