// Fila de análises: uma partida por vez, para não travar o celular.
import {useEffect, useState} from 'react';
import {analyzeGame} from './analysis';
import type {ChessComGame} from './chesscom';
import {getDepth, loadAnalysis, saveAnalysis} from './storage';

type Job = {username: string; month: string; game: ChessComGame};

type State = {
  current: {uuid: string; done: number; total: number} | null;
  queue: string[];
  errors: Record<string, string>;
};

let state: State = {current: null, queue: [], errors: {}};
const jobs = new Map<string, Job>();
const listeners = new Set<() => void>();
let running = false;

function emit(patch: Partial<State>) {
  state = {...state, ...patch};
  listeners.forEach((l) => l());
}

export function enqueue(job: Job, priority = false) {
  const id = job.game.uuid;
  if (loadAnalysis(job.username, id)) return;
  if (state.current?.uuid === id) return;
  jobs.set(id, job);
  const rest = state.queue.filter((q) => q !== id);
  emit({queue: priority ? [id, ...rest] : [...rest, id]});
  void loop();
}

export function cancelQueue() {
  emit({queue: []});
}

async function loop() {
  if (running) return;
  running = true;
  while (state.queue.length) {
    const [id, ...rest] = state.queue;
    const job = jobs.get(id)!;
    emit({queue: rest, current: {uuid: id, done: 0, total: 1}});
    try {
      const analysis = await analyzeGame(job.game.pgn, getDepth(), (p) =>
        emit({current: {uuid: id, done: p.done, total: p.total}}),
      );
      saveAnalysis(job.username, job.month, job.game, analysis);
    } catch (e) {
      emit({errors: {...state.errors, [id]: e instanceof Error ? e.message : 'Falha na análise.'}});
    }
    emit({current: null});
  }
  running = false;
}

export function useRunner(): State {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

/** Atualiza o componente quando uma análise nova é salva. */
export function useAnalysesVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const l = () => setV((n) => n + 1);
    window.addEventListener('zc:analysis', l);
    return () => window.removeEventListener('zc:analysis', l);
  }, []);
  return v;
}
