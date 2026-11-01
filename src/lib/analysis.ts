import {Chess, type Square} from 'chess.js';
import {engine, type Score, type EngineLine} from './engine';

export type MoveClass =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export type Phase = 'abertura' | 'meio' | 'final';

export type ErrorType =
  | 'deixouMate'
  | 'perdeuMate'
  | 'pecaPendurada'
  | 'naoPuniu'
  | 'taticaPerdida'
  | 'posicional';

export type AnalyzedMove = {
  ply: number; // 1 = primeiro lance das brancas
  san: string;
  uci: string;
  color: 'w' | 'b';
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  evalAfter: Score; // do ponto de vista das brancas
  bestUci: string | null;
  bestSan: string | null;
  bestLineSan: string[];
  cls: MoveClass;
  loss: number; // pontos de chance de vitória perdidos (0 a 100)
  winAfter: number; // chance de vitória das brancas depois do lance (0 a 100)
  phase: Phase;
  errorType?: ErrorType;
  hungPiece?: string; // peça que ficou pendurada (p, n, b, r, q)
  mateIn?: number;
  clock?: number; // segundos restantes depois do lance
  timeTrouble?: boolean;
};

export type SideSummary = {
  accuracy: number;
  acpl: number;
  rating: number | null;
  counts: Record<MoveClass, number>;
};

export type GameAnalysis = {
  version: number;
  depth: number;
  startWin: number;
  moves: AnalyzedMove[];
  white: SideSummary;
  black: SideSummary;
  analyzedAt: number;
};

export const ANALYSIS_VERSION = 3;

export const CLASS_ORDER: MoveClass[] = [
  'brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder',
];

const VALUE: Record<string, number> = {p: 1, n: 3, b: 3, r: 5, q: 9, k: 0};

// ---------- utilidades de avaliação ----------

/** Converte a avaliação em "chance de vitória" (0 a 100). Fórmula pública usada pelo Lichess. */
export function winPercent(s: Score): number {
  if (s.mate !== undefined) return s.mate > 0 ? 100 : s.mate < 0 ? 0 : 50;
  const cp = Math.max(-1500, Math.min(1500, s.cp ?? 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

function cpValue(s: Score): number {
  if (s.mate !== undefined) return s.mate > 0 ? 1000 : -1000;
  return Math.max(-1000, Math.min(1000, s.cp ?? 0));
}

function negate(s: Score): Score {
  if (s.mate !== undefined) return {mate: -s.mate};
  return {cp: -(s.cp ?? 0)};
}

/** Precisão de um lance (0 a 100) a partir da chance perdida. */
function moveAccuracy(loss: number) {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));
}

/** Rating estimado a partir da precisão da partida. Aproximação própria, só como referência. */
const RATING_TABLE: [number, number][] = [
  [30, 200], [40, 350], [50, 550], [60, 800], [70, 1100], [75, 1300], [80, 1550], [85, 1850], [90, 2200],
  [94, 2500], [97, 2750], [100, 3000],
];
export function estimateRating(accuracy: number): number {
  if (accuracy <= RATING_TABLE[0][0]) return RATING_TABLE[0][1];
  for (let i = 1; i < RATING_TABLE.length; i++) {
    const [a1, r1] = RATING_TABLE[i];
    const [a0, r0] = RATING_TABLE[i - 1];
    if (accuracy <= a1) return Math.round((r0 + ((accuracy - a0) / (a1 - a0)) * (r1 - r0)) / 25) * 25;
  }
  return 3000;
}

function phaseOf(fen: string, ply: number): Phase {
  const board = fen.split(' ')[0];
  const pieces = (board.match(/[nbrqNBRQ]/g) ?? []).length;
  if (pieces <= 6) return 'final';
  if (ply <= 20) return 'abertura';
  return 'meio';
}

function parseClocks(pgn: string): number[] {
  const out: number[] = [];
  const re = /\[%clk (\d+):(\d+):(\d+(?:\.\d+)?)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pgn))) out.push(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
  return out;
}

function baseTime(pgn: string): number | null {
  const tc = /\[TimeControl "([^"]+)"\]/.exec(pgn)?.[1];
  if (!tc || tc.includes('/')) return null; // partida diária
  return Number(tc.split('+')[0]) || null;
}

function uciToSan(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move({from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined});
    return m.san;
  } catch {
    return null;
  }
}

function pvToSan(fen: string, pv: string[], max = 5): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const uci of pv.slice(0, max)) {
    try {
      out.push(c.move({from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined}).san);
    } catch {
      break;
    }
  }
  return out;
}

/** Valor da peça capturada por um lance (em notação UCI) numa posição. */
function captureValue(fen: string, uci: string | null): {value: number; piece?: string} {
  if (!uci) return {value: 0};
  const c = new Chess(fen);
  const target = c.get(uci.slice(2, 4) as Square);
  if (target) return {value: VALUE[target.type], piece: target.type};
  // en passant
  const mover = c.get(uci.slice(0, 2) as Square);
  if (mover?.type === 'p' && uci[0] !== uci[2]) return {value: 1, piece: 'p'};
  return {value: 0};
}

function givesCheck(fen: string, uci: string | null) {
  if (!uci) return false;
  try {
    const c = new Chess(fen);
    c.move({from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined});
    return c.inCheck();
  } catch {
    return false;
  }
}

/** O lance deixou material de propósito para o adversário capturar? */
function isSacrifice(fenBefore: string, fenAfter: string, from: string, to: string, color: 'w' | 'b'): boolean {
  const before = new Chess(fenBefore);
  const moved = before.get(from as Square);
  if (!moved || moved.type === 'p' || moved.type === 'k') return false;
  const captured = before.get(to as Square);
  const gain = captured ? VALUE[captured.type] : 0;
  const after = new Chess(fenAfter);
  const enemy = color === 'w' ? 'b' : 'w';
  const attackers = after.attackers(to as Square, enemy);
  if (attackers.length === 0) return false;
  const defenders = after.attackers(to as Square, color);
  const cheapest = Math.min(...attackers.map((sq) => VALUE[after.get(sq)!.type] || 100));
  const pieceValue = VALUE[moved.type];
  const loses = defenders.length === 0 ? pieceValue - gain : pieceValue - cheapest - gain;
  return loses >= 2;
}

// ---------- análise principal ----------

export type Progress = {done: number; total: number};

export async function analyzeGame(
  pgn: string,
  depth: number,
  onProgress?: (p: Progress) => void,
  signal?: {cancelled: boolean},
): Promise<GameAnalysis> {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({verbose: true});
  const clocks = parseClocks(pgn);
  const base = baseTime(pgn);

  const fens = [history[0]?.before ?? chess.fen(), ...history.map((m) => m.after)];
  const total = fens.length;
  const lines: EngineLine[][] = [];

  engine.newGame();
  for (let i = 0; i < fens.length; i++) {
    if (signal?.cancelled) throw new Error('cancelled');
    const pos = new Chess(fens[i]);
    if (pos.isCheckmate()) {
      lines.push([{score: {mate: 0}, pv: [], depth}]);
    } else if (pos.isDraw() || pos.isStalemate()) {
      lines.push([{score: {cp: 0}, pv: [], depth}]);
    } else {
      lines.push(await engine.analyze(fens[i], depth, 2));
    }
    onProgress?.({done: i + 1, total});
  }

  // Avaliação de cada posição do ponto de vista das brancas.
  const whiteScore = (i: number): Score => {
    const s = lines[i][0]?.score ?? {cp: 0};
    const turn = fens[i].split(' ')[1];
    if (s.mate === 0) return turn === 'w' ? {mate: -1} : {mate: 1}; // quem está levando mate perdeu
    return turn === 'w' ? s : negate(s);
  };

  const moves: AnalyzedMove[] = [];
  const losses: Record<'w' | 'b', number[]> = {w: [], b: []};
  const cpLosses: Record<'w' | 'b', number[]> = {w: [], b: []};

  history.forEach((m, idx) => {
    const ply = idx + 1;
    const color = m.color;
    const sign = color === 'w' ? 1 : -1;
    const before = whiteScore(idx);
    const after = whiteScore(idx + 1);
    const winBeforeW = winPercent(before);
    const winAfterW = winPercent(after);
    const winBefore = color === 'w' ? winBeforeW : 100 - winBeforeW;
    const winAfterMover = color === 'w' ? winAfterW : 100 - winAfterW;
    const best = lines[idx][0];
    const second = lines[idx][1];
    const bestUci = best?.pv[0] ?? null;
    const uci = m.from + m.to + (m.promotion ?? '');
    const isBest = bestUci === uci;
    let loss = isBest ? 0 : Math.max(0, winBefore - winAfterMover);
    const cpLoss = isBest ? 0 : Math.max(0, sign * (cpValue(before) - cpValue(after)));

    let cls: MoveClass;
    if (loss < 2) {
      cls = isBest ? 'best' : 'excellent';
      const secondWin = second ? winPercent(second.score) : null;
      const bestWin = best ? winPercent(best.score) : null;
      const moverAfterScore = color === 'w' ? after : negate(after);
      const forcesMate = moverAfterScore.mate !== undefined && moverAfterScore.mate > 0;
      if (
        isSacrifice(m.before, m.after, m.from, m.to, color) &&
        winAfterMover >= 50 &&
        (winBefore < 95 || forcesMate) &&
        loss < 1.5
      ) {
        cls = 'brilliant';
      } else if (isBest && secondWin !== null && bestWin !== null && bestWin - secondWin >= 15 && winBefore < 90 && winAfterMover >= 40) {
        cls = 'great';
      } else if (ply <= 12 && loss < 1.5) {
        cls = 'book';
      }
    } else if (loss < 5) cls = 'good';
    else if (loss < 10) cls = 'inaccuracy';
    else if (loss < 20) cls = 'mistake';
    else cls = 'blunder';

    // Uma partida já decidida não deve gerar "erro grave" por detalhes.
    if ((cls === 'mistake' || cls === 'blunder') && winAfterMover >= 85) {
      cls = 'inaccuracy';
      loss = Math.min(loss, 9.9);
    }

    const move: AnalyzedMove = {
      ply,
      san: m.san,
      uci,
      color,
      from: m.from,
      to: m.to,
      fenBefore: m.before,
      fenAfter: m.after,
      evalAfter: after,
      bestUci,
      bestSan: bestUci ? uciToSan(m.before, bestUci) : null,
      bestLineSan: best ? pvToSan(m.before, best.pv) : [],
      cls,
      loss: Math.round(loss * 10) / 10,
      winAfter: Math.round(winAfterW * 10) / 10,
      phase: phaseOf(m.before, ply),
    };

    if (clocks[idx] !== undefined) {
      move.clock = clocks[idx];
      if (base) move.timeTrouble = clocks[idx] < Math.max(15, base * 0.1);
    }

    if (cls === 'inaccuracy' || cls === 'mistake' || cls === 'blunder') {
      const moverBefore = color === 'w' ? before : negate(before);
      const moverAfter = color === 'w' ? after : negate(after);
      const replyUci = lines[idx + 1]?.[0]?.pv[0] ?? null;
      const reply = captureValue(m.after, replyUci);
      const bestCap = captureValue(m.before, bestUci);
      const prev = moves[moves.length - 1];
      if (moverAfter.mate !== undefined && moverAfter.mate < 0 && !(moverBefore.mate !== undefined && moverBefore.mate < 0)) {
        move.errorType = 'deixouMate';
        move.mateIn = Math.abs(moverAfter.mate);
      } else if (moverBefore.mate !== undefined && moverBefore.mate > 0 && !(moverAfter.mate !== undefined && moverAfter.mate > 0)) {
        move.errorType = 'perdeuMate';
        move.mateIn = moverBefore.mate;
      } else if (reply.value >= 3 && loss >= 10) {
        move.errorType = 'pecaPendurada';
        move.hungPiece = reply.piece;
      } else if (prev && (prev.cls === 'mistake' || prev.cls === 'blunder') && loss >= 10) {
        move.errorType = 'naoPuniu';
      } else if ((bestCap.value >= 3 || givesCheck(m.before, bestUci)) && loss >= 10) {
        move.errorType = 'taticaPerdida';
      } else {
        move.errorType = 'posicional';
      }
    }

    losses[color].push(loss);
    cpLosses[color].push(cpLoss);
    moves.push(move);
  });

  const summarize = (c: 'w' | 'b'): SideSummary => {
    const counts = Object.fromEntries(CLASS_ORDER.map((k) => [k, 0])) as Record<MoveClass, number>;
    moves.filter((m) => m.color === c).forEach((m) => counts[m.cls]++);
    const accs = losses[c].map(moveAccuracy);
    if (accs.length === 0) return {accuracy: 0, acpl: 0, rating: null, counts};
    const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
    const harmonic = accs.length / accs.reduce((a, b) => a + 1 / Math.max(1, b), 0);
    const accuracy = Math.round(((mean + harmonic) / 2) * 10) / 10;
    const acpl = Math.round(cpLosses[c].reduce((a, b) => a + b, 0) / cpLosses[c].length);
    return {accuracy, acpl, rating: accs.length >= 8 ? estimateRating(accuracy) : null, counts};
  };

  return {
    version: ANALYSIS_VERSION,
    depth,
    startWin: Math.round(winPercent(whiteScore(0)) * 10) / 10,
    moves,
    white: summarize('w'),
    black: summarize('b'),
    analyzedAt: Date.now(),
  };
}
