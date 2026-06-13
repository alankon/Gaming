# Security audit - alankon Gaming

Date: 2026-06-13

## Scope

- Flask local server: `app.py`
- Static games: menu, Git Grid 2048, Aprender Teclas
- GitHub Pages build output: `docs/`
- Server helpers: `server.sh`, `server.ps1`
- Sound downloader: `fetch_sounds.py`

## Checks performed

- Reviewed OWASP web risks with focus on broken access control, injection, security misconfiguration and vulnerable dependencies.
- Ran `npm audit --omit=dev --json`: no vulnerabilities found.
- Ran `python -m pip_audit -r requirements.txt --format json`: no vulnerabilities found.
- Ran `python -m bandit -r app.py build_static.py fetch_sounds.py -f json`: reviewed subprocess and URL fetch findings.
- Searched for risky browser sinks such as `innerHTML`, `eval`, `document.write`, dynamic fetches and secrets.

## Fixes applied

- `app.py` now validates `PORT` and keeps `HOST` local by default. `HOST=0.0.0.0` requires `ALLOW_LAN=1`.
- `app.py` uses resolved executable paths for Windows process utilities where available.
- `service-worker.js` ignores cross-origin requests so the app cache cannot interfere with third-party requests.
- `service-worker.js` cache name was bumped to force users onto the fresh build.
- `fetch_sounds.py` only fetches HTTPS URLs from Wikimedia hosts and caps downloaded sound files at 2 MB.
- `server.sh kill` no longer performs a broad kill of every Windows listener in ports `5000-5999` when the tracked port file is missing.
- `requirements.txt` now requires current safe major versions for Flask, Flask-WTF and Gunicorn.

## Current posture

- The Flask app is intended for local development. Public hosting should use the static `docs/` build on GitHub Pages.
- Shutdown endpoints are POST-only and local-only.
- User-visible dynamic text is written with `textContent`, avoiding HTML injection from keyboard input.
- The app has CSP, frame protection, nosniff, referrer policy and permissions policy headers when served by Flask.
- GitHub Pages has limited custom header control, so the static build relies on safe static content and the service worker cache policy.

## Residual risks

- `server.ps1 free-port` and `server.sh free-port` intentionally kill a chosen port. Use with an explicit port only.
- Browser audio/image assets are public static files. Keep future downloads from trusted public-domain or compatible-license sources.
- GitHub Pages cannot enforce the same Flask HTTP headers for every response without a proxy/CDN layer.
