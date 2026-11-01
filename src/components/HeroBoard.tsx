// Tabuleiro da página inicial: mostra um erro de verdade acontecendo.
// O cavalo branco captura em e5 (Cxe5), o Pipo marca o erro e aparece a seta do lance melhor (Bd3).
import {defaultPieces} from 'react-chessboard';

// Posição depois de Cxe5. O cavalo que se move e o peão capturado são desenhados à parte, animados.
const FEN_AFTER = 'r2q1rk1/ppp2ppp/2n1bn2/3p4/3P4/2N1B3/PPP1BPPP/R2Q1RK1';
const FILES = 'abcdefgh';

function parse(fen: string) {
  return fen.split('/').map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) cells.push(null);
      else cells.push((ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase());
    }
    return cells;
  });
}

const Piece = ({code}: {code: string}) => <span className="hb-piece">{defaultPieces[code]?.()}</span>;

export function HeroBoard() {
  const grid = parse(FEN_AFTER);
  return (
    <div
      className="hero-board-grid"
      role="img"
      aria-label="Exemplo: as brancas jogam cavalo toma e5, um erro marcado pelo Pipo. O melhor lance era bispo para d3, indicado por uma seta."
    >
      {grid.map((row, r) =>
        row.map((code, f) => {
          const sq = `${FILES[f]}${8 - r}`;
          const dark = (r + f) % 2 === 1;
          return (
            <div key={sq} className={`hb-sq ${dark ? 'hb-dark' : 'hb-light'} ${sq === 'f3' ? 'hb-from' : ''} ${sq === 'e5' ? 'hb-to' : ''}`}>
              {code && <Piece code={code} />}
              {sq === 'e5' && (
                <span className="hb-captured">
                  <Piece code="bP" />
                </span>
              )}
              {f === 0 && <span className={`hb-coord hb-rank ${dark ? 'on-dark' : ''}`}>{8 - r}</span>}
              {r === 7 && <span className={`hb-coord hb-file ${dark ? 'on-dark' : ''}`}>{FILES[f]}</span>}
            </div>
          );
        }),
      )}
      {/* cavalo que joga f3 → e5 */}
      <span className="hb-mover">
        <Piece code="wN" />
      </span>
      {/* selo de erro em e5 */}
      <span className="hb-badge" aria-hidden="true">
        ?
      </span>
      {/* seta do lance melhor: bispo e2 → d3 */}
      <svg className="hb-arrow" viewBox="0 0 8 8" aria-hidden="true">
        <defs>
          <marker id="hb-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="2.6" markerHeight="2.6" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="#4fd1b0" />
          </marker>
        </defs>
        <line x1="4.5" y1="6.5" x2="3.72" y2="5.72" stroke="#4fd1b0" strokeWidth="0.2" strokeLinecap="round" markerEnd="url(#hb-head)" />
      </svg>
    </div>
  );
}
