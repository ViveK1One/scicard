# SciCard

Paste a STEM equation, chemical reaction/structure, or concept → get a clean visual card with a plain-language Teach me explanation and PNG export.

## Local development

```bash
cp .env.example .env.local
# fill GROQ_API_KEY

npm install
npm run dev
```

Optional chemistry (RDKit FastAPI):

```bash
npm run chem
# CHEM_SERVICE_URL=http://127.0.0.1:8000 in .env.local
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js app |
| `npm run chem` | Chem microservice (Windows venv path) |
| `npm run test:detect` | Content-type detector tests |
| `npm run build` | Production build |

## Free launch

See **[LAUNCH.md](./LAUNCH.md)** for:

- Vercel deploy + env vars
- How to measure visitors and Teach me / export counts
- Rate limits, chem secret, and a soft-launch checklist

## Stack

- Next.js 14 + TypeScript + Tailwind
- KaTeX equations · RDKit chem service · Groq (Llama 3.3) Teach me
- Satori + resvg PNG export · Vercel Analytics
