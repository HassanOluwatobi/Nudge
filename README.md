# Nudge

One thing at a time. A focus app built for ADHD brains.

Nudge is a single-page web app with no build step and no server. Tasks are saved on each person's device. It installs to the home screen like an app.

## Deploy on Vercel

1. Put these files in a GitHub repo.
2. On vercel.com, click Add New, then Project, then import the repo.
3. Leave every setting as it is and click Deploy.

## Files

- `index.html` is the whole app.
- `manifest.webmanifest`, `sw.js` and the icons make it installable and work offline.
- `vercel.json` sets the right caching for the offline file.
