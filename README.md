# Our Budget App — Railway Setup Guide

## What you need (both free)
- GitHub account → github.com
- Railway account → railway.app (sign up with GitHub)

---

## Step 1 — Put the files on GitHub

1. Go to **github.com** and sign in
2. Click the **+** icon (top right) → **New repository**
3. Name it `our-budget` → click **Create repository**
4. On the next page, click **uploading an existing file**
5. Upload ALL these files (keeping the `public` folder):
   - `server.js`
   - `package.json`
   - `railway.json`
   - `nixpacks.toml`
   - `public/index.html`
6. Click **Commit changes**

---

## Step 2 — Deploy on Railway

1. Go to **railway.app** → **Start a New Project**
2. Click **Deploy from GitHub repo**
3. Connect your GitHub account if asked
4. Select your `our-budget` repository
5. Railway will detect everything automatically and start building
6. Wait ~60 seconds for the green "Active" status

---

## Step 3 — Add a persistent volume (so data is never lost)

1. In your Railway project, click on your service
2. Click **Settings** → scroll to **Volumes**
3. Click **Add Volume**
4. Set mount path to `/data`
5. Click **Add** — Railway will redeploy automatically

---

## Step 4 — Get your URL

1. Click on your service → **Settings** → **Networking**
2. Click **Generate Domain**
3. Your app is live at something like `our-budget.up.railway.app`
4. **Bookmark this on both phones** — that's your shared app!

---

## You're done! 🎉

Both of you open the same URL on your phones. All expenses sync instantly because they go to the same database.

**To update budget amounts:** tap the Settings tab in the app.
