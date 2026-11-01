// Estado da assinatura Pro no navegador. O "passe" é assinado pelo servidor;
// o status é conferido no Mercado Pago a cada poucas horas.
import {useEffect, useState} from 'react';

const PASS_KEY = 'zc:pro-pass';
const CACHE_KEY = 'zc:pro-status';
const CACHE_MS = 6 * 60 * 60 * 1000;

export type ProInfo = {
  active: boolean;
  status: string;
  nextPayment: string | null;
  paidUntil: string | null;
};

type State = {loading: boolean; info: ProInfo | null; hasPass: boolean};

let state: State = {loading: false, info: null, hasPass: false};
const listeners = new Set<() => void>();
const emit = (patch: Partial<State>) => {
  state = {...state, ...patch};
  listeners.forEach((l) => l());
};

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/pro/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : {'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({error: 'Resposta inválida do servidor.'}));
  if (!res.ok) throw new Error(data.error ?? 'Algo deu errado. Tente de novo.');
  return data as T;
}

function savePass(pass: string, info: ProInfo) {
  localStorage.setItem(PASS_KEY, pass);
  localStorage.setItem(CACHE_KEY, JSON.stringify({at: Date.now(), info}));
  emit({info, hasPass: true, loading: false});
}

let checked = false;
export async function refreshPro(force = false) {
  const pass = localStorage.getItem(PASS_KEY);
  if (!pass) {
    emit({hasPass: false, info: null, loading: false});
    return;
  }
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as {at: number; info: ProInfo} | null;
  if (cached && !force && Date.now() - cached.at < CACHE_MS) {
    emit({hasPass: true, info: cached.info});
    return;
  }
  emit({hasPass: true, loading: true, info: cached?.info ?? null});
  try {
    const info = await api<ProInfo>('status', {pass});
    localStorage.setItem(CACHE_KEY, JSON.stringify({at: Date.now(), info}));
    emit({info, loading: false});
  } catch (e) {
    // Passe inválido: apaga. Falha de rede: mantém o último estado conhecido.
    if (e instanceof Error && /inválido/i.test(e.message)) {
      localStorage.removeItem(PASS_KEY);
      localStorage.removeItem(CACHE_KEY);
      emit({hasPass: false, info: null, loading: false});
    } else emit({loading: false});
  }
}

export function usePro() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    if (!checked) {
      checked = true;
      void refreshPro();
    } else l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return {...state, isPro: !!state.info?.active};
}

export async function startCheckout() {
  const {url} = await api<{url: string}>('checkout');
  window.location.href = url;
}

export async function activate(preapprovalId: string): Promise<ProInfo> {
  const r = await api<ProInfo & {pass: string | null}>('activate', {preapproval_id: preapprovalId});
  if (r.pass) savePass(r.pass, r);
  return r;
}

export async function restore(email: string): Promise<ProInfo> {
  const r = await api<ProInfo & {pass: string}>('restore', {email});
  savePass(r.pass, r);
  return r;
}

export async function cancelPro(): Promise<ProInfo> {
  const pass = localStorage.getItem(PASS_KEY);
  const info = await api<ProInfo>('cancel', {pass});
  localStorage.setItem(CACHE_KEY, JSON.stringify({at: Date.now(), info}));
  emit({info});
  return info;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', {day: '2-digit', month: 'long'});
}
