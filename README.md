# Study Notes — A-Level Learning Hub (v4)

A reusable, browser-based study app for iPad + Apple Pencil, MacBook and other browsers.

### Included

- Six lesson areas: Law Learn / Explore, Psychology Learn / Explore, Sociology Learn / Explore.
- Organise presentations by week, with any number of presentations per week.
- Parent admin upload (PPTX or PDF), automatic PowerPoint-to-Google-Slides conversion using Google Drive, and lesson listing.
- Private file storage in the dedicated owner's Google Drive account.
- Select text using Apple Pencil, erase an earlier highlight, undo, and add notes using iPadOS Scribble.
- Highlight-only revision pages with Print / Save PDF.
- Local autosave, Drive appData notes sync after sign-in, and export/restore backups.
- No paid hosting required; no MacBook server after publishing.

### Start here

1. Read **SETUP.md** for Google Cloud and GitHub Pages setup (one-time, account owner).
2. Test before configuring Google: run `python3 -m http.server 8000 --bind 0.0.0.0` in this folder and open the site in Safari. Choose **Open a PDF on this device** to try highlights immediately. The original PPTX requires conversion to a PDF for offline tests, but admin PPTX uploads will convert in Google Drive.
3. Never upload your school's original PowerPoints, school PDFs, or your daughter's exported notes into a *public* GitHub Pages repository. The ZIP contains none of those materials.

### Important limitations

- **One Google account ≠ separate admin/student security.** Both devices using the same account can access the owner's Drive permissions. The Student and Admin navigation is not a secure permission boundary. True read-only student access requires a separate student Google account and sharing the library with Viewer permissions. Do not store the dedicated account password in the app.
- Browser Google sign-in is interactive. The access token is temporary; you may need to click Sign in again when opening a new session. The site does not store the OAuth token permanently.
- Some PowerPoint elements can be repositioned when Google converts PPTX to Slides/PDF. The PDF reader may split paragraphs into multiple text blocks, particularly for complex slides.
- Google Drive PDF export has an API size limit. Extremely large presentations might need smaller files or a different conversion path. Test the actual weekly presentations.
- Browser-stored highlights are a fallback, not a formal disaster-recovery system. Download backups after lessons. One shared Google account will share the same cloud annotations across devices.
- The project is a deployable starter application. Actual Google OAuth, sharing and the PPTX upload path require testing in your own Google account. It is **not** yet an end-to-end verified production deployment.

### Files

- `index.html`, `styles.css`, `app.js` — static website, GitHub Pages compatible.
- `manifest.webmanifest` — home-screen web app metadata.
- `SETUP.md` — step-by-step deployment and privacy instructions.

### Privacy

Do not paste passwords, refresh tokens or private keys into the app or repository. The OAuth Client ID is public information; it does not grant access by itself. Files are retrieved using Google's authorisation checks rather than being embedded in the website.
