import {Chess} from 'chess.js';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Chessboard} from 'react-chessboard';
import {Link} from 'wouter';
import {CoachBubble} from '../components/Mascot';
import {ClassBadge, Footer, Header, Spinner} from '../components/ui';
import {CLASS_ORDER, type AnalyzedMove, type GameAnalysis, type SideSummary} from '../lib/analysis';
import {
  ChessComError,
  getMonth,
  openingName,
  outcomeFor,
  TIME_CLASS_LABEL,
  timeControlLabel,
  userSide,
  type ChessComGame,
} from '../lib/chesscom';
import {CLASS_INFO, coachLine, MASCOT_NAME, sanPt} from '../lib/coach';
import {enqueue, useAnalysesVersion, useRunner} from '../lib/runner';
import {useTitle} from '../seo';
import {loadAnalysis} from '../lib/storage';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ERRORS = new Set(['inaccuracy', 'mistake', 'blunder']);
const SHOW_BADGE = new Set(['brilliant', 'great', 'inaccuracy', 'mistake', 'blunder']);

function formatEval(m: AnalyzedMove | undefined): string {
  if (!m) return '0,0';
  const s = m.evalAfter;
  if (s.mate !== undefined) return s.mate === 0 ? '#' : `M${Math.abs(s.mate)}`;
  const v = (s.cp ?? 0) / 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}`;
}

export function Game({nick, month, uuid, initialPly}: {nick: string; month: string; uuid: string; initialPly?: number}) {
  useTitle(`Análise da partida de ${nick}`);
  const [game, setGame] = useState<ChessComGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ply, setPly] = useState(initialPly ?? 0);
  const runner = useRunner();
  const version = useAnalysesVersion();

  useEffect(() => {
    let alive = true;
    getMonth(nick, month)
      .then((games) => {
        if (!alive) return;
        const g = games.find((x) => x.uuid === uuid);
        if (!g) setError('Não encontramos essa partida. Ela pode ter sido apagada do Chess.com.');
        else setGame(g);
      })
      .catch((e) => alive && setError(e instanceof ChessComError ? e.message : 'Não foi possível carregar a partida.'));
    return () => {
      alive = false;
    };
  }, [nick, month, uuid]);

  // Começa a análise assim que a partida carrega (grátis e ilimitado).
  useEffect(() => {
    if (game && !loadAnalysis(nick, game.uuid)) enqueue({username: nick, month, game}, true);
  }, [game, nick, month]);

  const saved = useMemo(() => loadAnalysis(nick, uuid), [nick, uuid, version]);
  const analysis = saved?.analysis ?? null;

  // Lances sem análise (enquanto o Stockfish trabalha).
  const plain = useMemo(() => {
    if (!game) return [];
    const c = new Chess();
    c.loadPgn(game.pgn);
    return c.history({verbose: true});
  }, [game]);

  const total = plain.length;
  const go = useCallback((p: number) => setPly(Math.max(0, Math.min(total, p))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') go(ply - 1);
      if (e.key === 'ArrowRight') go(ply + 1);
      if (e.key === 'Home') go(0);
      if (e.key === 'End') go(total);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, ply, total]);

  if (error) {
    return (
      <>
        <Header nick={nick} />
        <main className="page narrow">
          <CoachBubble mood="oops">
            <p>{error}</p>
          </CoachBubble>
          <Link href={`/u/${nick}`} className="btn btn-secondary">
            Voltar para as partidas
          </Link>
        </main>
      </>
    );
  }

  if (!game) {
    return (
      <>
        <Header nick={nick} />
        <main className="page">
          <Spinner label="Carregando a partida…" />
        </main>
      </>
    );
  }

  const side = userSide(game, nick);
  const userColor = side === 'white' ? 'w' : 'b';
  const opp = side === 'white' ? game.black : game.white;
  const me = game[side];
  const out = outcomeFor(game, nick);
  const moves = analysis?.moves;
  const current = moves?.[ply - 1];
  const fen = ply === 0 ? plain[0]?.before ?? START_FEN : plain[ply - 1].after;
  const lastPlain = ply > 0 ? plain[ply - 1] : null;
  const progress = runner.current?.uuid === uuid ? runner.current : null;
  const failed = runner.errors[uuid];

  const nextUserError = moves?.find((m) => m.ply > ply && m.color === userColor && ERRORS.has(m.cls) && m.cls !== 'inaccuracy');
  const prevUserError = moves
    ? [...moves].reverse().find((m) => m.ply < ply && m.color === userColor && ERRORS.has(m.cls) && m.cls !== 'inaccuracy')
    : undefined;

  // Tabuleiro: cores da última jogada e seta do lance melhor.
  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastPlain) {
    const color = current ? CLASS_INFO[current.cls].color : '#4fd1b0';
    squareStyles[lastPlain.from] = {background: `${color}55`};
    squareStyles[lastPlain.to] = {background: `${color}88`};
  }
  const arrows =
    current && current.bestUci && !['best', 'brilliant', 'great', 'book'].includes(current.cls) && current.cls !== 'excellent'
      ? [{startSquare: current.bestUci.slice(0, 2), endSquare: current.bestUci.slice(2, 4), color: 'rgba(79, 209, 176, 0.9)'}]
      : [];

  const coach = (() => {
    if (!analysis) return null;
    if (!current) {
      const mine = side === 'white' ? analysis.white : analysis.black;
      const errors = mine.counts.mistake + mine.counts.blunder;
      return {
        mood: errors === 0 ? ('wow' as const) : ('think' as const),
        text:
          errors === 0
            ? `Partida limpa: nenhum erro sério da sua parte. Sua precisão foi ${mine.accuracy.toFixed(1).replace('.', ',')}.`
            : `Achei ${errors} ${errors === 1 ? 'erro sério' : 'erros sérios'} seus nesta partida. Toque em "Próximo erro" para ver cada um.`,
      };
    }
    return coachLine(current, current.color === userColor, opp.username);
  })();

  return (
    <>
      <Header nick={nick} />
      <main className="page game-page">
        <div className="game-head">
          <Link href={`/u/${nick}`} className="back-link">
            ← Partidas
          </Link>
          <p className="game-title">
            <span className={`result result-${out}`}>{out === 'win' ? 'Vitória' : out === 'loss' ? 'Derrota' : 'Empate'}</span>{' '}
            contra <strong>{opp.username}</strong>
          </p>
          <p className="muted small">
            {TIME_CLASS_LABEL[game.time_class]} · {timeControlLabel(game.time_control)}
            {openingName(game) ? ` · ${openingName(game)}` : ''}
          </p>
        </div>

        <div className="review">
          <div className="review-board">
            <PlayerStrip name={opp.username} rating={opp.rating} color={side === 'white' ? 'b' : 'w'} summary={analysis ? (side === 'white' ? analysis.black : analysis.white) : null} />
            <div className="board-row">
              <EvalBar analysis={analysis} ply={ply} orientation={side} />
              <div className="board-box">
                <Chessboard
                  options={{
                    id: 'review',
                    position: fen,
                    boardOrientation: side,
                    allowDragging: false,
                    allowDrawingArrows: false,
                    arrows,
                    darkSquareStyle: {backgroundColor: '#2f7d6d'},
                    lightSquareStyle: {backgroundColor: '#e8d9b5'},
                    animationDurationInMs: 160,
                    boardStyle: {borderRadius: 10, overflow: 'hidden'},
                    darkSquareNotationStyle: {color: '#e8d9b5', fontWeight: 600},
                    lightSquareNotationStyle: {color: '#2f7d6d', fontWeight: 600},
                    squareRenderer: ({square, children}) => (
                      <div style={{position: 'relative', width: '100%', height: '100%'}}>
                        {squareStyles[square] && <span className="sq-tint" style={squareStyles[square]} />}
                        {children}
                        {current && lastPlain && square === lastPlain.to && (
                          <span className="board-badge">
                            <ClassBadge cls={current.cls} size="sm" />
                          </span>
                        )}
                      </div>
                    ),
                  }}
                />
              </div>
            </div>
            <PlayerStrip name={me.username} rating={me.rating} color={userColor} summary={analysis ? (side === 'white' ? analysis.white : analysis.black) : null} you />

            <div className="controls" role="group" aria-label="Navegar pelos lances">
              <button onClick={() => go(0)} aria-label="Início" disabled={ply === 0}>
                ⏮
              </button>
              <button onClick={() => go(ply - 1)} aria-label="Lance anterior" disabled={ply === 0}>
                ◀
              </button>
              <span className="ply-count" aria-live="polite">
                {ply === 0 ? 'Início' : `Lance ${Math.ceil(ply / 2)}${ply % 2 ? '' : '…'}`}
              </span>
              <button onClick={() => go(ply + 1)} aria-label="Próximo lance" disabled={ply === total}>
                ▶
              </button>
              <button onClick={() => go(total)} aria-label="Fim" disabled={ply === total}>
                ⏭
              </button>
            </div>
          </div>

          <div className="review-panel">
            {analysis && coach ? (
              <CoachBubble mood={coach.mood} className="coach-live">
                <p>
                  {current && <ClassBadge cls={current.cls} size="sm" />} {coach.text}
                </p>
                {current && current.bestLineSan.length > 1 && ERRORS.has(current.cls) && (
                  <p className="best-line">
                    Linha do Stockfish: <span>{current.bestLineSan.map(sanPt).join(' ')}</span>
                  </p>
                )}
                <div className="coach-actions">
                  {prevUserError && (
                    <button className="btn btn-ghost btn-sm" onClick={() => go(prevUserError.ply)}>
                      Erro anterior
                    </button>
                  )}
                  {nextUserError && (
                    <button className="btn btn-primary btn-sm" onClick={() => go(nextUserError.ply)}>
                      Próximo erro
                    </button>
                  )}
                </div>
              </CoachBubble>
            ) : failed ? (
              <CoachBubble mood="oops">
                <p>{failed} Tente recarregar a página.</p>
              </CoachBubble>
            ) : (
              <CoachBubble mood="think" className="coach-live">
                <p>
                  O Stockfish está conferindo cada lance no seu aparelho.
                  {progress ? ` ${progress.done} de ${progress.total} posições.` : ' Preparando o motor…'}
                </p>
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ? Math.round((progress.done / progress.total) * 100) : 0}>
                  <span style={{width: `${progress ? (progress.done / progress.total) * 100 : 3}%`}} />
                </div>
                <p className="muted small">Enquanto isso, você já pode navegar pelos lances.</p>
              </CoachBubble>
            )}

            {analysis && <EvalGraph analysis={analysis} ply={ply} onPick={go} userColor={userColor} />}

            {analysis && (
              <Summary
                analysis={analysis}
                whiteName={game.white.username}
                blackName={game.black.username}
                userColor={userColor}
              />
            )}

            <MoveList plain={plain.map((m) => m.san)} moves={moves} ply={ply} onPick={go} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function PlayerStrip({
  name,
  rating,
  color,
  summary,
  you,
}: {
  name: string;
  rating: number;
  color: 'w' | 'b';
  summary: SideSummary | null;
  you?: boolean;
}) {
  return (
    <div className="player-strip">
      <span className={`side-dot side-${color === 'w' ? 'white' : 'black'}`} aria-hidden="true" />
      <span className="strip-name">
        {name}
        {you && <span className="you-tag">você</span>} <span className="muted">({rating})</span>
      </span>
      {summary && <span className="strip-acc">{summary.accuracy.toFixed(1).replace('.', ',')}</span>}
    </div>
  );
}

function EvalBar({analysis, ply, orientation}: {analysis: GameAnalysis | null; ply: number; orientation: 'white' | 'black'}) {
  const m = analysis?.moves[ply - 1];
  const white = analysis ? (ply === 0 ? analysis.startWin : m!.winAfter) : 50;
  const label = analysis ? (ply === 0 ? '0,0' : formatEval(m)) : '';
  const whiteOnBottom = orientation === 'white';
  return (
    <div className={`eval-bar ${whiteOnBottom ? '' : 'flipped'}`} aria-label={`Avaliação: ${label}`} role="img">
      <span className="eval-white" style={{height: `${white}%`}} />
      <span className={`eval-label ${white >= 50 ? 'on-white' : 'on-black'}`}>{label}</span>
    </div>
  );
}

function EvalGraph({analysis, ply, onPick, userColor}: {analysis: GameAnalysis; ply: number; onPick: (p: number) => void; userColor: 'w' | 'b'}) {
  const pts = [analysis.startWin, ...analysis.moves.map((m) => m.winAfter)];
  const n = pts.length - 1 || 1;
  const W = 300;
  const H = 72;
  const x = (i: number) => (i / n) * W;
  const y = (v: number) => H - (v / 100) * H;
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const marks = analysis.moves.filter((m) => m.color === userColor && (m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'brilliant'));

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onPick(Math.round(((e.clientX - r.left) / r.width) * n));
  };

  return (
    <figure className="graph">
      <figcaption className="sr-only">Gráfico da vantagem ao longo da partida. Toque para ir a um lance.</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onClick={onClick} role="img" aria-label="Gráfico de vantagem">
        <rect width={W} height={H} fill="#1c2230" />
        <path d={area} fill="#f6f3ea" />
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="#4fd1b0" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={x(ply)} x2={x(ply)} y1="0" y2={H} stroke="#4fd1b0" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="graph-marks" aria-hidden="true">
        {marks.map((m) => (
          <span
            key={m.ply}
            className="graph-mark"
            style={{left: `${(m.ply / n) * 100}%`, top: `${100 - m.winAfter}%`, background: CLASS_INFO[m.cls].color}}
          />
        ))}
      </div>
    </figure>
  );
}

function Summary({analysis, whiteName, blackName, userColor}: {analysis: GameAnalysis; whiteName: string; blackName: string; userColor: 'w' | 'b'}) {
  const fmt = (n: number) => n.toFixed(1).replace('.', ',');
  const rating = (s: SideSummary) => (s.rating ? s.rating.toLocaleString('pt-BR') : '—');
  return (
    <section className="summary" aria-label="Resumo da partida">
      <div className="summary-head">
        <div className={userColor === 'w' ? 'is-you' : ''}>
          <span className="summary-name">{whiteName}</span>
          <span className="summary-acc">{fmt(analysis.white.accuracy)}</span>
          <span className="summary-cap">precisão</span>
        </div>
        <div className={userColor === 'b' ? 'is-you' : ''}>
          <span className="summary-name">{blackName}</span>
          <span className="summary-acc">{fmt(analysis.black.accuracy)}</span>
          <span className="summary-cap">precisão</span>
        </div>
      </div>
      <div className="summary-rating">
        <span>{rating(analysis.white)}</span>
        <span className="summary-mid">Rating estimado na partida</span>
        <span>{rating(analysis.black)}</span>
      </div>
      <table className="class-table">
        <caption className="sr-only">Quantidade de lances por classificação</caption>
        <tbody>
          {CLASS_ORDER.map((c) => (
            <tr key={c}>
              <td className="num">{analysis.white.counts[c]}</td>
              <th scope="row">
                <ClassBadge cls={c} size="sm" />
                <span style={{color: CLASS_INFO[c].color}}>{CLASS_INFO[c].label}</span>
              </th>
              <td className="num">{analysis.black.counts[c]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        O rating estimado é uma referência calculada pela precisão dos lances, não o seu rating oficial. Análise feita pelo{' '}
        {MASCOT_NAME} com o Stockfish, profundidade {analysis.depth}.
      </p>
    </section>
  );
}

function MoveList({plain, moves, ply, onPick}: {plain: string[]; moves?: AnalyzedMove[]; ply: number; onPick: (p: number) => void}) {
  const rows: number[] = [];
  for (let i = 0; i < plain.length; i += 2) rows.push(i);
  // Rola só a caixa de lances (nunca a página), para o tabuleiro continuar visível no celular.
  useEffect(() => {
    const el = document.getElementById(`mv-${ply}`);
    const box = el?.closest('.moves') as HTMLElement | null;
    if (!el || !box) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - el.offsetHeight) {
      box.scrollTop = top - box.clientHeight / 2;
    }
  }, [ply]);
  const cell = (i: number) => {
    if (i >= plain.length) return <span />;
    const m = moves?.[i];
    return (
      <button id={`mv-${i + 1}`} className={`mv ${ply === i + 1 ? 'mv-active' : ''}`} onClick={() => onPick(i + 1)}>
        {m && SHOW_BADGE.has(m.cls) && <ClassBadge cls={m.cls} size="sm" />}
        {sanPt(plain[i])}
      </button>
    );
  };
  return (
    <section className="moves" aria-label="Lances da partida">
      <ol>
        {rows.map((i) => (
          <li key={i}>
            <span className="mv-n">{i / 2 + 1}.</span>
            {cell(i)}
            {cell(i + 1)}
          </li>
        ))}
      </ol>
    </section>
  );
}
