// Demonstração na página inicial: o final da partida da Ópera (Morphy, 1858)
// é jogado conforme a pessoa rola a página, com a nota de cada lance e o Pipo comentando.
import {Chess} from 'chess.js';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Chessboard} from 'react-chessboard';
import type {MoveClass} from '../lib/analysis';
import {CLASS_INFO, type Mood} from '../lib/coach';
import {CoachBubble} from './Mascot';
import {ClassBadge} from './ui';

const OPENING = 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5'.split(' ');
const FINALE = 'Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#'.split(' ');

type Step = {ply: number; label: string; cls?: MoveClass; mood: Mood; text: string};

// ply = quantos lances do final já foram jogados nessa etapa
const STEPS: Step[] = [
  {ply: 0, label: 'Lance 10', mood: 'think', text: 'Posição depois de 9...b5. As pretas atacam o bispo. Morphy já tem quase todas as peças em jogo, e o rei preto ainda está no centro.'},
  {ply: 1, label: '10. Cxb5', mood: 'happy', text: 'Morphy entrega o cavalo por um peão. Ele quer abrir linhas até o rei preto.'},
  {ply: 2, label: '10...cxb5', cls: 'inaccuracy', mood: 'think', text: 'Imprecisão. Aceitar o cavalo abre o caminho do bispo branco.'},
  {ply: 3, label: '11. Bxb5+', cls: 'great', mood: 'wow', text: 'Ótimo. Xeque. A defesa natural, Cbd7, deixa o cavalo cravado contra o rei.'},
  {ply: 7, label: '13. Txd7', mood: 'happy', text: 'Depois do roque grande, mais uma entrega: torre por cavalo, para o rei não respirar.'},
  {ply: 9, label: '14. Td1', cls: 'great', mood: 'wow', text: 'Ótimo. A outra torre chega na coluna d e o ataque continua.'},
  {ply: 13, label: '16. Db8+', cls: 'brilliant', mood: 'wow', text: 'Brilhante! A dama se oferece. Se o cavalo captura, a coluna d fica aberta para a torre.'},
  {ply: 15, label: '17. Td8#', mood: 'wow', text: 'Mate. O Zakk Chess dá 98,6 de precisão para o Morphy e 88,8 para o adversário.'},
];

function usePositions() {
  return useMemo(() => {
    const c = new Chess();
    OPENING.forEach((m) => c.move(m));
    const fens = [c.fen()];
    const moves: {from: string; to: string; san: string}[] = [];
    FINALE.forEach((m) => {
      const mv = c.move(m);
      moves.push({from: mv.from, to: mv.to, san: mv.san});
      fens.push(c.fen());
    });
    return {fens, moves};
  }, []);
}

function goToForm() {
  const input = document.getElementById('nick') as HTMLInputElement | null;
  window.scrollTo({top: 0, behavior: 'smooth'});
  setTimeout(() => input?.focus({preventScroll: true}), 450);
}

const ptSan = (san: string) => san.replace(/[NBRQK]/g, (ch) => ({N: 'C', B: 'B', R: 'T', Q: 'D', K: 'R'})[ch]!);

export function DemoGame() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(0);
  const markers = useRef<(HTMLDivElement | null)[]>([]);
  const {fens, moves} = usePositions();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      {rootMargin: '-45% 0px -55% 0px'},
    );
    markers.current.forEach((m) => m && io.observe(m));
    return () => io.disconnect();
  }, [mounted]);

  // Antes do JavaScript (e para o Google): a mesma história em lista.
  if (!mounted) {
    return (
      <ol className="demo-static">
        {STEPS.map((s) => (
          <li key={s.label}>
            <strong>{s.label}</strong> {s.text}
          </li>
        ))}
      </ol>
    );
  }

  const step = STEPS[active];
  const last = step.ply > 0 ? moves[step.ply - 1] : null;
  const squareStyles: Record<string, React.CSSProperties> = {};
  if (last) {
    const color = step.cls ? CLASS_INFO[step.cls].color : '#f6f3ea';
    squareStyles[last.from] = {background: 'rgba(246, 243, 234, 0.22)'};
    squareStyles[last.to] = {background: `${color}66`};
  }
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="demo" style={{'--steps': STEPS.length} as React.CSSProperties}>
      <div className="demo-stage">
        <div className="demo-board">
          <Chessboard
            options={{
              id: 'demo',
              position: fens[step.ply],
              allowDragging: false,
              allowDrawingArrows: false,
              showAnimations: !reduced,
              animationDurationInMs: 320,
              darkSquareStyle: {backgroundColor: '#2f7d6d'},
              lightSquareStyle: {backgroundColor: '#e8d9b5'},
              darkSquareNotationStyle: {color: '#e8d9b5', fontWeight: 600},
              lightSquareNotationStyle: {color: '#2f7d6d', fontWeight: 600},
              boardStyle: {borderRadius: 12, overflow: 'hidden'},
              squareRenderer: ({square, children}) => (
                <div style={{position: 'relative', width: '100%', height: '100%'}}>
                  {squareStyles[square] && <span className="sq-tint" style={squareStyles[square]} />}
                  {children}
                  {last && step.cls && square === last.to && (
                    <span className="board-badge">
                      <ClassBadge cls={step.cls} size="sm" />
                    </span>
                  )}
                </div>
              ),
            }}
          />
        </div>
        <div className="demo-side">
          <p className="demo-caption">
            <strong>Morphy × Duque de Brunswick</strong> <span>Paris, 1858</span>
          </p>
          <div className="demo-moves" aria-hidden="true">
            {moves.map((m, i) => {
              const s = STEPS.find((x) => x.ply === i + 1);
              return (
                <span key={i} className={`demo-mv ${i < step.ply ? 'played' : ''} ${i === step.ply - 1 ? 'current' : ''}`}>
                  {i % 2 === 0 && <span className="demo-n">{10 + i / 2}.</span>}
                  {s?.cls && i < step.ply && <ClassBadge cls={s.cls} size="sm" />}
                  {ptSan(m.san)}
                </span>
              );
            })}
          </div>
          <CoachBubble key={active} mood={step.mood} className={`coach-live coach-${step.cls ?? 'start'}`}>
            <p>
              <strong>{step.label}.</strong> {step.text}
            </p>
            {active === STEPS.length - 1 && (
              <div className="coach-actions">
                <button className="btn btn-primary btn-sm" onClick={goToForm}>
                  Analisar minhas partidas
                </button>
              </div>
            )}
          </CoachBubble>
          <div className="demo-progress" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.label} className={i <= active ? 'on' : ''} />
            ))}
          </div>
        </div>
      </div>
      <div className="demo-track" aria-hidden="true">
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            className="demo-marker"
            data-i={i}
            ref={(el) => {
              markers.current[i] = el;
            }}
          />
        ))}
      </div>
      <ol className="sr-only">
        {STEPS.map((s) => (
          <li key={s.label}>
            {s.label}: {s.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
