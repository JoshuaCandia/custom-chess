import "dotenv/config";
import https from "https";
import { Decompress } from "fzstd";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>;
const CSV_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst";

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
  console.log("[seed] Descargando y descomprimiendo CSV de Lichess (streaming)...");
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

function isFull(buckets: Record<Bucket, PuzzleRow[]>): boolean {
  return (Object.keys(TARGETS) as Bucket[]).every((k) => buckets[k].length >= TARGETS[k]);
}

function parseLine(line: string, buckets: Record<Bucket, PuzzleRow[]>): void {
  const cols = line.split(",");
  if (cols.length < 8) return;
  const rating = parseInt(cols[3], 10);
  if (isNaN(rating)) return;
  const bucket = getBucket(rating);
  if (!bucket) return;
  if (buckets[bucket].length >= TARGETS[bucket]) return;

  const themesArr = cols[7].trim().split(" ").filter(Boolean);
  buckets[bucket].push({
    id: cols[0].trim(),
    fen: cols[1].trim(),
    moves: cols[2].trim(),
    rating,
    themes: JSON.stringify(themesArr),
  });
}

async function downloadAndParse(): Promise<PuzzleRow[]> {
  const buckets: Record<Bucket, PuzzleRow[]> = {
    beginner: [],
    intermediate: [],
    advanced: [],
    expert: [],
  };

  return new Promise<PuzzleRow[]>((resolve, reject) => {
    let leftover = "";
    let headerSkipped = false;

    const decompressor = new Decompress((chunk, final) => {
      const text = leftover + Buffer.from(chunk).toString("utf-8");
      const lines = text.split("\n");
      // Keep the last (possibly incomplete) line for the next chunk
      leftover = final ? "" : (lines.pop() ?? "");

      for (const line of lines) {
        if (!headerSkipped) {
          headerSkipped = true;
          continue;
        }
        parseLine(line, buckets);
      }
    });

    const req = https.get(CSV_URL, (res) => {
      res.on("data", (chunk: Buffer) => {
        decompressor.push(new Uint8Array(chunk));
        if (isFull(buckets)) {
          res.destroy();
        }
      });

      res.on("close", () => {
        // Signal end of stream (flush any remaining data)
        try {
          decompressor.push(new Uint8Array(0), true);
        } catch {
          // Ignore error on aborted stream (partial zstd frame is expected)
        }
        resolve(Object.values(buckets).flat());
      });

      res.on("error", reject);
    });

    req.on("error", reject);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
