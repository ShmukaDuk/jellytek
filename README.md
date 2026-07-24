# jellytek.net

Static landing page — a bioluminescent canvas jellyfish. No build step, no
dependencies, no framework. Hosted on GitHub Pages behind GitHub's Fastly CDN
(which provides the network-level DDoS absorption).

## Local dev

Any static file server works:

```sh
python3 -m http.server 3100
# → http://localhost:3100
```

Edit `index.html`, `css/style.css`, or `js/jellyfish.js` and refresh.

## Deploy

Push to `main`. GitHub Pages serves the repo root (`.nojekyll` disables the
Jekyll pipeline, `CNAME` pins the custom domain).

One-time setup on GitHub:
1. Repo → Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
2. Custom domain: `jellytek.net` (pre-filled from the CNAME file) → wait for the
   DNS check → tick **Enforce HTTPS**.

DNS at the registrar for jellytek.net:

| Type  | Name | Value                                        |
|-------|------|----------------------------------------------|
| A     | @    | 185.199.108.153                              |
| A     | @    | 185.199.109.153                              |
| A     | @    | 185.199.110.153                              |
| A     | @    | 185.199.111.153                              |
| CNAME | www  | shmukaduk.github.io                          |
