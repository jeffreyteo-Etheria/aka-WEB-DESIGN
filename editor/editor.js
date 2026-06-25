/**
 * AKA Digital — Visual Page Editor
 * Injected by editor-server.js into every page served on localhost:3001
 *
 * Features:
 *  • Password login
 *  • Edit any text inline (click to edit)
 *  • Replace any image (click image overlay)
 *  • Edit any link URL (double-click link)
 *  • Delete / hide any <section> or <div data-block>
 *  • Floating change counter + toolbar
 *  • Save Draft  → stores pending edits on server
 *  • Approve & Publish → promotes edits to approved (persisted across refreshes)
 *  • Rebuild trigger with live status
 */

(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────────────── */
  const API  = 'http://localhost:3001';
  const KEY  = 'aka_editor_token';
  const EKEY = 'aka_editor_mode';

  /* ── State ─────────────────────────────────────────────────────────── */
  let TOKEN   = localStorage.getItem(KEY) || '';
  let EDITING = false;
  let CHANGES = [];   // { id, type, selector, value, label }

  /* ── Utilities ─────────────────────────────────────────────────────── */

  const uid = () => Math.random().toString(36).slice(2, 10);

  function apiCall(method, endpoint, body) {
    return fetch(API + endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Editor-Token': TOKEN,
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then(r => r.json());
  }

  /* Build a unique CSS selector for any element */
  function getSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body) {
      let part = cur.tagName.toLowerCase();
      if (cur.id) { part = '#' + CSS.escape(cur.id); parts.unshift(part); break; }
      const siblings = Array.from(cur.parentElement?.children || []).filter(c => c.tagName === cur.tagName);
      if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(cur) + 1) + ')';
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function recordChange(type, el, value, label) {
    const selector = getSelector(el);
    const existing = CHANGES.findIndex(c => c.selector === selector && c.type === type);
    const entry    = { id: uid(), type, selector, value, label };
    if (existing >= 0) CHANGES[existing] = entry;
    else CHANGES.push(entry);
    updateToolbar();
  }

  /* ── DOM builder ───────────────────────────────────────────────────── */

  function el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    children.flat().forEach(c => e.append(typeof c === 'string' ? document.createTextNode(c) : c));
    return e;
  }

  /* ── Login Modal ───────────────────────────────────────────────────── */

  function showLogin() {
    const overlay = el('div', { id: 'aka-ed-login', class: 'aka-ed-overlay' },
      el('div', { class: 'aka-ed-modal' },
        el('div', { class: 'aka-ed-modal-logo' }, '✏️'),
        el('h2', { class: 'aka-ed-modal-title' }, 'AKA Digital Editor'),
        el('p',  { class: 'aka-ed-modal-sub'   }, 'Enter your admin password to enable visual editing'),
        el('input', {
          id: 'aka-ed-pass', type: 'password', class: 'aka-ed-input',
          placeholder: 'Password', autocomplete: 'current-password',
          onkeydown: e => { if (e.key === 'Enter') doLogin(); }
        }),
        el('p', { id: 'aka-ed-login-err', class: 'aka-ed-err', style: { display: 'none' } }, 'Wrong password — try again'),
        el('button', { class: 'aka-ed-btn-primary', onclick: doLogin }, 'Unlock Editor'),
        el('p',  { class: 'aka-ed-hint' }, 'Visual editing mode · localhost only')
      )
    );
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('aka-ed-pass')?.focus(), 100);
  }

  async function doLogin() {
    const pass = document.getElementById('aka-ed-pass')?.value || '';
    const btn  = document.querySelector('.aka-ed-btn-primary');
    if (btn) { btn.textContent = 'Checking...'; btn.disabled = true; }

    const r = await fetch(API + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass }),
    }).then(r => r.json()).catch(() => ({}));

    if (r.token) {
      TOKEN = r.token;
      localStorage.setItem(KEY, TOKEN);
      document.getElementById('aka-ed-login')?.remove();
      initEditor();
    } else {
      document.getElementById('aka-ed-login-err').style.display = '';
      if (btn) { btn.textContent = 'Unlock Editor'; btn.disabled = false; }
    }
  }

  /* ── Toolbar ───────────────────────────────────────────────────────── */

  let toolbarEl = null;

  function buildToolbar() {
    toolbarEl = el('div', { id: 'aka-ed-toolbar', class: 'aka-ed-toolbar' },
      el('div', { class: 'aka-ed-toolbar-left' },
        el('span', { class: 'aka-ed-logo' }, '✏️ AKA Editor'),
        el('span', { id: 'aka-ed-page-url', class: 'aka-ed-page-url' }, window.location.pathname)
      ),
      el('div', { class: 'aka-ed-toolbar-right' },
        el('button', {
          id: 'aka-ed-toggle',
          class: 'aka-ed-btn-toggle' + (EDITING ? ' active' : ''),
          onclick: toggleEditMode,
        }, EDITING ? '🔵 Editing ON' : '⚪ Editing OFF'),
        el('span', { id: 'aka-ed-count', class: 'aka-ed-count', style: { display: 'none' } }, '0 changes'),
        el('button', {
          id: 'aka-ed-save',
          class: 'aka-ed-btn-save',
          style: { display: 'none' },
          onclick: saveDraft,
        }, '💾 Save Draft'),
        el('button', {
          id: 'aka-ed-approve',
          class: 'aka-ed-btn-approve',
          style: { display: 'none' },
          onclick: approveChanges,
        }, '✅ Approve & Publish'),
        el('button', {
          id: 'aka-ed-build',
          class: 'aka-ed-btn-build',
          onclick: triggerBuild,
          title: 'Rebuild site (npm run build)',
        }, '🔨 Rebuild'),
        el('button', {
          class: 'aka-ed-btn-panel',
          onclick: toggleChangesPanel,
          title: 'View pending changes',
        }, '📋'),
        el('button', {
          class: 'aka-ed-btn-exit',
          onclick: logOut,
          title: 'Exit editor',
        }, '✕')
      )
    );
    document.body.insertBefore(toolbarEl, document.body.firstChild);
    document.body.style.paddingTop = '52px';
  }

  function updateToolbar() {
    const n   = CHANGES.length;
    const cnt = document.getElementById('aka-ed-count');
    const sav = document.getElementById('aka-ed-save');
    const apr = document.getElementById('aka-ed-approve');
    if (cnt) { cnt.textContent = n + ' change' + (n === 1 ? '' : 's'); cnt.style.display = n ? '' : 'none'; }
    if (sav) sav.style.display = n ? '' : 'none';
    if (apr) apr.style.display = n ? '' : 'none';
    renderChangesPanel();
  }

  function setStatus(msg, type) {
    let s = document.getElementById('aka-ed-status');
    if (!s) {
      s = el('div', { id: 'aka-ed-status', class: 'aka-ed-status' });
      document.body.appendChild(s);
    }
    s.textContent = msg;
    s.className   = 'aka-ed-status ' + (type || '');
    s.style.display = '';
    clearTimeout(s._t);
    s._t = setTimeout(() => s.style.display = 'none', 4000);
  }

  /* ── Changes Panel ─────────────────────────────────────────────────── */

  let panelEl = null;
  let panelOpen = false;

  function toggleChangesPanel() {
    panelOpen = !panelOpen;
    if (!panelEl) buildChangesPanel();
    panelEl.style.display = panelOpen ? '' : 'none';
    renderChangesPanel();
  }

  function buildChangesPanel() {
    panelEl = el('div', { id: 'aka-ed-panel', class: 'aka-ed-panel' },
      el('div', { class: 'aka-ed-panel-header' },
        el('h3', {}, '📋 Pending Changes'),
        el('button', { class: 'aka-ed-panel-close', onclick: () => { panelOpen = false; panelEl.style.display = 'none'; } }, '×')
      ),
      el('div', { id: 'aka-ed-panel-list', class: 'aka-ed-panel-list' })
    );
    document.body.appendChild(panelEl);
  }

  function renderChangesPanel() {
    if (!panelEl) return;
    const list = document.getElementById('aka-ed-panel-list');
    if (!list) return;
    list.innerHTML = '';
    if (!CHANGES.length) {
      list.appendChild(el('p', { class: 'aka-ed-panel-empty' }, 'No pending changes. Enter edit mode and click to start editing.'));
      return;
    }
    CHANGES.forEach(c => {
      const typeIcon = { text: '✏️', image: '🖼️', href: '🔗', delete: '🗑️', hide: '👁️' }[c.type] || '•';
      const row = el('div', { class: 'aka-ed-panel-row' },
        el('span', { class: 'aka-ed-panel-icon' }, typeIcon),
        el('div', { class: 'aka-ed-panel-info' },
          el('strong', {}, c.label || c.type),
          el('code',   {}, c.selector.slice(0, 60) + (c.selector.length > 60 ? '…' : ''))
        ),
        el('button', {
          class: 'aka-ed-panel-revert',
          onclick: () => { CHANGES = CHANGES.filter(x => x.id !== c.id); updateToolbar(); revertChange(c); },
          title: 'Revert this change',
        }, '↺')
      );
      list.appendChild(row);
    });
  }

  function revertChange(c) {
    try {
      const el = document.querySelector(c.selector);
      if (!el) return;
      location.reload();
    } catch {}
  }

  /* ── Edit Mode Toggle ──────────────────────────────────────────────── */

  function toggleEditMode() {
    EDITING = !EDITING;
    const btn = document.getElementById('aka-ed-toggle');
    if (btn) { btn.textContent = EDITING ? '🔵 Editing ON' : '⚪ Editing OFF'; btn.classList.toggle('active', EDITING); }
    document.body.classList.toggle('aka-ed-active', EDITING);
    if (EDITING) activateEditing();
    else deactivateEditing();
  }

  /* ── Activate Editing ──────────────────────────────────────────────── */

  function activateEditing() {
    /* Wrap all sections with delete controls */
    document.querySelectorAll('main > section, main section, [data-block]').forEach(sec => {
      if (sec.dataset.edWrapped) return;
      sec.dataset.edWrapped = '1';
      sec.classList.add('aka-ed-section');

      const controls = el('div', { class: 'aka-ed-section-controls' },
        el('button', {
          class: 'aka-ed-section-del',
          title: 'Hide this section',
          onclick: e => { e.stopPropagation(); hideSectionEl(sec); },
        }, '🗑 Hide Section'),
        el('button', {
          class: 'aka-ed-section-id',
          title: 'Section selector (read only)',
        }, getSelector(sec).slice(0, 40))
      );
      sec.appendChild(controls);
    });

    /* Make headings, paragraphs, spans editable on click */
    document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, p, span, li, td, th, blockquote, label, dt, dd, figcaption, [data-editable]'
    ).forEach(el => {
      if (el.closest('#aka-ed-toolbar, #aka-ed-panel, #aka-ed-login, .aka-ed-section-controls')) return;
      if (el.dataset.edBound) return;
      el.dataset.edBound = '1';
      el.classList.add('aka-ed-editable');
      el.addEventListener('click', onTextClick, { passive: true });
    });

    /* Make images replaceable */
    document.querySelectorAll('img').forEach(img => {
      if (img.closest('#aka-ed-toolbar, #aka-ed-panel, #aka-ed-login')) return;
      if (img.dataset.edBound) return;
      img.dataset.edBound = '1';
      wrapImage(img);
    });

    /* Make links double-clickable to edit href */
    document.querySelectorAll('a[href]').forEach(a => {
      if (a.closest('#aka-ed-toolbar, #aka-ed-panel, #aka-ed-login')) return;
      if (a.dataset.edBound) return;
      a.dataset.edBound = '1';
      a.addEventListener('dblclick', onLinkDblClick);
    });

    setStatus('✏️ Edit mode ON — click text to edit, click images to replace', 'info');
  }

  function deactivateEditing() {
    /* Commit any open contenteditable */
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.removeAttribute('contenteditable');
      el.blur();
    });
    document.body.classList.remove('aka-ed-active');
    setStatus('Edit mode OFF', 'info');
  }

  /* ── Text Editing ──────────────────────────────────────────────────── */

  function onTextClick(e) {
    if (!EDITING) return;
    const el = e.currentTarget;
    if (el.getAttribute('contenteditable') === 'true') return;

    el.setAttribute('contenteditable', 'true');
    el.focus();
    el.classList.add('aka-ed-editing');

    const prev = el.innerHTML;

    function commit() {
      el.removeAttribute('contenteditable');
      el.classList.remove('aka-ed-editing');
      if (el.innerHTML !== prev) {
        const text = el.innerText.slice(0, 60);
        recordChange('text', el, el.innerHTML, text);
        setStatus('✏️ Text updated: "' + text.slice(0, 40) + '"', 'success');
      }
      el.removeEventListener('blur', commit);
      el.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
      if (e.key === 'Escape') { el.innerHTML = prev; commit(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit();
    }

    el.addEventListener('blur', commit, { once: true });
    el.addEventListener('keydown', onKey);
  }

  /* ── Image Replacement ─────────────────────────────────────────────── */

  function wrapImage(img) {
    if (img.parentElement?.classList.contains('aka-ed-img-wrap')) return;
    const wrap = el('div', { class: 'aka-ed-img-wrap' });
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    const btn = el('button', { class: 'aka-ed-img-replace', onclick: e => { e.stopPropagation(); openImagePicker(img); } }, '🖼 Replace Image');
    wrap.appendChild(btn);
  }

  function openImagePicker(imgEl) {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { setStatus('Image too large (max 10 MB)', 'error'); return; }
      setStatus('⏳ Uploading image...', 'info');

      const reader = new FileReader();
      reader.onload = async () => {
        const r = await apiCall('POST', '/api/upload', { base64: reader.result, filename: file.name });
        if (r.ok && r.url) {
          imgEl.src = r.url;
          recordChange('image', imgEl, r.url, file.name);
          setStatus('🖼 Image replaced: ' + file.name, 'success');
        } else {
          setStatus('Upload failed: ' + (r.error || 'unknown error'), 'error');
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /* ── Link Editing ──────────────────────────────────────────────────── */

  function onLinkDblClick(e) {
    if (!EDITING) return;
    e.preventDefault();
    const a    = e.currentTarget;
    const prev = a.href;
    showLinkEditor(a, prev);
  }

  function showLinkEditor(a, current) {
    document.getElementById('aka-ed-link-modal')?.remove();
    const modal = el('div', { id: 'aka-ed-link-modal', class: 'aka-ed-link-modal' },
      el('div', { class: 'aka-ed-link-inner' },
        el('h4', {}, '🔗 Edit Link URL'),
        el('p',  { class: 'aka-ed-hint' }, 'Link text: "' + a.textContent.trim().slice(0, 50) + '"'),
        el('input', {
          id: 'aka-ed-link-input', type: 'url', class: 'aka-ed-input', value: current,
          placeholder: 'https://... or /internal-page',
        }),
        el('div', { class: 'aka-ed-link-actions' },
          el('button', { class: 'aka-ed-btn-primary', onclick: () => {
            const val = document.getElementById('aka-ed-link-input').value.trim();
            if (val) {
              a.href = val;
              recordChange('href', a, val, 'Link → ' + val.slice(0, 40));
              setStatus('🔗 Link updated', 'success');
            }
            modal.remove();
          }}, 'Update Link'),
          el('button', { class: 'aka-ed-btn-ghost', onclick: () => modal.remove() }, 'Cancel')
        )
      )
    );
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('aka-ed-link-input')?.select(), 50);
  }

  /* ── Section Hide ──────────────────────────────────────────────────── */

  function hideSectionEl(sec) {
    if (!confirm('Hide this section? It will be hidden after Save Draft → Approve.')) return;
    sec.style.opacity   = '0.3';
    sec.style.outline   = '3px dashed #ba1a1a';
    sec.style.pointerEvents = 'none';
    recordChange('hide', sec, 'none', 'Section hidden: ' + sec.tagName + ' ' + (sec.id ? '#' + sec.id : ''));
    setStatus('🗑 Section marked for hiding. Save Draft to persist.', 'info');
  }

  /* ── Save Draft ────────────────────────────────────────────────────── */

  async function saveDraft() {
    if (!CHANGES.length) { setStatus('No changes to save', 'info'); return; }
    const btn = document.getElementById('aka-ed-save');
    if (btn) { btn.textContent = '⏳ Saving...'; btn.disabled = true; }

    const r = await apiCall('POST', '/api/edits', { changes: CHANGES });
    if (r.ok) {
      setStatus(`💾 Draft saved — ${CHANGES.length} change${CHANGES.length !== 1 ? 's' : ''} stored`, 'success');
    } else {
      setStatus('Save failed: ' + (r.error || '?'), 'error');
    }
    if (btn) { btn.textContent = '💾 Save Draft'; btn.disabled = false; }
  }

  /* ── Approve & Publish ──────────────────────────────────────────────── */

  async function approveChanges() {
    if (!CHANGES.length) { setStatus('No changes to approve', 'info'); return; }
    if (!confirm(`Approve ${CHANGES.length} change(s)? They will be applied to the site and persisted.`)) return;

    const btn = document.getElementById('aka-ed-approve');
    if (btn) { btn.textContent = '⏳ Approving...'; btn.disabled = true; }

    await saveDraft();
    const r = await apiCall('POST', '/api/approve');

    if (r.ok) {
      CHANGES = [];
      updateToolbar();
      setStatus('✅ Changes approved! Reloading...', 'success');
      setTimeout(() => location.reload(), 1500);
    } else {
      setStatus('Approve failed: ' + (r.error || '?'), 'error');
    }
    if (btn) { btn.textContent = '✅ Approve & Publish'; btn.disabled = false; }
  }

  /* ── Trigger Build ──────────────────────────────────────────────────── */

  async function triggerBuild() {
    const btn = document.getElementById('aka-ed-build');
    if (btn) { btn.textContent = '⏳ Building...'; btn.disabled = true; }
    setStatus('🔨 Building site... (this may take 10–30s)', 'info');

    try {
      const ev = new EventSource(API + '/api/build', {
        headers: { 'X-Editor-Token': TOKEN }
      });
      /* EventSource doesn't support custom headers in browser — use fetch instead */
      ev.close();
    } catch {}

    const res = await fetch(API + '/api/build', {
      method: 'POST',
      headers: { 'X-Editor-Token': TOKEN },
    });
    const reader = res.body.getReader();
    const dec    = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = dec.decode(value).split('\n').filter(l => l.startsWith('data:'));
      lines.forEach(line => {
        try {
          const d = JSON.parse(line.replace('data:', '').trim());
          if (d.status === 'done') {
            setStatus('✅ Build complete! Reloading...', 'success');
            setTimeout(() => location.reload(), 1500);
          } else if (d.status === 'error') {
            setStatus('❌ Build error: ' + d.msg, 'error');
          } else {
            setStatus('🔨 ' + (d.msg || 'Building...'), 'info');
          }
        } catch {}
      });
    }
    if (btn) { btn.textContent = '🔨 Rebuild'; btn.disabled = false; }
  }

  /* ── Log Out ────────────────────────────────────────────────────────── */

  function logOut() {
    if (CHANGES.length && !confirm('You have unsaved changes. Log out anyway?')) return;
    localStorage.removeItem(KEY);
    TOKEN = '';
    location.reload();
  }

  /* ── Auto-restore session ───────────────────────────────────────────── */

  async function init() {
    /* Only run on localhost */
    if (!location.hostname.match(/^localhost$|^127\.|^::1$/)) return;

    /* Verify token is still valid */
    if (TOKEN) {
      const r = await fetch(API + '/api/status', {
        headers: { 'X-Editor-Token': TOKEN }
      }).then(r => r.json()).catch(() => ({}));
      if (!r.authed) { localStorage.removeItem(KEY); TOKEN = ''; }
    }

    if (!TOKEN) {
      /* Show editor launch button bottom-right */
      showLaunchButton();
    } else {
      initEditor();
    }
  }

  function showLaunchButton() {
    const fab = el('button', {
      id: 'aka-ed-fab',
      class: 'aka-ed-fab',
      title: 'Open Visual Editor',
      onclick: () => { fab.remove(); showLogin(); }
    }, '✏️');
    document.body.appendChild(fab);
  }

  function initEditor() {
    buildToolbar();
    /* Load any existing pending changes from server */
    apiCall('GET', '/api/edits').then(data => {
      if (data.pending && data.pending.length) {
        CHANGES = data.pending;
        updateToolbar();
        setStatus(`💾 ${CHANGES.length} draft change(s) restored from last session`, 'info');
      }
    });
  }

  /* ── Boot ───────────────────────────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
