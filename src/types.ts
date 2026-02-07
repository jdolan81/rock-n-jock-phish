export interface SongPicks {
  opener: string;
  set1Closer: string;
  set2Opener: string;
  set2Closer: string;
  encore: string;
  wildcards: [string, string];
  rockNJock: {
    song: string;
    set: '1' | '2' | '';
    position: number;
  };
}

export interface ScoreBreakdown {
  opener: boolean;
  set1Closer: boolean;
  set2Opener: boolean;
  set2Closer: boolean;
  encore: boolean;
  wildcards: [boolean, boolean];
  rockNJock: boolean;
}

export interface Player {
  id: string;
  name: string;
  picks: SongPicks;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface Setlist {
  set1: string[];
  set2: string[];
  encore: string[];
}

export interface Game {
  id: string;
  code: string;
  lockTime: string;
  players: Player[];
  setlist: Setlist;
  status: 'lobby' | 'active' | 'completed';
  venue?: string;
  // Phase 1: Lock mechanism
  isLocked: boolean;
  lockedAt?: string;
  lockedPlayerIds?: string[];
  // Phase 2: Live refresh
  lastRefreshed?: string;
  showStatus?: 'live' | 'final';
}