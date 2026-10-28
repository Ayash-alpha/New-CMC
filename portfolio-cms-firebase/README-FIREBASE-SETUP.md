# EASY MODE (current): no login, open /admin

`REQUIRE_LOGIN = false` in `firebase-config.js`. Visit `your-site.netlify.app/admin`
and you land straight in the editor. Admin files live in the `admin/` folder.

Setup is shorter: create the Firebase project, create a Firestore database and
Storage bucket, **skip the Authentication/Users steps**, and use these temporary
rules instead of the locked-down ones further down:

Firestore rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /site/content { allow read, write: if true; }
  }
}
```
Storage rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /portfolio/{fileName} { allow read, write: if true; }
  }
}
```
**Warning:** in this mode anyone who guesses /admin can edit your site. Fine for
building and testing; switch to login before sharing the link widely.

## Switching login on later
1. Enable Authentication (Email/Password) and add your user in Firebase.
2. Set `const REQUIRE_LOGIN = true;` in `firebase-config.js`.
3. Replace the rules with the locked-down ones below (`request.auth != null`).

---

# Turning this into a real CMS with admin login (Firebase)

This replaces the old "edit `data.json` and re-upload" workflow with a genuine
admin login and a live database. Your site stays static HTML/CSS/JS on
Netlify — Firebase just supplies login + storage, loaded via `<script>` tags,
no build step, no framework.

## 1. Create the Firebase project (5 min, free)

1. Go to https://console.firebase.google.com → **Add project** → name it
   (e.g. `mohamed-ayas-portfolio`) → skip Google Analytics (not needed).
2. In the left sidebar: **Build → Authentication → Get started → Sign-in
   method → Email/Password → Enable → Save**.
3. Still in Authentication, go to the **Users** tab → **Add user** → enter
   your own email and a strong password. This is your one admin login.
4. **Build → Firestore Database → Create database → Start in production
   mode** → pick a region close to Sri Lanka (e.g. `asia-south1`).
5. **Build → Storage → Get started** → production mode → same region.
   (This is only used if you upload portfolio images from the admin panel
   instead of pasting image URLs.)

## 2. Lock down who can read/write

### Firestore rules
In **Firestore Database → Rules**, replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /site/content {
      allow read: if true;                 // anyone can view the site
      allow write: if request.auth != null; // only a signed-in admin can edit
    }
  }
}
```

### Storage rules
In **Storage → Rules**, replace the contents with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /portfolio/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Click **Publish** on both. This is the real security — not the admin page's
URL being "hidden."

## 3. Get your web app config

**Project settings** (gear icon) → scroll to **Your apps** → click the `</>`
(Web) icon → register an app (nickname: "portfolio") → copy the
`firebaseConfig` object it shows you.

Open `firebase-config.js` in this folder and paste your values in place of
the `PASTE_YOUR_...` placeholders.

## 4. Files in this delivery

| File | Purpose |
|---|---|
| `firebase-config.js` | Your project's connection details (safe to be public) |
| `cms-content.js` | Public site loader — fetches live content for `index.html` |
| `admin/index.html`, `admin/admin.css`, `admin/admin.js` | The login-gated editor |
| `content.seed.json` | Starter content, used only the very first time (before you ever press Save in the admin) |
| `script.js` | Updated to render every section from the loaded content, then run all the existing animations/interactions |
| `cms-additions.css` | New Tools & Platforms section styling + a bento-grid layout for Services/Portfolio + extra responsive rules |

## 5. What still needs to happen to `index.html`

I built this against the structure of your site as it stood last session —
but I need your current `index.html` and `style.css` re-uploaded to finish
wiring this in safely (see my message). When you send them, I will:

- Add the Firebase script tags + `firebase-config.js` + `cms-content.js`
  before `script.js`
- Link `cms-additions.css` after `style.css`
- Replace the hardcoded Experience, Testimonials, Achievements, and
  Contact/Footer social-link markup with empty containers carrying these
  IDs (skills/services/portfolio/hero-stats were already converted last
  session):
  - `#experienceTimeline`, `#testimonialTrack` (dots: `#testimonialDots`,
    already existing), `#achievementsGrid`
  - `#contactEmailRow`, `#contactPhoneRow`, `#contactLocationValue`,
    `#contactSocialRow`, `#footerSocialLinks`
- Leave `admin/index.html` **unlinked** from the public nav (reachable only by
  typing the URL directly) — the real protection is the Firestore rules
  above, not hiding the link, but there's no reason to advertise it either.

## 6. Deploying

Same as before — drag the whole folder (now including `firebase-config.js`,
`cms-content.js`, `admin/index.html`, `admin.css`, `admin.js`, `content.seed.json`,
`cms-additions.css` alongside your existing files) into
https://app.netlify.com/drop, or push to the GitHub repo if you've connected
one for auto-deploys.

## 7. Day-to-day use

1. Go to `your-site.netlify.app/admin`
2. Sign in with the email/password you created in step 1
3. Edit any section, add/remove items, upload images
4. Press **Save & Publish** — the live site picks it up within seconds
   (visitors with a cached copy get the update on their next load or
   within ~2.5 seconds if Firestore is reachable)

No re-uploading files, no redeploying, ever again for content changes —
only for actual code/design changes.
