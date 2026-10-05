export type PlayerId = 0 | 1;

export interface Score {
  points: [number, number];
  games: [number, number];
  tiebreak: boolean;
  server: PlayerId;
  /** -1 while the set is still being played. */
  winner: -1 | PlayerId;
}

export function newScore(server: PlayerId = 0): Score {
  return { points: [0, 0], games: [0, 0], tiebreak: false, server, winner: -1 };
}

const other = (p: PlayerId): PlayerId => (p === 0 ? 1 : 0);

/** Returns a new Score after `w` wins the point. */
export function pointWon(prev: Score, w: PlayerId): Score {
  const s: Score = {
    points: [...prev.points],
    games: [...prev.games],
    tiebreak: prev.tiebreak,
    server: prev.server,
    winner: prev.winner,
  };
  const o = other(w);
  s.points[w]++;

  const lead = s.points[w] - s.points[o];
  const gameDone = s.tiebreak ? s.points[w] >= 7 && lead >= 2 : s.points[w] >= 4 && lead >= 2;

  if (!gameDone) {
    // Tiebreak: the server changes after the first point, then every two points.
    if (s.tiebreak && (s.points[0] + s.points[1]) % 2 === 1) s.server = other(s.server);
    return s;
  }

  s.games[w]++;
  s.points = [0, 0];
  s.server = other(s.server);
  s.tiebreak = false;

  if (s.games[w] === 7 || (s.games[w] >= 6 && s.games[w] - s.games[o] >= 2)) {
    s.winner = w;
  } else if (s.games[0] === 6 && s.games[1] === 6) {
    s.tiebreak = true;
  }
  return s;
}

const LABELS = ['0', '15', '30', '40'];

export function pointLabel(s: Score, p: PlayerId): string {
  const o = other(p);
  if (s.tiebreak) return String(s.points[p]);
  if (s.points[p] >= 3 && s.points[o] >= 3) return s.points[p] > s.points[o] ? 'Ad' : '40';
  return LABELS[Math.min(s.points[p], 3)];
}

/** 0 = the server's right-hand court, 1 = left. */
export function serveSide(s: Score): 0 | 1 {
  return ((s.points[0] + s.points[1]) % 2) as 0 | 1;
}
