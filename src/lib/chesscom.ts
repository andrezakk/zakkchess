// Leitura da API pública do Chess.com (não precisa de chave).

export type ChessComPlayer = {
  username: string;
  avatar?: string;
  name?: string;
  country?: string;
  url: string;
};

export type Ratings = Partial<Record<'rapid' | 'blitz' | 'bullet' | 'daily', number>>;

export type ChessComGame = {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  uuid: string;
  time_class: 'rapid' | 'blitz' | 'bullet' | 'daily';
  rules: string;
  eco?: string;
  white: {username: string; rating: number; result: string};
  black: {username: string; rating: number; result: string};
};

export class ChessComError extends Error {
  constructor(message: string, public kind: 'notFound' | 'rateLimit' | 'network') {
    super(message);
  }
}

const API = 'https://api.chess.com/pub/player';
const memo = new Map<string, unknown>();

async function getJson<T>(url: string, cacheable = true): Promise<T> {
  if (cacheable && memo.has(url)) return memo.get(url) as T;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ChessComError('Sem conexão com o Chess.com. Confira sua internet e tente de novo.', 'network');
  }
  if (res.status === 404 || res.status === 410) {
    throw new ChessComError('Não encontramos esse nick no Chess.com. Confira a grafia e tente de novo.', 'notFound');
  }
  if (res.status === 429 || res.status === 403) {
    throw new ChessComError('O Chess.com pediu uma pausa nas consultas. Espere alguns segundos e tente de novo.', 'rateLimit');
  }
  if (!res.ok) throw new ChessComError('O Chess.com não respondeu agora. Tente de novo em instantes.', 'network');
  const data = (await res.json()) as T;
  if (cacheable) memo.set(url, data);
  return data;
}

export async function getPlayer(username: string): Promise<ChessComPlayer> {
  return getJson<ChessComPlayer>(`${API}/${encodeURIComponent(username.toLowerCase())}`);
}

export async function getRatings(username: string): Promise<Ratings> {
  type Stats = Record<string, {last?: {rating: number}}>;
  const s = await getJson<Stats>(`${API}/${encodeURIComponent(username.toLowerCase())}/stats`);
  return {
    rapid: s.chess_rapid?.last?.rating,
    blitz: s.chess_blitz?.last?.rating,
    bullet: s.chess_bullet?.last?.rating,
    daily: s.chess_daily?.last?.rating,
  };
}

/** Lista de meses com partidas, do mais recente para o mais antigo, no formato "2025/03". */
export async function getArchives(username: string): Promise<string[]> {
  const d = await getJson<{archives: string[]}>(`${API}/${encodeURIComponent(username.toLowerCase())}/games/archives`);
  return d.archives.map((u) => u.split('/games/')[1]).reverse();
}

export async function getMonth(username: string, month: string): Promise<ChessComGame[]> {
  const d = await getJson<{games: ChessComGame[]}>(
    `${API}/${encodeURIComponent(username.toLowerCase())}/games/${month}`,
  );
  return d.games.filter((g) => g.rules === 'chess' && g.pgn).sort((a, b) => b.end_time - a.end_time);
}

// ---------- ajudantes de exibição ----------

const DRAWS = ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'];

export type Outcome = 'win' | 'loss' | 'draw';

export function userSide(g: ChessComGame, username: string): 'white' | 'black' {
  return g.white.username.toLowerCase() === username.toLowerCase() ? 'white' : 'black';
}

export function outcomeFor(g: ChessComGame, username: string): Outcome {
  const r = g[userSide(g, username)].result;
  if (r === 'win') return 'win';
  if (DRAWS.includes(r)) return 'draw';
  return 'loss';
}

export function openingName(g: ChessComGame): string | null {
  const url = g.eco ?? /\[ECOUrl "([^"]+)"\]/.exec(g.pgn)?.[1];
  if (!url) return null;
  const slug = decodeURIComponent(url.split('/openings/')[1] ?? '');
  if (!slug) return null;
  const name = slug.split(/-\d/)[0].replace(/-/g, ' ').trim();
  return name || null;
}

export function timeControlLabel(tc: string): string {
  if (tc.includes('/')) {
    const days = Math.round(Number(tc.split('/')[1]) / 86400);
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  const [base, inc] = tc.split('+').map(Number);
  const min = base >= 60 ? `${Math.round(base / 60)} min` : `${base} s`;
  return inc ? `${min} + ${inc}` : min;
}

export const TIME_CLASS_LABEL: Record<string, string> = {
  rapid: 'Rápida',
  blitz: 'Blitz',
  bullet: 'Bullet',
  daily: 'Diária',
};

export function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'});
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('/').map(Number);
  const d = new Date(y, m - 1, 1);
  const s = d.toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'});
  return s.charAt(0).toUpperCase() + s.slice(1);
}
