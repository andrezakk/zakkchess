// Título, descrição e link canônico de cada página (para o Google e para links compartilhados).
import {useEffect} from 'react';

export const SITE_URL = 'https://zakkchess.netlify.app';

export type PageMeta = {title: string; description: string; path: string};

export const PAGES: Record<string, PageMeta> = {
  home: {
    path: '/',
    title: 'Análise grátis das suas partidas de xadrez | Zakk Chess',
    description:
      'Digite seu nick do Chess.com e analise suas partidas com o Stockfish, grátis e sem limite: nota de cada lance, precisão, rating estimado e onde você mais erra.',
  },
  pro: {
    path: '/pro/',
    title: 'Zakk Chess Pro: plano de treino de xadrez de 30 dias',
    description:
      'Diagnóstico das suas últimas 30 partidas do Chess.com, os erros que mais se repetem e um plano de treino de 30 dias. R$ 19,99 por mês, plano único.',
  },
};

function setMeta(selector: string, attr: string, value: string) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

export function useSeo(meta: PageMeta) {
  useEffect(() => {
    document.title = meta.title;
    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:url"]', 'content', SITE_URL + meta.path);
    setMeta('link[rel="canonical"]', 'href', SITE_URL + meta.path);
  }, [meta.title, meta.description, meta.path]);
}

/** Título simples para páginas internas (jogador, partida, relatório). */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Zakk Chess`;
  }, [title]);
}
