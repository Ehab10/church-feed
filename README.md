# church-feed

A minimal RSS feed for pulling posts into ChMeetings. An admin adds posts through a small web form; a GitHub Action rebuilds `feed.xml` and publishes it via GitHub Pages automatically.

- **Feed URL** (paste this into ChMeetings): `https://<owner>.github.io/<repo>/feed.xml`
- **Admin form**: `https://<owner>.github.io/<repo>/admin/`

## 1. Create the repo and push this code

From inside this folder:

```bash
git init
git add .
git commit -m "Initial commit"

# create the repo on your account (requires GitHub CLI: https://cli.github.com)
gh repo create church-feed --public --source=. --remote=origin --push
```

No `gh` CLI? Create the repo manually at github.com/new (public, no README/gitignore/license — this folder already has them), then:

```bash
git remote add origin https://github.com/<your-username>/church-feed.git
git branch -M main
git push -u origin main
```

## 2. Enable GitHub Pages

In the repo on GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

That's it — no branch to pick. The included workflow (`.github/workflows/build.yml`) handles the build and deploy on every push to `main`.

Push once (the initial commit already does this) and check the **Actions** tab — the "Build and deploy feed" workflow should run and finish green. Your feed will then be live at:

```
https://<your-username>.github.io/church-feed/feed.xml
```

## 3. Generate a token for the admin form

The admin form writes new posts straight to the repo using the GitHub API, so it needs a token:

1. GitHub → your avatar → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Repository access**: only select `church-feed`.
3. **Permissions**: `Contents` → **Read and write**. Also grant `Actions` → **Read-only** — the admin page uses it to tell when the feed-build workflow is running and pause saves/deletes until it finishes, avoiding a race where a post gets edited while the previous commit is still landing. Without it, saving still works, just without that guard.
4. Generate, copy the token (starts with `github_pat_...`).

Keep this token private — anyone with it can write to the repo. It's stored only in the browser's local storage on whichever device opens the admin form (not committed anywhere).

## 4. Use the admin form

Open `https://<your-username>.github.io/church-feed/admin/`, expand **Connection settings**, and fill in:

- **GitHub username**: your username
- **Repository name**: `church-feed`
- **Branch**: `main`
- **Personal access token**: the token from step 3

Click **Save settings**, then fill in a post (title, body, optional link, optional image) and click **Pin post**. Within about a minute the Action rebuilds and republishes `feed.xml`.

Delete the example post at `posts/2026-08-20-welcome.md` (or via `git rm` + push) once you're adding real ones — it's only there so the first build has something to render.

Switch to the **Manage Posts** tab to see every post in the repo, edit one (loads it back into the form; saving commits to the same file instead of creating a new post), or delete one (also removes its image, if it has one). Editing and deleting need the same token as pinning a post; viewing the list works without one.

## 5. Point ChMeetings at the feed

In ChMeetings' RSS pull-in settings, use:

```
https://<your-username>.github.io/church-feed/feed.xml
```

## How it's structured

```
posts/*.md          one file per post — frontmatter (title, date, link, image) + Markdown body
posts/images/        images uploaded through the admin form
admin/index.html      "pin a post" form plus a Manage Posts tab to view/edit/delete posts (all via the GitHub API)
scripts/build-feed.js  reads /posts, generates feed.xml
.github/workflows/build.yml  runs the build and deploys to Pages on every push
```

## Notes

- The repo is public by design — the feed itself must be reachable by ChMeetings over the internet regardless, so there's no privacy gained by making the source private, and public keeps GitHub Pages free.
- The admin page has no login of its own — it relies on the token, which only you hold. Anyone who finds the URL without the token can't write anything.
- Feed title/description can be changed via the `FEED_TITLE` / `FEED_DESCRIPTION` env vars near the top of `.github/workflows/build.yml`.
