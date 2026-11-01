// Relatório "onde você mais erra" + plano de treino de 30 dias, a partir das partidas analisadas.
import type {AnalyzedMove, ErrorType, Phase} from './analysis';
import {ERROR_LABEL, PHASE_LABEL, sanPt} from './coach';
import {openingName, outcomeFor, userSide, type ChessComGame} from './chesscom';
import type {SavedAnalysis} from './storage';

export type Moment = {
  saved: SavedAnalysis;
  move: AnalyzedMove;
  opponent: string;
};

export type Report = {
  games: number;
  accuracy: number;
  rating: number | null;
  results: {win: number; loss: number; draw: number};
  phases: {phase: Phase; errors: number; share: number}[];
  types: {type: ErrorType; count: number; share: number}[];
  timeTroubleErrors: number;
  totalErrors: number;
  openings: {name: string; games: number; score: number; accuracy: number}[];
  worstMoments: Moment[];
  brilliants: number;
  weakPhase: Phase | null;
  weakType: ErrorType | null;
};

const ERROR_CLASSES = new Set(['inaccuracy', 'mistake', 'blunder']);
const WEIGHT = {inaccuracy: 1, mistake: 2, blunder: 3} as Record<string, number>;

export function buildReport(username: string, items: SavedAnalysis[]): Report {
  const phaseErr: Record<Phase, number> = {abertura: 0, meio: 0, final: 0};
  const typeCount = {} as Record<ErrorType, number>;
  const results = {win: 0, loss: 0, draw: 0};
  const openings = new Map<string, {games: number; points: number; accSum: number}>();
  const moments: Moment[] = [];
  let accSum = 0;
  let ratingSum = 0;
  let ratingN = 0;
  let timeTrouble = 0;
  let total = 0;
  let brilliants = 0;

  for (const s of items) {
    const g = s.game as ChessComGame;
    const side = userSide(g, username);
    const color = side === 'white' ? 'w' : 'b';
    const sum = side === 'white' ? s.analysis.white : s.analysis.black;
    const opponent = side === 'white' ? g.black.username : g.white.username;
    accSum += sum.accuracy;
    if (sum.rating) {
      ratingSum += sum.rating;
      ratingN++;
    }
    brilliants += sum.counts.brilliant;
    const out = outcomeFor(g, username);
    results[out]++;

    const op = openingName(g) ?? 'Abertura sem nome';
    const o = openings.get(op) ?? {games: 0, points: 0, accSum: 0};
    o.games++;
    o.points += out === 'win' ? 1 : out === 'draw' ? 0.5 : 0;
    o.accSum += sum.accuracy;
    openings.set(op, o);

    for (const m of s.analysis.moves) {
      if (m.color !== color || !ERROR_CLASSES.has(m.cls)) continue;
      const w = WEIGHT[m.cls];
      phaseErr[m.phase] += w;
      total += w;
      if (m.timeTrouble) timeTrouble += w;
      if (m.errorType && m.cls !== 'inaccuracy') typeCount[m.errorType] = (typeCount[m.errorType] ?? 0) + 1;
      if (m.cls === 'blunder' || m.cls === 'mistake') moments.push({saved: s, move: m, opponent});
    }
  }

  const phases = (Object.keys(phaseErr) as Phase[]).map((p) => ({
    phase: p,
    errors: phaseErr[p],
    share: total ? Math.round((phaseErr[p] / total) * 100) : 0,
  }));
  const typeTotal = Object.values(typeCount).reduce((a, b) => a + b, 0);
  const types = (Object.keys(typeCount) as ErrorType[])
    .map((t) => ({type: t, count: typeCount[t], share: typeTotal ? Math.round((typeCount[t] / typeTotal) * 100) : 0}))
    .sort((a, b) => b.count - a.count);

  const weakPhase = total ? [...phases].sort((a, b) => b.errors - a.errors)[0].phase : null;

  return {
    games: items.length,
    accuracy: items.length ? Math.round((accSum / items.length) * 10) / 10 : 0,
    rating: ratingN ? Math.round(ratingSum / ratingN / 25) * 25 : null,
    results,
    phases,
    types,
    timeTroubleErrors: total ? Math.round((timeTrouble / total) * 100) : 0,
    totalErrors: total,
    openings: [...openings.entries()]
      .map(([name, o]) => ({name, games: o.games, score: Math.round((o.points / o.games) * 100), accuracy: Math.round(o.accSum / o.games)}))
      .sort((a, b) => b.games - a.games)
      .slice(0, 5),
    worstMoments: moments.sort((a, b) => b.move.loss - a.move.loss).slice(0, 5),
    brilliants,
    weakPhase,
    weakType: types[0]?.type ?? null,
  };
}

export function diagnosis(r: Report): string {
  if (!r.totalErrors) return 'Nenhum erro sério nas partidas analisadas. Analise mais partidas para eu achar um padrão.';
  const phase = r.phases.find((p) => p.phase === r.weakPhase)!;
  let text = `${phase.share}% dos seus erros acontecem no ${PHASE_LABEL[phase.phase].toLowerCase()}`;
  if (r.weakType) {
    const t = r.types[0];
    text += `, e o tipo que mais se repete é "${ERROR_LABEL[t.type].toLowerCase()}" (${t.count} ${t.count === 1 ? 'vez' : 'vezes'})`;
  }
  text += '.';
  if (r.timeTroubleErrors >= 30) text += ` E ${r.timeTroubleErrors}% dos erros vieram com pouco tempo no relógio.`;
  return text;
}

export function momentText(m: Moment): string {
  const n = Math.ceil(m.move.ply / 2);
  const best = sanPt(m.move.bestSan);
  return `Contra ${m.opponent}, lance ${n}: você jogou ${sanPt(m.move.san)}${best ? `. O melhor era ${best}` : ''}.`;
}

// ---------- plano de treino ----------

export type TrainingTask = {text: string; link?: {label: string; url: string}};
export type TrainingDay = {day: number; title: string; focus: string; minutes: number; tasks: TrainingTask[]};

type Theme = {
  key: string;
  title: string;
  why: string;
  drills: TrainingTask[];
};

const LICHESS = (theme: string) => `https://lichess.org/training/${theme}`;

const THEMES: Record<string, Theme> = {
  pecaPendurada: {
    key: 'pecaPendurada',
    title: 'Pare de deixar peças sem defesa',
    why: 'Peças penduradas foram o seu erro mais caro.',
    drills: [
      {text: 'Resolva 15 problemas de peça pendurada.', link: {label: 'Abrir problemas', url: LICHESS('hangingPiece')}},
      {text: 'Antes de cada lance numa partida, pergunte: "o que ficou sem defesa?". Jogue 2 partidas de 10 minutos só com essa regra.'},
      {text: 'Resolva 10 problemas de ataque duplo, o jeito mais comum de ganhar uma peça solta.', link: {label: 'Abrir problemas', url: LICHESS('fork')}},
    ],
  },
  taticaPerdida: {
    key: 'taticaPerdida',
    title: 'Enxergue as táticas',
    why: 'Você deixou passar lances que ganhavam material.',
    drills: [
      {text: 'Resolva 15 problemas de garfo (ataque duplo).', link: {label: 'Abrir problemas', url: LICHESS('fork')}},
      {text: 'Resolva 12 problemas de cravada.', link: {label: 'Abrir problemas', url: LICHESS('pin')}},
      {text: 'Resolva 10 problemas de ataque descoberto.', link: {label: 'Abrir problemas', url: LICHESS('discoveredAttack')}},
      {text: 'Em cada posição de partida, procure primeiro xeques, capturas e ameaças, nessa ordem.'},
    ],
  },
  naoPuniu: {
    key: 'naoPuniu',
    title: 'Puna os erros do adversário',
    why: 'Seu adversário errou e você não aproveitou.',
    drills: [
      {text: 'Resolva 15 problemas de vantagem decisiva.', link: {label: 'Abrir problemas', url: LICHESS('crushing')}},
      {text: 'Quando o adversário jogar um lance estranho, pare 20 segundos e pergunte: "o que ele deixou de proteger?".'},
    ],
  },
  deixouMate: {
    key: 'deixouMate',
    title: 'Proteja o seu rei',
    why: 'Alguns lances seus deixaram mate para o adversário.',
    drills: [
      {text: 'Resolva 15 problemas de mate em 1.', link: {label: 'Abrir problemas', url: LICHESS('mateIn1')}},
      {text: 'Resolva 10 problemas de mate na última fileira.', link: {label: 'Abrir problemas', url: LICHESS('backRankMate')}},
      {text: 'Em toda partida, confira se o seu rei tem uma casa de fuga depois do roque.'},
    ],
  },
  perdeuMate: {
    key: 'perdeuMate',
    title: 'Finalize as partidas',
    why: 'Você teve mate e não viu.',
    drills: [
      {text: 'Resolva 15 problemas de mate em 2.', link: {label: 'Abrir problemas', url: LICHESS('mateIn2')}},
      {text: 'Resolva 8 problemas de mate em 3.', link: {label: 'Abrir problemas', url: LICHESS('mateIn3')}},
    ],
  },
  posicional: {
    key: 'posicional',
    title: 'Jogue com plano',
    why: 'Muitos erros vieram de lances sem objetivo claro.',
    drills: [
      {text: 'Resolva 10 problemas de lance tranquilo (sem captura nem xeque).', link: {label: 'Abrir problemas', url: LICHESS('quietMove')}},
      {text: 'Numa partida de 15 minutos, antes de cada lance diga em voz alta qual é o seu plano.'},
      {text: 'Resolva 10 problemas de defesa.', link: {label: 'Abrir problemas', url: LICHESS('defensiveMove')}},
    ],
  },
  abertura: {
    key: 'abertura',
    title: 'Saia bem da abertura',
    why: 'Muitos dos seus erros acontecem nos primeiros 10 lances.',
    drills: [
      {text: 'Escolha uma abertura de brancas e uma de pretas e estude só elas esta semana.'},
      {text: 'Resolva 10 problemas de abertura.', link: {label: 'Abrir problemas', url: LICHESS('opening')}},
      {text: 'Revise no Zakk Chess as 3 últimas partidas e anote onde você saiu da teoria.'},
    ],
  },
  meio: {
    key: 'meio',
    title: 'Ganhe o meio-jogo',
    why: 'O meio-jogo é onde você mais perde pontos.',
    drills: [
      {text: 'Resolva 15 problemas de meio-jogo.', link: {label: 'Abrir problemas', url: LICHESS('middlegame')}},
      {text: 'Antes de cada lance, conte: quantas peças estão atacando e defendendo cada casa importante?'},
    ],
  },
  final: {
    key: 'final',
    title: 'Converta os finais',
    why: 'Os finais estão custando pontos.',
    drills: [
      {text: 'Resolva 10 problemas de final.', link: {label: 'Abrir problemas', url: LICHESS('endgame')}},
      {text: 'Resolva 8 problemas de final de torres.', link: {label: 'Abrir problemas', url: LICHESS('rookEndgame')}},
      {text: 'Treine finais básicos (rei e peão, torre).', link: {label: 'Abrir treino', url: 'https://lichess.org/practice'}},
    ],
  },
  tempo: {
    key: 'tempo',
    title: 'Use melhor o relógio',
    why: 'Boa parte dos erros veio com pouco tempo.',
    drills: [
      {text: 'Jogue 2 partidas de 15 + 10. Gaste mais tempo na abertura e no meio-jogo, não no fim.'},
      {text: 'Resolva 20 problemas fáceis no modo rápido para ganhar velocidade.', link: {label: 'Abrir corrida', url: 'https://lichess.org/storm'}},
    ],
  },
};

export function buildPlan(r: Report): {focus: Theme[]; days: TrainingDay[]} {
  // Escolhe os 3 temas que mais pesam, misturando tipo de erro e fase.
  const scored: {theme: Theme; score: number}[] = [];
  r.types.forEach((t) => scored.push({theme: THEMES[t.type], score: t.count * 2}));
  r.phases.forEach((p) => scored.push({theme: THEMES[p.phase], score: (p.share / 100) * (r.totalErrors / 2)}));
  if (r.timeTroubleErrors >= 25) scored.push({theme: THEMES.tempo, score: (r.timeTroubleErrors / 100) * r.totalErrors});
  const seen = new Set<string>();
  const focus = scored
    .sort((a, b) => b.score - a.score)
    .map((s) => s.theme)
    .filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true)))
    .slice(0, 3);
  while (focus.length < 3) {
    const fallback = [THEMES.taticaPerdida, THEMES.final, THEMES.abertura].find((t) => !seen.has(t.key))!;
    seen.add(fallback.key);
    focus.push(fallback);
  }

  // Semanas: 1 = tema principal, 2 = segundo tema, 3 = terceiro tema, 4 = mistura e prova final.
  const weekTheme = [focus[0], focus[1], focus[2], focus[0]];
  const days: TrainingDay[] = [];
  for (let d = 1; d <= 30; d++) {
    const week = Math.min(3, Math.floor((d - 1) / 7));
    const theme = weekTheme[week];
    const dayInWeek = (d - 1) % 7;
    if (d === 30) {
      days.push({
        day: d,
        title: 'Nova análise',
        focus: 'Compare com o mês passado',
        minutes: 30,
        tasks: [
          {text: 'Analise de novo as suas últimas partidas no Zakk Chess e compare a precisão com a de hoje.'},
          {text: 'Veja se o seu erro mais comum mudou. Ele vira o tema do próximo mês.'},
        ],
      });
    } else if (dayInWeek === 6) {
      days.push({
        day: d,
        title: 'Revisão da semana',
        focus: theme.title,
        minutes: 40,
        tasks: [
          {text: 'Jogue 3 partidas rápidas (10 minutos ou mais).'},
          {text: 'Analise as 3 no Zakk Chess e procure o tema da semana nos seus erros.'},
        ],
      });
    } else if (week === 3) {
      const mix = focus[(dayInWeek % 3)];
      const drill = mix.drills[dayInWeek % mix.drills.length];
      days.push({day: d, title: mix.title, focus: 'Mistura dos três temas', minutes: 30, tasks: [drill, {text: 'Jogue 1 partida de 10 minutos ou mais e analise no Zakk Chess.'}]});
    } else {
      const a = theme.drills[dayInWeek % theme.drills.length];
      const b = theme.drills[(dayInWeek + 1) % theme.drills.length];
      const tasks = a === b ? [a] : [a, b];
      days.push({day: d, title: theme.title, focus: theme.why, minutes: 25 + (dayInWeek % 2) * 5, tasks});
    }
  }
  return {focus, days};
}
