export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  theme?: string;
  elo?: number;
}

export interface GameRecord {
  id: string;
  result: "white" | "black" | "draw";
  reason: string;
  color: "white" | "black";
  opponent: string;
  moveCount: number;
  timeControl: number | null;
  playedAt: string;
}

export interface UserStats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  asWhite: { played: number; wins: number; losses: number; draws: number };
  asBlack: { played: number; wins: number; losses: number; draws: number };
  recentGames: GameRecord[];
}

export interface UserProfile {
  id: string;
  username: string;
  createdAt: string;
  elo: number;
  stats: UserStats;
}
