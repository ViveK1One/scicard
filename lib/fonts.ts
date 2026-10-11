import { readFile } from "fs/promises";
import path from "path";

let cached:
  | {
      name: string;
      data: ArrayBuffer;
      weight: 400 | 600;
      style: "normal";
    }[]
  | null = null;

export async function loadExportFonts() {
  if (cached) return cached;

  const base = path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "inter",
    "files"
  );

  const [regular, semibold] = await Promise.all([
    readFile(path.join(base, "inter-latin-400-normal.woff")),
    readFile(path.join(base, "inter-latin-600-normal.woff")),
  ]);

  cached = [
    {
      name: "Inter",
      data: regular.buffer.slice(
        regular.byteOffset,
        regular.byteOffset + regular.byteLength
      ) as ArrayBuffer,
      weight: 400,
      style: "normal",
    },
    {
      name: "Inter",
      data: semibold.buffer.slice(
        semibold.byteOffset,
        semibold.byteOffset + semibold.byteLength
      ) as ArrayBuffer,
      weight: 600,
      style: "normal",
    },
  ];

  return cached;
}
