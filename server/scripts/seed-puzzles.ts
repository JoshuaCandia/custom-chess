import "dotenv/config";
import https from "https";
import { decompress } from "fzstd";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();
const CSV_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB compressed

const TARGETS = { beginner: 100, intermediate: 200, advanced: 150, expert: 50 } as const;
type Bucket = keyof typeof TARGETS;

interface PuzzleRow {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string;
}

function getBucket(rating: number): Bucket | null {
  if (rating < 1200) return "beginner";
  if (rating < 1700) return "intermediate";
  if (rating < 2200) return "advanced";
  return "expert";
}

async function main() {
  console.log("[seed] Descargando CSV de Lichess (primeros 5 MB)...");
  const rows = await downloadAndParse();
  console.log(`[seed] ${rows.length} puzzles muestreados. Insertando...`);

  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(
      batch.map((p) =>
        prisma.puzzle.upsert({ where: { id: p.id }, update: {}, create: p })
      )
    );
    process.stdout.write(`\r[seed] ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log("\n[seed] Listo.");
  await prisma.$disconnect();
}

async function downloadAndParse(): Promise<PuzzleRow[]> {
  const buckets: Record<Bucket, PuzzleRow[]> = {
    beginner: [],
    intermediate: [],
    advanced: [],
    expert: [],
  };

  return new Promise<PuzzleRow[]>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    https.get(CSV_URL, (res) => {
      res.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        totalBytes += chunk.length;
        if (totalBytes >= MAX_BYTES) res.destroy();
      });

      res.on("close", () => {
        try {
          const compressed = Buffer.concat(chunks);
          let text: string;
          try {
            const decompressed = decompress(new Uint8Array(compressed));
            text = Buffer.from(decompressed).toString("utf-8");
          } catch {
            throw new Error("fzstd no pudo descomprimir. Intentá con más de 5 MB.");
          }

          const lines = text.split("\n");
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",");
            if (cols.length < 8) continue;
            const rating = parseInt(cols[3], 10);
            if (isNaN(rating)) continue;
            const bucket = getBucket(rating);
            if (!bucket) continue;
            if (buckets[bucket].length >= TARGETS[bucket]) continue;

            const themesArr = cols[7].trim().split(" ").filter(Boolean);
            buckets[bucket].push({
              id: cols[0].trim(),
              fen: cols[1].trim(),
              moves: cols[2].trim(),
              rating,
              themes: JSON.stringify(themesArr),
            });

            const allFull = (Object.keys(TARGETS) as Bucket[]).every(
              (k) => buckets[k].length >= TARGETS[k]
            );
            if (allFull) break;
          }

          resolve(Object.values(buckets).flat());
        } catch (e) {
          reject(e);
        }
      });

      res.on("error", reject);
    }).on("error", reject);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
