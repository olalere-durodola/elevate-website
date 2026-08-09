# Elevate Basketball — setup

The site works right now with no setup at all. Open `index.html` and it runs
on the content in `assets/seed.js`.

What setup buys you: coaches update scores and rosters from their phones, and
tryout requests get saved instead of thrown away.

Budget about 20 minutes. You do this once.

---

## What you are building

```
        ┌────────────────────┐
        │  index.html        │   free static hosting
        │  + assets/         │   (Netlify, Cloudflare, GitHub Pages)
        └─────────┬──────────┘
                  │  reads on load, writes when a coach saves
        ┌─────────▼──────────┐
        │  Supabase          │   free tier
        │  teams · site      │
        │  leads             │
        └────────────────────┘
```

Parents get a plain static page. Coaches get `?edit`. Nothing else changes.

---

## Step 1 — Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up. The free tier is
   enough for a youth program by a wide margin.
2. **New project**. Name it `elevate`. Pick the region closest to Prosper —
   `us-east-1` is fine. Save the database password somewhere; you will not
   need it for this, but losing it is annoying later.
3. Wait for it to finish provisioning, about two minutes.

## Step 2 — Create the tables

1. In the left sidebar, open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repo, copy all of it, paste it in.
3. Press **Run**.

You should see `Success. No rows returned`. That is what success looks like
for this script.

This creates three tables and, more importantly, the rules that make the
public key safe to publish: anyone may read the site, only signed-in coaches
may change it, and nobody but a coach can read the tryout requests.

## Step 3 — Connect the site

1. Go to **Project Settings** → **API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `assets/config.js` and paste them in:

```js
window.CONFIG = {
  SUPABASE_URL: "https://abcdefgh.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...",
  REDIRECT_URL: ""
};
```

The anon key is meant to be public — it is in every visitor's browser by
design, and the rules from Step 2 are what actually protect the data. Do not
paste the **service_role** key here. That one bypasses every rule.

## Step 4 — Add yourself as a coach

1. **Authentication** → **Users** → **Add user** → **Send invitation**.
2. Enter your email. You get an invite email; click it.

Repeat for every coach who should be able to edit. There is no public
sign-up, so the only people who can ever get in are the ones on this list.
Removing a coach is deleting them from this list.

## Step 5 — Put the first content in

1. Open the site with `?edit` on the end of the address.
2. Sign in with the email you just added.
3. Change anything, however small, and press **Save changes**.

That first save writes all six teams and the site content into the database.
From then on, the database is the source of truth and `seed.js` is only the
fallback if the network is down.

---

## Deploying it

Any host that serves static files works. Nothing needs to be built or compiled.

**Netlify** (easiest if you want drag-and-drop)

- Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the
  project folder in. That is the whole process.
- Or connect the GitHub repo for automatic deploys on every push. Leave the
  build command empty and the publish directory as `/`.

**Cloudflare Pages**

- Connect the repo. Framework preset: **None**. Build command: empty. Output
  directory: `/`.

**GitHub Pages**

- Repo **Settings** → **Pages** → deploy from `main`, folder `/ (root)`.

Once you have a real address, go back to Supabase → **Authentication** →
**URL Configuration** and add it under **Redirect URLs**. Sign-in links will
not work until you do. Add both your live address and
`http://localhost:*` if you want to keep testing locally.

### Custom domain

All three hosts do custom domains free with HTTPS. Buy the domain wherever
you like, then follow the host's domain instructions — it is a DNS record and
about ten minutes of waiting.

---

## Using it day to day

**Getting in.** Add `?edit` to the address, or press `Ctrl+Shift+E` on any
page. There is also a small **Coach sign-in** button in the bottom corner
after you have closed the console once.

**Editing.** The site stays visible next to the console on a laptop, and
above it on a phone. Every change shows up on the real page as you type.
Nothing is public until you press **Save changes**.

**Posting a score.** Schedule tab → find the game → switch it from
*Not played yet* to *Won* or *Lost* → the last box turns into a score box →
type `W 68-51` → Save.

**Announcements** are the strip at the very top of the page. Site tab →
Announcements. Delete them when they go stale; if you delete them all, the
strip disappears rather than sitting there empty.

**Tryout requests** land in the Requests tab. Tick *Followed up* so the next
coach knows you have it.

**Two coaches at once.** If someone else saved while you had the console
open, you get told which teams changed and asked before anything is
overwritten. Whoever saves last wins, so it is worth reading that prompt.

---

## If something goes wrong

**"That address is not set up to edit this site."**
The email is not in Authentication → Users. Add it, or check for a typo.

**The sign-in link opens the site but does not sign me in.**
The address you are on is not in Supabase's Redirect URLs list. Step 4 of
Deploying, above.

**Coaches' changes are not showing for parents.**
Hard-refresh once (`Ctrl+Shift+R`). If it still shows the old content, open
the browser console — a failed load is logged there, and the site falls back
to `seed.js` on purpose rather than showing a blank page.

**Everything looks like plain unstyled text.**
The `assets/` folder did not get uploaded, or is in the wrong place. It must
sit next to `index.html`.

**I want to start over.**
Delete the rows in the `teams` and `site` tables. The site falls back to
`seed.js`, and the next save writes fresh rows.

---

## What is in the repo

| Path | What it does |
|---|---|
| `index.html` | The page structure. Rarely needs editing. |
| `assets/config.js` | **Your two Supabase values.** The only file you must edit. |
| `assets/seed.js` | Content baked into the page. The offline fallback. |
| `assets/site.css` | All the site's styling. |
| `assets/site.js` | Draws the page from whatever content is loaded. |
| `assets/hero.js` | The shot-arc animation behind the headline. |
| `assets/form.js` | The tryout request form. |
| `assets/backend.js` | Everything that talks to Supabase. |
| `assets/console.js` | The coach's edit console. |
| `assets/console.css` | Styling for the console. |
| `supabase/schema.sql` | Tables and access rules. Run once. |

---

## Cost

Free, at your scale. Supabase's free tier covers 500MB of database and
50,000 monthly active users; this site's entire content is measured in
kilobytes and the "users" are the handful of coaches who sign in. Static
hosting is free on all three hosts above. A domain is roughly $12 a year if
you want one.

The one thing to know: Supabase pauses a free project after a week with no
activity. A paused project means parents see the `seed.js` content instead of
live scores — the site stays up, it just stops updating. Any visit to the
dashboard wakes it, and in season the site will be busy enough that it never
pauses. If it becomes a nuisance, the Pro tier is $25/month and removes it.
