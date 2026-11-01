// Guarda as análises no próprio aparelho (localStorage), para não analisar duas vezes
// a mesma partida e para montar o relatório com várias partidas.
import {ANALYSIS_VERSION, type GameAnalysis} from './analysis';
import type {ChessComGame} from './chesscom';

const PREFIX = 'zc:a:';
const MAX_SAVED = 150;

export type SavedAnalysis = {
  username: string; // dono do relatório (em minúsculas)
  month: string;
  game: Omit<ChessComGame, 'pgn'> & {pgn?: string};
  analysis: GameAnalysis;
};

function key(username: string, uuid: string) {
  return `${PREFIX}${username.toLowerCase()}:${uuid}`;
}

export function loadAnalysis(username: string, uuid: string): SavedAnalysis | null {
  try {
    const raw = localStorage.getItem(key(username, uuid));
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedAnalysis;
    return s.analysis.version === ANALYSIS_VERSION ? s : null;
  } catch {
    return null;
  }
}

export function saveAnalysis(username: string, month: string, game: ChessComGame, analysis: GameAnalysis) {
  const {pgn: _pgn, ...meta} = game;
  void _pgn;
  const value: SavedAnalysis = {username: username.toLowerCase(), month, game: meta, analysis};
  const write = () => localStorage.setItem(key(username, game.uuid), JSON.stringify(value));
  try {
    write();
  } catch {
    // Sem espaço: apaga as análises mais antigas e tenta de novo.
    pruneOldest(20);
    try {
      write();
    } catch {
      /* segue sem salvar */
    }
  }
  if (allKeys().length > MAX_SAVED) pruneOldest(allKeys().length - MAX_SAVED);
  window.dispatchEvent(new Event('zc:analysis'));
}

function allKeys(): string[] {
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) out.push(k);
  }
  return out;
}

function pruneOldest(n: number) {
  const items = allKeys()
    .map((k) => {
      try {
        return {k, t: (JSON.parse(localStorage.getItem(k)!) as SavedAnalysis).analysis.analyzedAt};
      } catch {
        return {k, t: 0};
      }
    })
    .sort((a, b) => a.t - b.t);
  items.slice(0, n).forEach((i) => localStorage.removeItem(i.k));
}

export function listAnalyses(username: string): SavedAnalysis[] {
  const prefix = `${PREFIX}${username.toLowerCase()}:`;
  return allKeys()
    .filter((k) => k.startsWith(prefix))
    .map((k) => {
      try {
        return JSON.parse(localStorage.getItem(k)!) as SavedAnalysis;
      } catch {
        return null;
      }
    })
    .filter((s): s is SavedAnalysis => !!s && s.analysis.version === ANALYSIS_VERSION)
    .sort((a, b) => b.game.end_time - a.game.end_time);
}

export function analyzedUuids(username: string): Set<string> {
  return new Set(listAnalyses(username).map((s) => s.game.uuid));
}

const DEPTH_KEY = 'zc:depth';
export function getDepth(): number {
  return Number(localStorage.getItem(DEPTH_KEY)) || 14;
}
export function setDepth(d: number) {
  localStorage.setItem(DEPTH_KEY, String(d));
}
