// Assinatura do Zakk Chess Pro via Mercado Pago (R$ 19,99 por mês, plano único).
//
// Rotas:
//   GET  /api/pro/checkout   -> devolve o link de pagamento do Mercado Pago
//   POST /api/pro/activate   -> confere a assinatura que voltou do Mercado Pago e devolve o "passe Pro"
//   POST /api/pro/status     -> confere se um passe Pro continua válido
//   POST /api/pro/restore    -> recupera o passe pelo e-mail da conta Mercado Pago
//   POST /api/pro/cancel     -> cancela a assinatura
//
// Variáveis de ambiente (configuradas no painel do Netlify, nunca no código):
//   MP_ACCESS_TOKEN  chave de acesso do Mercado Pago (Credenciais de produção)
//   PRO_SECRET       (opcional) segredo do passe Pro; se faltar, é derivado do MP_ACCESS_TOKEN
import {timingSafeEqual} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import type {Config, Context} from '@netlify/functions';

const MP_API = 'https://api.mercadopago.com';
const PRICE = 19.99;
const PLAN_KEY = `plan-${PRICE}`;
const DAY = 24 * 60 * 60 * 1000;

type Preapproval = {
  id: string;
  status: string; // pending | authorized | paused | cancelled
  payer_email?: string;
  preapproval_plan_id?: string;
  next_payment_date?: string;
  summarized?: {last_charged_date?: string | null};
};

const json = (data: unknown, status = 200) => Response.json(data, {status, headers: {'cache-control': 'no-store'}});

function env(name: string): string {
  const v = Netlify.env.get(name);
  if (!v) throw new HttpError(503, 'O pagamento ainda não foi configurado. Tente de novo mais tarde.');
  return v;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function mp<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(MP_API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${env('MP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('Mercado Pago', res.status, path, body.slice(0, 500));
    if (res.status === 404) throw new HttpError(404, 'Assinatura não encontrada.');
    throw new HttpError(502, 'O Mercado Pago não respondeu agora. Tente de novo em instantes.');
  }
  return (await res.json()) as T;
}

/** Cria o plano de R$ 19,99/mês uma única vez e guarda o id. */
async function getPlan(siteUrl: string): Promise<{id: string; init_point: string}> {
  const store = getStore({name: 'pro', consistency: 'strong'});
  const saved = (await store.get(PLAN_KEY, {type: 'json'})) as {id: string; init_point: string} | null;
  if (saved) return saved;
  const plan = await mp<{id: string; init_point: string}>('/preapproval_plan', {
    method: 'POST',
    body: JSON.stringify({
      reason: 'Zakk Chess Pro',
      back_url: `${siteUrl}/pro/ativar`,
      auto_recurring: {frequency: 1, frequency_type: 'months', transaction_amount: PRICE, currency_id: 'BRL'},
    }),
  });
  const value = {id: plan.id, init_point: plan.init_point};
  await store.setJSON(PLAN_KEY, value);
  return value;
}

// ---------- passe Pro (assinado com HMAC) ----------

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString('base64url');

async function hmac(data: string): Promise<string> {
  const secret = Netlify.env.get('PRO_SECRET') || `zakkchess-pro|${env('MP_ACCESS_TOKEN')}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

async function makePass(pid: string): Promise<string> {
  const payload = Buffer.from(JSON.stringify({pid, iat: Date.now()})).toString('base64url');
  return `${payload}.${await hmac(payload)}`;
}

async function readPass(pass: unknown): Promise<string> {
  if (typeof pass !== 'string' || !pass.includes('.')) throw new HttpError(401, 'Passe Pro inválido.');
  const [payload, sig] = pass.split('.');
  const expected = await hmac(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new HttpError(401, 'Passe Pro inválido.');
  }
  const {pid} = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {pid: string};
  return pid;
}

// ---------- regras ----------

/** Ativo se a assinatura está em dia, ou se foi cancelada mas o mês pago ainda não acabou. */
function summarize(p: Preapproval) {
  const last = p.summarized?.last_charged_date ? Date.parse(p.summarized.last_charged_date) : null;
  const paidUntil = last ? last + 31 * DAY : null;
  const active = p.status === 'authorized' || (!!paidUntil && paidUntil > Date.now() && p.status !== 'pending');
  return {
    active,
    status: p.status,
    nextPayment: p.status === 'authorized' ? (p.next_payment_date ?? null) : null,
    paidUntil: p.status !== 'authorized' && paidUntil ? new Date(paidUntil).toISOString() : null,
  };
}

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'Pedido inválido.');
  }
}

export default async (req: Request, context: Context) => {
  const action = new URL(req.url).pathname.split('/').pop();
  const siteUrl = (Netlify.env.get('URL') ?? context.site.url ?? '').replace(/\/$/, '');
  try {
    switch (action) {
      case 'checkout': {
        const plan = await getPlan(siteUrl);
        return json({url: plan.init_point});
      }
      case 'activate': {
        const {preapproval_id} = await body(req);
        if (typeof preapproval_id !== 'string' || !/^[\w-]{6,64}$/.test(preapproval_id)) {
          throw new HttpError(400, 'Código de assinatura inválido.');
        }
        const plan = await getPlan(siteUrl);
        const p = await mp<Preapproval>(`/preapproval/${preapproval_id}`);
        if (p.preapproval_plan_id && p.preapproval_plan_id !== plan.id) throw new HttpError(404, 'Assinatura não encontrada.');
        const info = summarize(p);
        if (!info.active) return json({...info, pass: null});
        return json({...info, pass: await makePass(p.id)});
      }
      case 'status': {
        const {pass} = await body(req);
        const pid = await readPass(pass);
        return json(summarize(await mp<Preapproval>(`/preapproval/${pid}`)));
      }
      case 'restore': {
        const {email} = await body(req);
        if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || email.length > 200) {
          throw new HttpError(400, 'Digite um e-mail válido.');
        }
        const plan = await getPlan(siteUrl);
        const q = new URLSearchParams({payer_email: email.trim().toLowerCase(), preapproval_plan_id: plan.id});
        const found = await mp<{results?: Preapproval[]}>(`/preapproval/search?${q}`);
        const best = (found.results ?? []).map((p) => ({p, info: summarize(p)})).find((x) => x.info.active);
        if (!best) {
          throw new HttpError(404, 'Não achamos uma assinatura ativa com esse e-mail. Use o e-mail da sua conta do Mercado Pago.');
        }
        return json({...best.info, pass: await makePass(best.p.id)});
      }
      case 'cancel': {
        const {pass} = await body(req);
        const pid = await readPass(pass);
        const p = await mp<Preapproval>(`/preapproval/${pid}`, {method: 'PUT', body: JSON.stringify({status: 'cancelled'})});
        return json(summarize(p));
      }
      default:
        return json({error: 'Rota não encontrada.'}, 404);
    }
  } catch (e) {
    if (e instanceof HttpError) return json({error: e.message}, e.status);
    console.error(e);
    return json({error: 'Algo deu errado. Tente de novo.'}, 500);
  }
};

export const config: Config = {
  path: ['/api/pro/checkout', '/api/pro/activate', '/api/pro/status', '/api/pro/restore', '/api/pro/cancel'],
  method: ['GET', 'POST'],
  rateLimit: {windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain']},
};
