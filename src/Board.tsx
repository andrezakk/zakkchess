// Tabuleiro estático da página inicial. Posição de exemplo, só para ilustrar.
// Posição logo depois do lance errado Cxe5 (cavalo branco em e5). O melhor era Bd3 (bispo de e2 para d3).
const FEN = 'r2q1rk1/ppp2ppp/2n1bn2/3pN3/3P4/2N1B3/PPP1BPPP/R2Q1RK1';

const GLYPH: Record<string, string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

type Cell = {piece: string; white: boolean} | null;

function parse(fen: string): Cell[][] {
  return fen.split('/').map((row) => {
    const cells: Cell[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) cells.push(null);
      else cells.push({piece: ch.toLowerCase(), white: ch === ch.toUpperCase()});
    }
    return cells;
  });
}

const ERROR_SQ = {file: 4, rank: 3}; // e5 (coluna 4, linha 3 a partir do topo)
const BEST_SQ = {file: 3, rank: 5}; // d3

export function Board() {
  const grid = parse(FEN);
  return (
    <svg
      className="board"
      viewBox="0 0 80 80"
      role="img"
      aria-label="Tabuleiro de exemplo com um lance errado marcado na casa e5 e o lance melhor na casa d3"
    >
      {grid.map((row, r) =>
        row.map((cell, f) => {
          const dark = (r + f) % 2 === 1;
          return (
            <g key={`${r}-${f}`}>
              <rect x={f * 10} y={r * 10} width="10" height="10" fill={dark ? '#2f7d6d' : '#e8d9b5'} />
              {cell && (
                <text
                  x={f * 10 + 5}
                  y={r * 10 + 7.6}
                  textAnchor="middle"
                  fontSize="8.6"
                  fill={cell.white ? '#fffdf6' : '#10141b'}
                  stroke={cell.white ? '#10141b' : '#f6f3ea'}
                  strokeWidth={cell.white ? 0.55 : 0.28}
                  paintOrder="stroke"
                  style={{fontFamily: '"Noto Sans Symbols 2","Segoe UI Symbol","DejaVu Sans",sans-serif'}}
                >
                  {GLYPH[cell.piece] + '︎'}
                </text>
              )}
            </g>
          );
        }),
      )}
      <rect className="best-ring" x={BEST_SQ.file * 10 + 0.8} y={BEST_SQ.rank * 10 + 0.8} width="8.4" height="8.4" rx="1.4" />
      <g className="error-mark">
        <rect x={ERROR_SQ.file * 10 + 0.8} y={ERROR_SQ.rank * 10 + 0.8} width="8.4" height="8.4" rx="1.4" className="error-ring" />
        <circle cx={ERROR_SQ.file * 10 + 9} cy={ERROR_SQ.rank * 10 + 1} r="3.2" fill="#ff6b5e" />
        <text x={ERROR_SQ.file * 10 + 9} y={ERROR_SQ.rank * 10 + 2.6} textAnchor="middle" fontSize="4.6" fontWeight="800" fill="#0b0d12" style={{fontFamily: 'Figtree Variable, sans-serif'}}>
          ?
        </text>
      </g>
    </svg>
  );
}
