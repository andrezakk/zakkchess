import {FormEvent, useState} from 'react';
import {Board} from './Board';

function Logo() {
  return (
    <span className="logo" aria-label="Zakk Chess">
      <span>ZAKK</span> <span className="logo-accent">CHESS</span>
    </span>
  );
}

function Hero() {
  const [nick, setNick] = useState('');
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (nick.trim()) setSent(true);
  };

  return (
    <section className="hero">
      <div className="hero-copy">
        <h1>Treine. Analise. Evolua.</h1>
        <p className="lead">
          Digite seu nick do Chess.com. Nós buscamos suas partidas, o Stockfish confere cada lance e você descobre
          onde mais perde pontos. Sem limite de análises.
        </p>
        <form className="nick-form" onSubmit={onSubmit} noValidate>
          <label htmlFor="nick" className="sr-only">Seu nick no Chess.com</label>
          <input
            id="nick"
            name="nick"
            value={nick}
            onChange={(e) => { setNick(e.target.value); setSent(false); }}
            placeholder="Seu nick no Chess.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            autoComplete="off"
          />
          <button type="submit">Analisar minhas partidas</button>
        </form>
        <p className="form-note" role="status" aria-live="polite">
          {sent
            ? `Quase lá, ${nick.trim()}! A importação das partidas chega na próxima versão.`
            : 'Grátis. Sem cadastro. A análise roda no seu aparelho.'}
        </p>
      </div>

      <div className="hero-board">
        <Board />
        <div className="coach" aria-live="off">
          <div className="coach-avatar" aria-hidden="true">?</div>
          <p>
            <strong>Lance 14.</strong> Você jogou <b>Cxe5</b> e perdeu material. O melhor era <b className="good">Bd3</b>.
          </p>
        </div>
        <p className="board-caption">Exemplo de como seus erros aparecem.</p>
      </div>
    </section>
  );
}

const STEPS = [
  {title: 'Importamos suas partidas', text: 'Pela API pública do Chess.com. Você só informa o nick.'},
  {title: 'O Stockfish confere cada lance', text: 'A análise acontece no seu navegador, sem fila e sem limite diário.'},
  {title: 'Você vê onde perde pontos', text: 'Erros marcados no tabuleiro, com o lance melhor ao lado.'},
  {title: 'Recebe um plano de treino', text: 'Montado a partir dos erros que mais se repetem nas suas partidas.'},
];

function HowItWorks() {
  return (
    <section className="section" aria-labelledby="como">
      <h2 id="como">Do seu nick ao plano de treino</h2>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <span className="step-n" aria-hidden="true">{i + 1}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const PHASES = [
  {name: 'Abertura', pct: 18},
  {name: 'Meio-jogo', pct: 64},
  {name: 'Final', pct: 31},
];

function ReportPreview() {
  return (
    <section className="section report" aria-labelledby="relatorio">
      <div>
        <h2 id="relatorio">Saiba exatamente onde você mais erra</h2>
        <p className="lead">
          Em vez de uma lista solta de lances ruins, você vê o padrão: em qual fase da partida os erros se concentram e
          que tipo de erro se repete.
        </p>
      </div>
      <figure className="report-card">
        <figcaption>Exemplo: em que fase saem os seus erros</figcaption>
        {PHASES.map((p) => (
          <div className="bar-row" key={p.name}>
            <span className="bar-label">{p.name}</span>
            <span className="bar-track" role="img" aria-label={`${p.name}: ${p.pct}% dos erros`}>
              <span className="bar-fill" style={{width: `${p.pct}%`}} />
            </span>
            <span className="bar-value">{p.pct}%</span>
          </div>
        ))}
        <p className="report-tip">
          Neste exemplo, a maioria dos erros acontece no meio-jogo. O plano de treino começaria por táticas.
        </p>
      </figure>
    </section>
  );
}

export function App() {
  return (
    <>
      <header className="site-header">
        <Logo />
      </header>
      <main>
        <Hero />
        <HowItWorks />
        <ReportPreview />
      </main>
      <footer className="site-footer">
        <Logo />
        <p>Treine. Analise. Evolua.</p>
        <p className="fine">Zakk Chess não é afiliado ao Chess.com.</p>
      </footer>
    </>
  );
}
