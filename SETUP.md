# Set up the A-Level Study Notes app (free approach)

## 1. Dedicated Google account

Create a dedicated Google account (or use one you've already created) for **ownership of the private lesson library**. Sign into this account when setting up the application. It uses the free personal Google Drive storage allowance; this is shared with Gmail and Google Photos.

**Security warning:** If your daughter signs into the same dedicated owner account on the iPad, she has the same Google Drive privileges as you. The interface can show separate student/admin pages, but those pages do *not* create true secure account roles. For actual admin/student separation, have her sign in with another Google account and share the library as Viewer using the Account screen. Do not share the owner's password just to achieve student access.

## 2. Create a Google Cloud project

1. Visit https://console.cloud.google.com/ and sign in with the dedicated Google account.
2. Create a new project, for example **A-Level Study Notes**.
3. Under **APIs & Services → Library**, enable **Google Drive API**.
4. Open **Google Auth Platform / OAuth consent screen**. Choose **External**, set the app name, add your contact email, and keep it in **Testing** during development.
5. In **Data access / Scopes**, include Drive access and email (`https://www.googleapis.com/auth/drive` and `https://www.googleapis.com/auth/userinfo.email`). This is broad Drive access; the application needs it to manage its private folders and convert PPTX files. Google may show an *unverified app* warning during testing. Do not publish broadly without completing the applicable Google verification requirements.
6. Add the dedicated account to the **Test users** list. If using a separate student account, add it as well. Google may require re-consent periodically in Testing mode, and there may be test-user restrictions.
7. Under **Clients / Credentials**, create an **OAuth Client ID** of type **Web application**.
8. Add your website URL under **Authorised JavaScript origins** (an origin is scheme + host, no path). Example: `https://YOURNAME.github.io`. For local tests, also add `http://localhost:8000`.
9. Copy the Web **Client ID**, which ends in `.apps.googleusercontent.com`. This is not a secret. Never use a client secret in the browser.

## 3. Publish the website using GitHub Pages

1. Make a GitHub repository for the application files (only `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, README, SETUP).
2. Upload them to the repository root. **Do not upload any school PPTX files, PDFs, private notes or credentials.** GitHub Pages is public even if the source repository is private in some configurations.
3. Under GitHub repository **Settings → Pages**, set **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Open the HTTPS Pages URL displayed by GitHub, e.g. `https://YOURNAME.github.io/your-repo/`.
5. Ensure `https://YOURNAME.github.io` is an authorised JavaScript origin for your OAuth client. A subpath is not an origin.

A MacBook server is no longer needed once the website is published. GitHub Pages can remain free within its standard usage and site-size limits.

## 4. Connect the study app

1. Open the hosted website in Safari on the MacBook.
2. Click **Account**.
3. Enter your OAuth **Web Client ID** and the dedicated owner's Google email into **Administrator Google email**, then choose **Save settings on this device**.
4. Choose **Sign in with Google** and authorise access with the dedicated account.
5. Click **Admin: create library**. This creates a private `A-Level Study Notes` folder in the account's Google Drive.
6. Save the **Library folder ID** shown on the Account page; it is needed on any other device.
7. Open **Admin** and upload a PPTX or PDF. Choose Law Learn / Week 8 for the supplied example, or any other area and week.
8. In **My Subjects → Law Learn → Week 8**, open the presentation and test highlighting, revision notes and cloud syncing.
9. On the iPad, open the same website, enter the OAuth Client ID, folder ID and administrator email in Account, save, and sign in with the appropriate Google account.
10. Use Safari **Share → Add to Home Screen** to launch it like an app.

**Google Drive source protection:** The site code is public, but the presentations are stored in Google Drive. The private Drive folder should never be set to “Anyone with the link”. The site must not embed Google tokens in public source code.

## 5. Student account option (for real permissions)

- If you want your daughter's account to be genuinely read-only, have her use a **different Google account**. In the owner's Account panel, enter her email and select **Admin: share with student**. This grants Viewer access to the library folder.
- Students use the same website but their own Google sign-in. Student annotations go into *their own* Google Drive app-data folder. App-data notes are per Google account, not automatically shared with the owner.
- On the student device, set the same Library folder ID; the student will be able to list available shared lessons if access is granted.
- For strong protection, don't sign the student into the dedicated owner account.

## 6. Handling the weekly content

- Go to Admin → select category, week and the file → Upload lesson.
- PowerPoints are uploaded and converted into Google Slides documents (which can be exported by the reader as PDFs). PDF uploads remain PDFs. The app does not also keep an original `.pptx` copy in Drive.
- Uploading needs Google to accept the conversion. Keep an untouched copy of the original file on your own Mac/Drive until you verify the converted lesson looks correct.
- The student chooses a subject, week and uploaded presentation; all annotations are associated with the unique Google file ID.
- Avoid deleting and re-uploading a presentation after notes are taken; this changes the file ID. Instead, keep the original lesson available or export its annotation backup first.

## 7. Backups / restoring

- In Revision notes, select **Backup** to save highlights and teacher notes to a JSON file. Store these securely in Drive or iCloud.
- **Restore** loads a backup into the currently opened lesson. Confirm that you're restoring into the correct presentation; offset-based highlights may not match a changed version.
- PDF printout: Revision notes → **Print / Save PDF** → choose Save as PDF or print in Safari.

## Troubleshooting

- **Google OAuth error `origin_mismatch`:** Check the exact scheme+host under Authorised JavaScript origins. No trailing path.
- **`access_denied` or Testing user error:** Add the Google account to OAuth test users.
- **403 Drive API:** Check Drive API enabled, OAuth scopes and folder permissions.
- **Login worked but no lessons:** Check the same Library folder ID on each device and that the correct Google account is signed in.
- **PPTX conversion fails:** Try exporting the original PPTX to PDF and uploading the PDF instead. Some files exceed Google export/conversion limits.
- **Pen not marking:** Drag the Pencil *across text in the right-hand text pane*, not the left-hand rendered slide. Tap Eraser to remove an earlier mark. If needed, turn Finger highlighting ON to diagnose iPad input.
- **App looks public:** The website itself is public; this is expected. Private lessons must only be in Drive, behind Google authorisation.
- **Lost browser settings:** Re-enter the OAuth Client ID, folder ID and admin email on that device. No secrets need to be recovered.

### Notes on costs and verification

This design requires no mandatory paid hosting or database subscription and can run within Google's free allowances for a small family library. Service quotas and terms can change. It has not been tested against your live Google project, so do the first upload and sync test before relying on it for lessons.
