# SciCard launch

Public launch: the Next.js app on Vercel, chemistry on Railway or Render, cards in Neon Postgres, rate limits in Upstash Redis.

## Required environment variables

Set these on Vercel for Production and Preview. Copy names from `.env.example`.

| Name | Required in production | Purpose |
|------|------------------------|---------|
| `GROQ_API_KEY` | yes | Teach me. Server only. |
| `GROQ_MODEL` | no | Default `llama-3.3-70b-versatile` |
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `UPSTASH_REDIS_REST_URL` | yes | Rate limit, explanation cache, usage counts |
| `UPSTASH_REDIS_REST_TOKEN` | yes | Upstash token |
| `CHEM_SERVICE_URL` | for reactions | Public HTTPS URL of the chem host, no trailing slash |
| `CHEM_SERVICE_SECRET` | yes, if chem is on the internet | Same value on Vercel and the chem host. Without it, only localhost can render. |
| `USAGE_STATS_TOKEN` | recommended | Gates usage stats. Send as `Authorization: Bearer`, never in the URL. |
| `IMPRESSUM_NAME` | yes, before public traffic | Operator name |
| `IMPRESSUM_ADDRESS` | yes, before public traffic | Postal address. Use `\n` between lines |
| `IMPRESSUM_EMAIL` | yes, before public traffic | Contact email |

Next.js stays on 14.2.35, the last 14.2 release. The current major is 16. Moving there changes page `params` and `headers()` and is a separate upgrade.

The server refuses to boot in production if `DATABASE_URL`, both Upstash variables, or `GROQ_API_KEY` are missing. JSON files in `data/cards/` are for local development only.

Rotate `GROQ_API_KEY` if it was ever pasted into chat, a screenshot, or a commit.

## 1. Database

1. Create a free Neon project and copy the pooled connection string into `DATABASE_URL`.
2. Apply the schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

The app also runs `create table if not exists` on first use.

## 2. Redis

1. Create a free Upstash Redis database.
2. Copy the REST URL and token into the two `UPSTASH_REDIS_*` variables.

## 3. Deploy the Next.js app on Vercel

1. Push the repo to GitHub. Confirm `.env.local` is not in the commit (`git status` should not list it).
2. [vercel.com](https://vercel.com) → Import project → SciCard. Framework: Next.js.
3. Add every variable above.
4. Deploy.

Smoke test:

```bash
curl https://YOUR_DOMAIN/api/health
```

Expect `"ok": true`, `"cardStore": "postgres"`, `"redisConfigured": true`, `"groqConfigured": true`.

Then, on the site:

- [ ] Home opens on an empty paste with three examples
- [ ] Equation example renders
- [ ] Teach me returns text, and a bad key does not show a provider payload
- [ ] Edit the takeaway, then download PNG at 1.91:1, 1:1, and 4:5
- [ ] Save card copies a `/c/...` link that opens the same card
- [ ] `GET /api/cards` returns 404 (no public list)
- [ ] A wrong `/?card=` shows an error on the page
- [ ] Impressum shows your real name, address, and email
- [ ] Datenschutz and Terms open
- [ ] Reaction example draws when chem is deployed

## 4. Deploy the chem service

Skip this and equation plus concept cards still work. Reaction drawing needs the service.

Railway or Render, root directory `chem-service/`:

- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env: `CHEM_SERVICE_SECRET` set to the same value as Vercel. A public chem host without this secret refuses every render. Localhost still works without it.
- Then set Vercel `CHEM_SERVICE_URL` to that HTTPS origin and redeploy Vercel.
- Reaction drawing stays labeled beta in the editor. Uncommon names can fail.

Local chemistry:

```bash
npm run chem
```

That uses `chem-service/.venv` when it exists (Windows or macOS/Linux) and otherwise `python -m uvicorn`.

## 5. How to see usage

Vercel Web Analytics counts visits without cookies. No consent banner.

Teach me, export, chemistry, cache hits, and rate-limit hits:

```bash
curl -H "Authorization: Bearer YOUR_USAGE_STATS_TOKEN" "https://YOUR_DOMAIN/api/health?stats=1"
```

Keep that URL private.

## 6. What is already enforced

| Control | Where |
|---------|--------|
| Groq key server-only | `/api/explain` |
| Provider errors logged, not returned | explain, export, chem |
| Rate limits | every API route, Redis in production |
| Cards only by unguessable link | no public gallery |
| Card ids | 16 random bytes, base64url |
| Production database required | startup check |
| Security headers | `next.config.mjs` |
| AI mistake note | editor, public card, terms |
| Impressum / Datenschutz / Terms | `/impressum`, `/datenschutz`, `/terms` |
