import type {
  DailyPuzzleResponse,
  PuzzlesListResponse,
  PuzzleStats,
  PuzzleWithStatus,
} from "../types/puzzle";

const BASE = "/api/puzzles";

export async function apiFetchDailyPuzzle(): Promise<DailyPuzzleResponse> {
  const res = await fetch(`${BASE}/daily`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch daily puzzle");
  return res.json() as Promise<DailyPuzzleResponse>;
}

export interface PuzzleFilter {
  theme?: string;
  minRating?: number;
  maxRating?: number;
  limit?: number;
  exclude?: string[];
}

export async function apiFetchPuzzles(filter: PuzzleFilter = {}): Promise<PuzzlesListResponse> {
  const params = new URLSearchParams();
  if (filter.theme) params.set("theme", filter.theme);
  if (filter.minRating !== undefined) params.set("minRating", String(filter.minRating));
  if (filter.maxRating !== undefined) params.set("maxRating", String(filter.maxRating));
  if (filter.limit !== undefined) params.set("limit", String(filter.limit));
  if (filter.exclude?.length) params.set("exclude", filter.exclude.join(","));

  const res = await fetch(`${BASE}?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch puzzles");
  return res.json() as Promise<PuzzlesListResponse>;
}

export async function apiFetchPuzzleById(id: string): Promise<{ puzzle: PuzzleWithStatus }> {
  const res = await fetch(`${BASE}/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Puzzle not found");
  return res.json() as Promise<{ puzzle: PuzzleWithStatus }>;
}

export async function apiRecordAttempt(puzzleId: string, solved: boolean): Promise<void> {
  await fetch(`${BASE}/${puzzleId}/attempt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ solved }),
  });
}

export async function apiFetchMyPuzzleStats(): Promise<PuzzleStats> {
  const res = await fetch(`${BASE}/me/stats`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch puzzle stats");
  return res.json() as Promise<PuzzleStats>;
}
