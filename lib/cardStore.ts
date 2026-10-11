import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { isCardRecord, type CardRecord } from "@/lib/cardRecord";

const DIR = path.join(process.cwd(), "data", "cards");
/** UUID links already shared, plus new 22-character unguessable ids. */
const ID_RE =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[A-Za-z0-9_-]{16,64})$/i;

function assertProductionDatabase() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    !process.env.DATABASE_URL?.trim()
  ) {
    throw new Error(
      "DATABASE_URL is required in production. JSON files in data/cards are for local development only."
    );
  }
}

type Sql = import("postgres").Sql;
let sqlClient: Sql | null = null;
let ready: Promise<void> | null = null;

export function cardStoreKind(): "postgres" | "file" {
  return process.env.DATABASE_URL?.trim() ? "postgres" : "file";
}

function fileFor(id: string): string {
  if (!ID_RE.test(id)) {
    throw new Error("Invalid card id");
  }
  return path.join(DIR, `${id}.json`);
}

async function ensureDir() {
  await mkdir(DIR, { recursive: true });
}

async function db(): Promise<Sql | null> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!sqlClient) {
    const postgres = (await import("postgres")).default;
    sqlClient = postgres(url, {
      max: 1,
      idle_timeout: 20,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    });
  }
  if (!ready) {
    const sql = sqlClient;
    ready = sql`
      create table if not exists scicard_cards (
        id text primary key,
        updated_at timestamptz not null,
        data jsonb not null
      )
    `.then(() => undefined);
  }
  await ready;
  return sqlClient;
}

function asCard(value: unknown): CardRecord | null {
  if (typeof value === "string") {
    try {
      return asCard(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }
  return isCardRecord(value) ? value : null;
}

export async function saveCard(card: CardRecord): Promise<CardRecord> {
  assertProductionDatabase();
  const sql = await db();
  if (sql) {
    await sql`
      insert into scicard_cards (id, updated_at, data)
      values (${card.id}, ${card.updatedAt}, ${sql.json(card)})
      on conflict (id) do update
      set updated_at = excluded.updated_at,
          data = excluded.data
    `;
    return card;
  }

  await ensureDir();
  await writeFile(fileFor(card.id), JSON.stringify(card, null, 2), "utf8");
  return card;
}

export async function readCard(id: string): Promise<CardRecord | null> {
  assertProductionDatabase();
  if (!ID_RE.test(id)) return null;
  const sql = await db();
  if (sql) {
    const rows = await sql<{ data: unknown }[]>`
      select data from scicard_cards where id = ${id} limit 1
    `;
    return asCard(rows[0]?.data);
  }

  try {
    const raw = await readFile(fileFor(id), "utf8");
    return asCard(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function listCards(limit = 24): Promise<CardRecord[]> {
  const sql = await db();
  if (sql) {
    const rows = await sql<{ data: unknown }[]>`
      select data from scicard_cards
      order by updated_at desc
      limit ${limit}
    `;
    return rows
      .map((row) => asCard(row.data))
      .filter((card): card is CardRecord => card !== null);
  }

  await ensureDir();
  const names = await readdir(DIR);
  const cards: CardRecord[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const id = name.slice(0, -5);
    const card = await readCard(id);
    if (card) cards.push(card);
  }
  cards.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return cards.slice(0, limit);
}
