# Clear Change Companion — Android setup

This is a small installable web app (PWA). It is designed for two Android phones and can be hosted free with GitHub Pages. The app can be installed from Chrome's menu with **Install app** or **Add to Home screen**.

## Important limitations
- The app initially saves progress only in the current browser on the current phone.
- To share progress between both phones, you must configure a Firebase project. Firebase has a free tier, but the setup requires creating accounts and setting access rules.
- Shared sync needs an internet connection. Local progress is stored in the browser as a backup, but don't clear browser data without copying important notes.
- This is a general organizer, not a medical app. It does not determine whether a food is approved by Metagenics for a particular program day.

## Part A — Publish free with GitHub Pages
1. Create or sign in to a GitHub account.
2. Create a **private** repository named `clear-change-companion` (public is also possible, but public hosting means the app code is visible).
3. Upload all files and folders from this package to the repository root. Keep `index.html` at the root.
4. Open **Settings → Pages**. Under Build and deployment, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
5. Wait for GitHub Pages to publish your site. The address will look like `https://YOUR-USERNAME.github.io/clear-change-companion/`.
6. Open that address in Chrome on each Android phone. Use Chrome's menu (⋮) → **Install app** or **Add to Home screen**.

## Part B — Configure shared progress with Firebase (free tier)
Do these steps before using shared sync with real data.

1. Go to https://console.firebase.google.com/ and create a project, e.g. `clear-change-companion`.
2. In Project settings, add a **Web app** and copy its configuration.
3. In Firebase Authentication → Sign-in method, enable **Email/Password**.
4. Create exactly two accounts (one for each person) in Authentication → Users. Use unique passwords and don't share them in chat.
5. Create a **Realtime Database** in the closest region available. Copy its database URL.
6. Edit `firebase-config.js` and replace the placeholder values with your Firebase web app's `apiKey`, `authDomain`, `databaseURL`, `projectId`, and `appId`.
7. In Realtime Database → Rules, use the following rules after replacing both email addresses with the exact two account emails. Do not leave the placeholder emails in place:

```json
{
  "rules": {
    "shared": {
      "clearChangeCompanion": {
        ".read": "auth != null && (auth.token.email === 'PERSON_ONE_EMAIL' || auth.token.email === 'PERSON_TWO_EMAIL')",
        ".write": "auth != null && (auth.token.email === 'PERSON_ONE_EMAIL' || auth.token.email === 'PERSON_TWO_EMAIL')"
      }
    }
  }
}
```

8. Publish the rules. Do not use public read/write rules such as `.read: true` or `.write: true`.
9. Upload the updated `firebase-config.js` to GitHub and wait for Pages to redeploy.
10. Open the published app on both phones. Sign in with the appropriate Firebase account when prompted. Changes should sync between the two phones while online.

### Security notes
- The web app's Firebase config is not a password; access is controlled by Authentication and the database rules.
- Restrict access to the two intended email addresses in the database rules. Do not use these rules if your account setup does not return the email claim as expected.
- Anyone who can edit the GitHub repository could alter the app code. Protect your GitHub account with a strong password and two-factor authentication.
- Avoid entering sensitive medical information. Meal notes are shared with both people.
- If you change the two account emails, update the database rules too.

## What is included
- Ten-day selector
- Shared daily checklist
- Meal planner for breakfast, lunch, dinner, and snacks
- Dairy/gluten ingredient-check reminder
- Meal-prep and freezer notes
- Water and movement tracker
- Daily notes and copyable summaries
- Installable home-screen experience

## How to update the app
Edit the files in your repository and commit the changes. GitHub Pages will publish the update automatically after deployment.
