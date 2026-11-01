// Stockfish rodando no navegador do usuário (WebAssembly dentro de um Web Worker).
// Custo de servidor: zero.

export type Score = {cp?: number; mate?: number};
export type EngineLine = {score: Score; pv: string[]; depth: number};

const ENGINE_URL = '/stockfish/stockfish-18-lite-single.js';

class Engine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private listener: ((line: string) => void) | null = null;

  private boot(): Promise<void> {
    if (this.ready) return this.ready;
    this.worker = new Worker(ENGINE_URL);
    this.worker.onmessage = (e) => this.listener?.(String(e.data));
    this.ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('O motor de análise demorou demais para carregar.')), 45000);
      this.listener = (line) => {
        if (line === 'readyok') {
          clearTimeout(timer);
          this.listener = null;
          resolve();
        }
      };
      this.worker!.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Não foi possível carregar o motor de análise neste navegador.'));
      };
      this.send('uci');
      this.send('setoption name Hash value 32');
      this.send('isready');
    });
    return this.ready;
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  newGame() {
    this.chain = this.chain.then(async () => {
      await this.boot();
      this.send('ucinewgame');
    });
  }

  /** Analisa uma posição. As avaliações vêm do ponto de vista de quem joga. */
  analyze(fen: string, depth: number, multipv = 2): Promise<EngineLine[]> {
    const job = this.chain.then(async () => {
      await this.boot();
      return new Promise<EngineLine[]>((resolve) => {
        const lines: EngineLine[] = [];
        this.listener = (line) => {
          if (line.startsWith('info') && line.includes(' pv ')) {
            const mpv = Number(/ multipv (\d+)/.exec(line)?.[1] ?? 1);
            const d = Number(/ depth (\d+)/.exec(line)?.[1] ?? 0);
            const cp = / score cp (-?\d+)/.exec(line);
            const mate = / score mate (-?\d+)/.exec(line);
            if (/ (lowerbound|upperbound)/.test(line)) return;
            const pv = line.split(' pv ')[1].trim().split(/\s+/);
            const score: Score = mate ? {mate: Number(mate[1])} : {cp: Number(cp?.[1] ?? 0)};
            lines[mpv - 1] = {score, pv, depth: d};
          } else if (line.startsWith('bestmove')) {
            this.listener = null;
            resolve(lines.filter(Boolean));
          }
        };
        this.send(`setoption name MultiPV value ${multipv}`);
        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth}`);
      });
    });
    this.chain = job.catch(() => undefined);
    return job;
  }
}

export const engine = new Engine();
