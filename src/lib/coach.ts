// Textos prontos do mascote (sem nenhum serviço pago), montados com os dados da análise.
import type {AnalyzedMove, ErrorType, MoveClass, Phase} from './analysis';

export const MASCOT_NAME = 'Pipo';

export const CLASS_INFO: Record<MoveClass, {label: string; symbol: string; color: string}> = {
  brilliant: {label: 'Brilhante', symbol: '!!', color: '#2ec4d6'},
  great: {label: 'Ótimo', symbol: '!', color: '#6c9ef8'},
  best: {label: 'Melhor', symbol: '★', color: '#4fd1b0'},
  excellent: {label: 'Excelente', symbol: '✓', color: '#86d66b'},
  good: {label: 'Bom', symbol: '✓', color: '#a7b98a'},
  book: {label: 'Teoria', symbol: '≡', color: '#c4a77d'},
  inaccuracy: {label: 'Imprecisão', symbol: '?!', color: '#f3c04f'},
  mistake: {label: 'Erro', symbol: '?', color: '#f5904a'},
  blunder: {label: 'Erro grave', symbol: '??', color: '#ff5e57'},
};

export const PIECE_NAME: Record<string, string> = {
  p: 'um peão', n: 'o cavalo', b: 'o bispo', r: 'a torre', q: 'a dama', k: 'o rei',
};

export const PHASE_LABEL: Record<Phase, string> = {abertura: 'Abertura', meio: 'Meio-jogo', final: 'Final'};

export const ERROR_LABEL: Record<ErrorType, string> = {
  pecaPendurada: 'Peça pendurada',
  taticaPerdida: 'Tática perdida',
  naoPuniu: 'Não puniu o erro do adversário',
  deixouMate: 'Deixou mate',
  perdeuMate: 'Perdeu um mate',
  posicional: 'Erro de plano',
};

export type Mood = 'happy' | 'wow' | 'oops' | 'think';

function moveNumber(ply: number) {
  return Math.ceil(ply / 2);
}

/** Converte notação inglesa (N, B, R, Q, K) para a portuguesa (C, B, T, D, R). */
export function sanPt(san: string | null | undefined): string {
  if (!san) return '';
  return san.replace(/[NBRQK]/g, (c) => ({N: 'C', B: 'B', R: 'T', Q: 'D', K: 'R'})[c]!);
}

export function coachLine(m: AnalyzedMove, isUser: boolean, opponent: string): {text: string; mood: Mood} {
  const n = moveNumber(m.ply);
  const san = sanPt(m.san);
  const best = sanPt(m.bestSan);
  const who = isUser ? 'Você' : opponent;
  const lower = isUser ? 'você' : opponent;

  switch (m.cls) {
    case 'brilliant':
      return {mood: 'wow', text: `Lance ${n}: ${san} é brilhante! ${who} entregou material e a conta fecha.`};
    case 'great':
      return {mood: 'wow', text: `Lance ${n}: ${san} era o único lance que segurava a posição. Muito bem visto.`};
    case 'best':
      return {mood: 'happy', text: `Lance ${n}: ${san} é exatamente o que o Stockfish jogaria.`};
    case 'excellent':
      return {mood: 'happy', text: `Lance ${n}: ${san} é excelente, praticamente tão bom quanto o melhor.`};
    case 'good':
      return {mood: 'happy', text: `Lance ${n}: ${san} é um lance sólido.${best ? ` O mais preciso era ${best}.` : ''}`};
    case 'book':
      return {mood: 'happy', text: `Lance ${n}: ${san} é teoria de abertura conhecida.`};
    case 'inaccuracy':
      return {mood: 'think', text: `Lance ${n}: ${san} é uma imprecisão. ${best ? `${best} era mais preciso.` : ''}`};
    default:
      break;
  }

  const tail = best ? ` O melhor era ${best}.` : '';
  const clock = m.timeTrouble ? ' E com pouco tempo no relógio, isso pesa.' : '';
  switch (m.errorType) {
    case 'deixouMate':
      return {mood: 'oops', text: `Lance ${n}: depois de ${san}, o adversário tem mate em ${m.mateIn}.${tail}${clock}`};
    case 'perdeuMate':
      return {mood: 'oops', text: `Lance ${n}: ${lower === 'você' ? 'você tinha' : `${opponent} tinha`} mate em ${m.mateIn} e jogou ${san}.${tail}`};
    case 'pecaPendurada':
      return {
        mood: 'oops',
        text: `Lance ${n}: ${who} jogou ${san} e deixou ${PIECE_NAME[m.hungPiece ?? 'p']} sem defesa.${tail}${clock}`,
      };
    case 'naoPuniu':
      return {mood: 'think', text: `Lance ${n}: o adversário tinha acabado de errar, mas ${san} deixou passar.${tail}`};
    case 'taticaPerdida':
      return {mood: 'think', text: `Lance ${n}: tinha uma tática aqui e ${san} não aproveitou.${tail}`};
    default:
      return {
        mood: 'oops',
        text: `Lance ${n}: ${san} piorou bastante a posição.${tail}${clock}`,
      };
  }
}
