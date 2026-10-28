/* ============================================================
   ADMIN PANEL LOGIC
   - Gates everything behind Firebase Auth (email/password)
   - Loads the live content doc (or the seed file on first run)
   - Generic array-editor engine driven by a small schema config
   - Saves the whole content object back to Firestore in one write
   - Optional image upload to Firebase Storage for portfolio items
   ============================================================ */

(function () {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const DOC_PATH = { collection: 'site', doc: 'content' };

  let state = null; // the whole content object being edited

  /* ---------------------------------------------------------
     SCHEMA — describes every array-type section so one generic
     renderer can handle all of them.
  --------------------------------------------------------- */
  const SECTIONS = {
    'hero.stats': {
      container: 'list-hero-stats',
      empty: () => ({ label: '', count: 0, suffix: '+' }),
      fields: [
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'count', label: 'Count', type: 'number' },
        { key: 'suffix', label: 'Suffix', type: 'text' }
      ],
      title: (item, i) => item.label || ('Stat ' + (i + 1))
    },
    'skills': {
      container: 'list-skills',
      empty: () => ({ name: '', pct: 80 }),
      fields: [
        { key: 'name', label: 'Skill name', type: 'text' },
        { key: 'pct', label: 'Percent (0–100)', type: 'number' }
      ],
      title: (item, i) => item.name || ('Skill ' + (i + 1))
    },
    'tools': {
      container: 'list-tools',
      empty: () => ({ name: '', category: '' }),
      fields: [
        { key: 'name', label: 'Tool name', type: 'text' },
        { key: 'category', label: 'Category', type: 'text' }
      ],
      title: (item, i) => item.name || ('Tool ' + (i + 1))
    },
    'services': {
      container: 'list-services',
      empty: () => ({ title: '', desc: '' }),
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'desc', label: 'Description', type: 'textarea' }
      ],
      title: (item, i) => item.title || ('Service ' + (i + 1))
    },
    'portfolio': {
      container: 'list-portfolio',
      empty: () => ({ category: 'marketing', title: '', desc: '', cardText: '', tags: '', image: '' }),
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'category', label: 'Category (marketing / design / video / web)', type: 'text' },
        { key: 'tags', label: 'Tags (comma separated)', type: 'text' },
        { key: 'cardText', label: 'Short card text', type: 'textarea' },
        { key: 'desc', label: 'Full description (shown in popup)', type: 'textarea' },
        { key: 'image', label: 'Image', type: 'image' }
      ],
      title: (item, i) => item.title || ('Project ' + (i + 1))
    },
    'experience': {
      container: 'list-experience',
      empty: () => ({ period: '', title: '', org: '', desc: '' }),
      fields: [
        { key: 'period', label: 'Period (e.g. Current, 2023)', type: 'text' },
        { key: 'title', label: 'Role title', type: 'text' },
        { key: 'org', label: 'Organization', type: 'text' },
        { key: 'desc', label: 'Description', type: 'textarea' }
      ],
      title: (item, i) => item.title || ('Role ' + (i + 1))
    },
    'testimonials': {
      container: 'list-testimonials',
      empty: () => ({ quote: '', author: '', org: '' }),
      fields: [
        { key: 'author', label: 'Author', type: 'text' },
        { key: 'org', label: 'Organization', type: 'text' },
        { key: 'quote', label: 'Quote', type: 'textarea' }
      ],
      title: (item, i) => item.author || ('Testimonial ' + (i + 1))
    },
    'achievements': {
      container: 'list-achievements',
      empty: () => ({ label: '', count: 0, suffix: '+' }),
      fields: [
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'count', label: 'Count', type: 'number' },
        { key: 'suffix', label: 'Suffix', type: 'text' }
      ],
      title: (item, i) => item.label || ('Stat ' + (i + 1))
    }
  };

  /* ---------------------------------------------------------
     Path helpers (supports "hero.stats" style dot paths)
  --------------------------------------------------------- */
  function getArr(path) {
    const parts = path.split('.');
    let obj = state;
    for (const p of parts) { obj = obj[p] = obj[p] || []; }
    return obj;
  }

  /* ---------------------------------------------------------
     AUTH
  --------------------------------------------------------- */
  const loginForm = $('#loginForm');
  const loginScreen = $('#loginScreen');
  const editorScreen = $('#editorScreen');
  const loginError = $('#loginError');

  // Login is controlled by REQUIRE_LOGIN in firebase-config.js.
  // false = /admin opens straight into the editor (current setting).
  // true  = email/password sign-in is required first.
  const needLogin = (typeof REQUIRE_LOGIN !== 'undefined') && REQUIRE_LOGIN === true;

  if (!needLogin) {
    loginScreen.style.display = 'none';
    editorScreen.style.display = 'block';
    $('#whoAmI').textContent = '— login disabled';
    $('#logoutBtn').style.display = 'none';
    loadContent();
  } else {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        loginScreen.style.display = 'none';
        editorScreen.style.display = 'block';
        $('#whoAmI').textContent = '— signed in as ' + user.email;
        loadContent();
      } else {
        loginScreen.style.display = 'flex';
        editorScreen.style.display = 'none';
      }
    });
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = $('#loginEmail').value.trim();
    const pass = $('#loginPassword').value;
    const btn = $('#loginBtn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    firebase.auth().signInWithEmailAndPassword(email, pass)
      .catch((err) => { loginError.textContent = humanizeAuthError(err); })
      .finally(() => { btn.disabled = false; btn.textContent = 'Sign In'; });
  });

  $('#logoutBtn').addEventListener('click', () => firebase.auth().signOut());

  function humanizeAuthError(err) {
    const map = {
      'auth/invalid-email': 'That email address looks wrong.',
      'auth/user-not-found': 'No account with that email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Email or password is incorrect.',
      'auth/too-many-requests': 'Too many attempts — try again in a minute.'
    };
    return map[err.code] || err.message;
  }

  /* ---------------------------------------------------------
     LOAD CONTENT (from Firestore, falling back to the seed file
     the very first time the admin is ever opened)
  --------------------------------------------------------- */
  function loadContent() {
    setStatus('Loading content…');
    firebase.firestore().collection(DOC_PATH.collection).doc(DOC_PATH.doc).get()
      .then((snap) => {
        if (snap.exists) {
          state = snap.data();
          setStatus('Loaded live content.', 'ok');
        } else {
          return fetch('../content.seed.json').then((r) => r.json()).then((seed) => {
            state = seed;
            setStatus('No live content yet — loaded starter content. Press Save to publish it.', 'ok');
          });
        }
      })
      .then(() => { normalizeState(); renderAll(); })
      .catch((err) => setStatus('Could not load content: ' + err.message, 'err'));
  }

  $('#reloadBtn').addEventListener('click', loadContent);

  function normalizeState() {
    state = state || {};
    state.site = state.site || {};
    state.hero = state.hero || {};
    state.hero.stats = state.hero.stats || [];
    state.social = state.social || {};
    Object.keys(SECTIONS).forEach((path) => { if (path !== 'hero.stats') getArr(path); });
  }

  /* ---------------------------------------------------------
     RENDER — simple fields
  --------------------------------------------------------- */
  function renderAll() {
    $('#siteName').value = state.site.name || '';
    $('#siteTagline').value = state.site.tagline || '';
    $('#siteEmail').value = state.site.email || '';
    $('#sitePhone').value = state.site.phone || '';
    $('#sitePhoneHref').value = state.site.phoneHref || '';
    $('#siteLocation').value = state.site.location || '';

    $('#socialLinkedin').value = state.social.linkedin || '';
    $('#socialFacebook').value = state.social.facebook || '';
    $('#socialInstagram').value = state.social.instagram || '';
    $('#socialWhatsapp').value = state.social.whatsapp || '';
    $('#socialBehance').value = state.social.behance || '';

    Object.keys(SECTIONS).forEach(renderSection);
  }

  function renderSection(path) {
    const cfg = SECTIONS[path];
    const wrap = $('#' + cfg.container);
    const arr = getArr(path);
    wrap.innerHTML = arr.map((item, i) => itemCardHtml(path, cfg, item, i)).join('') ||
      '<p class="hint">Nothing here yet — use the + button above to add one.</p>';
  }

  function itemCardHtml(path, cfg, item, i) {
    const fieldsHtml = cfg.fields.map((f) => {
      const val = item[f.key] == null ? '' : item[f.key];
      if (f.type === 'textarea') {
        return `<div class="field"><label>${f.label}</label>
          <textarea data-path="${path}" data-index="${i}" data-key="${f.key}">${escAttr(val)}</textarea></div>`;
      }
      if (f.type === 'image') {
        const preview = val ? `<img class="img-preview" src="${escAttr(val)}" alt="">` : '';
        return `<div class="field"><label>${f.label}</label>
          <div class="upload-row">
            <input type="text" placeholder="Image URL (or upload below)" data-path="${path}" data-index="${i}" data-key="${f.key}" value="${escAttr(val)}">
            <input type="file" accept="image/*" data-upload-path="${path}" data-upload-index="${i}" data-upload-key="${f.key}">
          </div>
          ${preview}</div>`;
      }
      const inputType = f.type === 'number' ? 'number' : 'text';
      return `<div class="field"><label>${f.label}</label>
        <input type="${inputType}" data-path="${path}" data-index="${i}" data-key="${f.key}" value="${escAttr(val)}"></div>`;
    }).join('');

    return `<div class="item-card">
      <div class="item-card-top">
        <span class="idx">${escText(cfg.title(item, i))}</span>
        <button type="button" class="btn btn-danger btn-sm" data-remove="${path}" data-remove-index="${i}">Remove</button>
      </div>
      ${fieldsHtml}
    </div>`;
  }

  function escAttr(v) { return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function escText(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  /* ---------------------------------------------------------
     EVENTS — add / remove / edit / upload (delegated)
  --------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const addPath = e.target.getAttribute && e.target.getAttribute('data-add');
    if (addPath) {
      getArr(addPath).push(SECTIONS[addPath].empty());
      renderSection(addPath);
      return;
    }
    const removePath = e.target.getAttribute && e.target.getAttribute('data-remove');
    if (removePath) {
      const idx = Number(e.target.getAttribute('data-remove-index'));
      getArr(removePath).splice(idx, 1);
      renderSection(removePath);
    }
  });

  document.addEventListener('input', (e) => {
    const path = e.target.getAttribute && e.target.getAttribute('data-path');
    if (!path) return;
    const idx = Number(e.target.getAttribute('data-index'));
    const key = e.target.getAttribute('data-key');
    const arr = getArr(path);
    if (!arr[idx]) return;
    arr[idx][key] = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
  });

  document.addEventListener('change', (e) => {
    if (!e.target.matches('input[type="file"][data-upload-path]')) return;
    const file = e.target.files[0];
    if (!file) return;
    const path = e.target.getAttribute('data-upload-path');
    const idx = Number(e.target.getAttribute('data-upload-index'));
    const key = e.target.getAttribute('data-upload-key');
    uploadImage(file, path, idx, key, e.target);
  });

  function uploadImage(file, path, idx, key, inputEl) {
    setStatus('Uploading image…');
    const safeName = Date.now() + '-' + file.name.replace(/[^a-z0-9.\-_]/gi, '_');
    const ref = firebase.storage().ref().child('portfolio/' + safeName);
    ref.put(file)
      .then((snap) => snap.ref.getDownloadURL())
      .then((url) => {
        const arr = getArr(path);
        if (arr[idx]) arr[idx][key] = url;
        renderSection(path);
        setStatus('Image uploaded. Remember to Save & Publish.', 'ok');
      })
      .catch((err) => setStatus('Image upload failed: ' + err.message, 'err'));
  }

  /* ---------------------------------------------------------
     SAVE — writes the entire content object back to Firestore
  --------------------------------------------------------- */
  $('#saveBtn').addEventListener('click', () => {
    state.site.name = $('#siteName').value;
    state.site.tagline = $('#siteTagline').value;
    state.site.email = $('#siteEmail').value;
    state.site.phone = $('#sitePhone').value;
    state.site.phoneHref = $('#sitePhoneHref').value;
    state.site.location = $('#siteLocation').value;

    state.social.linkedin = $('#socialLinkedin').value;
    state.social.facebook = $('#socialFacebook').value;
    state.social.instagram = $('#socialInstagram').value;
    state.social.whatsapp = $('#socialWhatsapp').value;
    state.social.behance = $('#socialBehance').value;

    setStatus('Saving…');
    firebase.firestore().collection(DOC_PATH.collection).doc(DOC_PATH.doc).set(state)
      .then(() => setStatus('Saved and published ✓', 'ok'))
      .catch((err) => setStatus('Save failed: ' + err.message, 'err'));
  });

  function setStatus(msg, kind) {
    [$('#statusMsg'), $('#statusMsgBottom')].forEach((el) => {
      if (!el) return;
      el.textContent = msg;
      el.className = 'status-msg' + (kind ? ' ' + kind : '');
    });
  }

})();
