/* ============================================================
   CMS CONTENT LOADER (public-facing)
   Loads the live content document from Firestore and exposes it
   as window.CMS_READY — a Promise that resolves with the content
   object. script.js awaits this before rendering any section.

   Load order in index.html (all before script.js):
     1. Firebase App SDK
     2. Firebase Auth SDK   (not required on the public site, but
                              harmless to include for consistency)
     3. Firebase Firestore SDK
     4. firebase-config.js
     5. cms-content.js      (this file)
     6. script.js
   ============================================================ */

(function () {
  'use strict';

  const CACHE_KEY = 'ayas-cms-content-cache';
  const DOC_PATH = { collection: 'site', doc: 'content' }; // Firestore: site/content

  window.CMS_READY = new Promise((resolve) => {
    let settled = false;
    const finish = (data, source) => {
      if (settled) return;
      settled = true;
      console.info('[CMS] content loaded from', source);
      resolve(data);
    };

    // 1. Try a cached copy first so the page never shows an empty
    //    flash while Firestore responds (cache is replaced below
    //    once the live fetch succeeds).
    let cached = null;
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch (e) { /* ignore — private browsing / blocked storage */ }

    // 2. Fetch the bundled seed file as the ultimate fallback
    //    (used if Firestore is unreachable AND there's no cache —
    //    e.g. first-ever load with no internet to Firestore).
    const seedPromise = fetch('content.seed.json').then((r) => r.json()).catch(() => null);

    // 3. Try Firestore (the real, live, admin-editable source).
    let firestoreTimedOut = false;
    const timeout = setTimeout(() => {
      firestoreTimedOut = true;
      if (cached) finish(cached, 'local cache (Firestore slow/offline)');
    }, 2500);

    try {
      firebase.firestore()
        .collection(DOC_PATH.collection)
        .doc(DOC_PATH.doc)
        .get()
        .then((snap) => {
          clearTimeout(timeout);
          if (snap.exists) {
            const data = snap.data();
            try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
            finish(data, 'Firestore (live)');
          } else if (cached) {
            finish(cached, 'local cache (no Firestore document yet)');
          } else {
            seedPromise.then((seed) => finish(seed || {}, 'bundled seed (no Firestore document yet)'));
          }
        })
        .catch(() => {
          clearTimeout(timeout);
          if (!firestoreTimedOut) {
            if (cached) finish(cached, 'local cache (Firestore error)');
            else seedPromise.then((seed) => finish(seed || {}, 'bundled seed (Firestore error)'));
          }
        });
    } catch (e) {
      clearTimeout(timeout);
      if (cached) finish(cached, 'local cache (Firebase not configured)');
      else seedPromise.then((seed) => finish(seed || {}, 'bundled seed (Firebase not configured)'));
    }
  });
})();
