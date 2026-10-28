/* ============================================================
   FIREBASE CONFIG — paste your own project's values here.
   Get these from: Firebase Console → Project Settings →
   "Your apps" → Web app (</> icon) → SDK setup and configuration.

   This file is loaded by BOTH index.html and admin.html.
   It is safe to make this file public — these are client
   identifiers, not secrets. Real protection comes from the
   Firestore Security Rules (see README-FIREBASE-SETUP.md),
   not from hiding this file.
   ============================================================ */

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

// Initialize once, shared by every page that loads this file.
firebase.initializeApp(firebaseConfig);

/* ------------------------------------------------------------
   ADMIN LOGIN SWITCH
   false = /admin opens directly, no login (easy mode, for now)
   true  = /admin requires the email/password you created in
           Firebase → Authentication → Users
   When you switch to true, also tighten the Firestore/Storage
   rules as described in README-FIREBASE-SETUP.md.
   ------------------------------------------------------------ */
const REQUIRE_LOGIN = false;
