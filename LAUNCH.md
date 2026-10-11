# SciCard — free soft-launch guide

End-to-end checklist to put SciCard on the internet without paid infra (hobby tiers).

## What you are deploying

| Piece | Role | Free host |
|--------|------|-----------|
| Next.js app | UI + `/api/explain` + `/api/export` + chem proxy | **Vercel** |
| Groq | Teach me LLM | Groq free tier key |
| Chem service | RDKit SMILES → SVG | **Railway / Render / Fly** (or defer chemistry) |

## 1. Secure secrets first

1. **Rotate `GROQ_API_KEY`** if it was ever pasted in chat, screenshots, or commits.
2. Copy `.env.example` → `.env.local` locally. Never commit `.env` / `.env.local`.
3. Generate two random secrets (password manager or `openssl rand -hex 24`):
   - `CHEM_SERVICE_SECRET` — shared by Vercel ↔ chem service
   - `USAGE_STATS_TOKEN` — only you use this to read usage counts

## 2. Deploy Next.js on Vercel

1. Push the repo to GitHub (private is fine).
2. [vercel.com](https://vercel.com) → Import project → select SciCard.
3. Framework: Next.js (auto).
4. **Environment variables** (Production + Preview):

| Name | Value |
|------|--------|
| `GROQ_API_KEY` | your new Groq key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| `CHEM_SERVICE_URL` | `https://your-chem-host.example` (or leave blank until chem is up) |
| `CHEM_SERVICE_SECRET` | same secret as chem host |
| `USAGE_STATS_TOKEN` | private token for stats |

5. Deploy. Open `https://your-project.vercel.app`.
6. In Vercel → **Analytics** → enable Web Analytics (free hobby).

Smoke checks:

```bash
curl https://your-project.vercel.app/api/health
# {"ok":true,"service":"scicard","chemConfigured":true|false,"groqConfigured":true}
```

## 3. Deploy chem service (optional for day-1)

If you skip this, equation + concept still work; reaction cards need the service.

1. Deploy `chem-service/` as a Python/Docker web service (Railway/Render/Fly).
2. Start command example: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Set env on chem host: `CHEM_SERVICE_SECRET=<same as Vercel>`.
4. Set Vercel `CHEM_SERVICE_URL` to that public HTTPS URL (no trailing slash).
5. Redeploy Vercel so the env change applies.

Local chem (dev only):

```bash
npm run chem
# CHEM_SERVICE_URL=http://127.0.0.1:8000
```

## 4. How you know user count

### A. Visitors (people)

- **Vercel Analytics** dashboard → unique visitors / page views after you enable it.

### B. Product actions (Teach me / export)

- Client events: `teach_me`, `export_png` via `@vercel/analytics` (show under Analytics → Custom events when available).
- Server counters (process-local, reset on cold start — early signal only):

```bash
curl "https://your-project.vercel.app/api/health?stats=1&token=YOUR_USAGE_STATS_TOKEN"
```

Returns roughly:

```json
{
  "ok": true,
  "usage": {
    "startedAt": "...",
    "explain": 12,
    "explainCached": 40,
    "export": 9,
    "chem": 5,
    "rateLimited": 0
  }
}
```

Later (when you outgrow this): PostHog / Umami / Supabase event table.

## 5. Security already wired for soft launch

| Control | Where |
|---------|--------|
| Groq key server-only | `/api/explain` |
| Rate limits | explain 20/10m, export 40/10m, chem 60/10m per IP |
| Input size caps | explain / chem routes |
| Chem shared secret | `x-scicard-chem-secret` when `CHEM_SERVICE_SECRET` set |
| Security headers | `next.config.mjs` (nosniff, frame deny, referrer) |
| Usage stats gated | `USAGE_STATS_TOKEN` |

## 6. Soft-launch day checklist

- [ ] New Groq key in Vercel (old key revoked)
- [ ] `/api/health` returns `groqConfigured: true`
- [ ] Teach me works on production URL
- [ ] PNG download works
- [ ] Vercel Analytics enabled
- [ ] Chem live **or** Reaction path labeled as beta
- [ ] Tweet / LinkedIn link points at production URL
- [ ] You bookmarked the `?stats=1&token=...` URL privately

## 7. Day-1 vs later

**Day 1 (free):** Vercel + Groq + Analytics + rate limits. Chemistry optional.

**Later:** Upstash Redis rate limits (multi-region), auth/waitlist, durable analytics DB, custom domain.
