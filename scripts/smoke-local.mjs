const base = process.env.SMOKE_URL || "http://127.0.0.1:3000";

async function check(name, fn) {
  try {
    const detail = await fn();
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
    return true;
  } catch (err) {
    console.log(`FAIL ${name} — ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

const results = [];

results.push(
  await check("health", async () => {
    const res = await fetch(`${base}/api/health`);
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(`status ${res.status}`);
    return `cardStore=${body.cardStore}`;
  })
);

results.push(
  await check("stats token rejected in URL", async () => {
    const res = await fetch(`${base}/api/health?stats=1&token=x`);
    if (res.status !== 400) throw new Error(`status ${res.status}`);
  })
);

results.push(
  await check("card list is private", async () => {
    const res = await fetch(`${base}/api/cards`);
    if (res.status !== 404) throw new Error(`status ${res.status}`);
  })
);

let cardId = "";
results.push(
  await check("save card", async () => {
    const res = await fetch(`${base}/api/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: "E = mc^2",
        contentType: "equation",
        explanation: null,
        themeMode: "light",
        themeAccent: "graphite",
        aspectRatioId: "portrait",
      }),
    });
    const body = await res.json();
    if (res.status !== 201 || !body.card?.id) throw new Error(`status ${res.status}`);
    cardId = body.card.id;
    if (cardId.length < 16) throw new Error(`id too short: ${cardId}`);
    return `id length ${cardId.length}`;
  })
);

results.push(
  await check("bad JSON save is a JSON error", async () => {
    const res = await fetch(`${base}/api/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const type = res.headers.get("content-type") || "";
    if (res.status !== 400 || !type.includes("application/json")) {
      throw new Error(`status ${res.status} ${type}`);
    }
  })
);

results.push(
  await check("share page", async () => {
    const res = await fetch(`${base}/c/${cardId}`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const html = await res.text();
    if (!html.includes("og:image")) throw new Error("missing og:image");
  })
);

for (const [label, width, height] of [
  ["1.91:1", 1200, 628],
  ["1:1", 1080, 1080],
  ["4:5", 1080, 1350],
]) {
  results.push(
    await check(`export ${label}`, async () => {
      const res = await fetch(`${base}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "equation",
          input: "E = mc^2",
          width,
          height,
          pixelRatio: 1,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const size = res.headers.get("x-scicard-size") || "";
      if (size !== `${width}x${height}`) throw new Error(`size ${size}`);
      return size;
    })
  );
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
