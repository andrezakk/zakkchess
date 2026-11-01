import {Link} from 'wouter';
import {HeroBoard} from '../components/HeroBoard';
import {CoachBubble, Mascot} from '../components/Mascot';
import {ClassBadge, Footer, Header, NickForm} from '../components/ui';
import {PAGES, useSeo} from '../seo';
import type {MoveClass} from '../lib/analysis';
import {CLASS_INFO, MASCOT_NAME} from '../lib/coach';

const CLASS_TEXT: Record<MoveClass, string> = {
  brilliant: 'Um sacrifício que funciona.',
  great: 'O único lance que segurava.',
  best: 'O lance que o Stockfish jogaria.',
  excellent: 'Quase tão bom quanto o melhor.',
  good: 'Sólido, sem perder nada importante.',
  book: 'Teoria de abertura conhecida.',
  inaccuracy: 'Perdeu um pouco da vantagem.',
  mistake: 'Piorou a posição de verdade.',
  blunder: 'Entregou a partida ou material.',
};

const LEGEND: {title: string; items: MoveClass[]}[] = [
  {title: 'Acertos', items: ['brilliant', 'great', 'best', 'excellent', 'good', 'book']},
  {title: 'Deslizes', items: ['inaccuracy', 'mistake', 'blunder']},
];

type Mv = {san: string; cls?: MoveClass};
// Lances 10 a 17 da partida da Ópera, com as notas que o Zakk Chess deu (profundidade 14).
const OPERA: [number, Mv, Mv | null][] = [
  [10, {san: 'Cxb5'}, {san: 'cxb5', cls: 'inaccuracy'}],
  [11, {san: 'Bxb5+', cls: 'great'}, {san: 'Cbd7'}],
  [12, {san: 'O-O-O'}, {san: 'Td8'}],
  [13, {san: 'Txd7'}, {san: 'Txd7'}],
  [14, {san: 'Td1', cls: 'great'}, {san: 'De6'}],
  [15, {san: 'Bxd7+'}, {san: 'Cxd7'}],
  [16, {san: 'Db8+', cls: 'brilliant'}, {san: 'Cxb8'}],
  [17, {san: 'Td8#'}, null],
];

function MoveChip({m}: {m: Mv}) {
  return (
    <span className={`mv-chip ${m.cls ? `mv-${m.cls}` : ''}`}>
      {m.cls && <ClassBadge cls={m.cls} size="sm" />}
      {m.san}
    </span>
  );
}

const STEPS = [
  {title: 'Digite seu nick', text: 'Buscamos suas partidas direto do Chess.com. Sem cadastro, sem senha.'},
  {title: 'Escolha uma partida', text: 'O Stockfish confere cada lance no seu próprio aparelho, sem fila e sem limite diário.'},
  {title: 'Veja onde errou', text: `Cada lance ganha uma nota, e o ${MASCOT_NAME} aponta o erro e o lance melhor no tabuleiro.`},
  {title: 'Junte várias partidas', text: 'O relatório mostra em que fase e em que tipo de lance você mais perde pontos.'},
];

export function Home() {
  useSeo(PAGES.home);
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <h1>
              Treine. Analise. Evolua.
              <span className="h1-sub">Análise grátis das suas partidas de xadrez</span>
            </h1>
            <p className="lead">
              Digite seu nick do Chess.com e o Stockfish confere cada lance das suas partidas. Descubra onde você perde pontos, sem limite de análises.
            </p>
            <NickForm />
            <p className="form-note">Grátis e ilimitado. Sem cadastro. Funciona no celular.</p>
          </div>
          <div className="hero-board">
            <HeroBoard />
            <CoachBubble mood="oops" className="hero-coach coach-mistake">
              <p>
                <strong>Lance 14.</strong> Você jogou <b className="bad">Cxe5</b> e perdeu material. O melhor era{' '}
                <b className="good">Bd3</b>.
              </p>
            </CoachBubble>
          </div>
        </section>

        <section className="section" aria-labelledby="notas">
          <div className="section-head">
            <h2 id="notas">Cada lance com uma nota</h2>
            <p className="lead">
              Do brilhante ao erro grave. Você vê a precisão de cada jogador e um rating estimado da partida, calculado a
              partir da qualidade dos lances.
            </p>
          </div>
          <div className="showcase">
            <figure className="annotated">
              <figcaption>
                <strong>Morphy × Duque de Brunswick</strong>
                <span>Paris, 1858. O final da partida, analisado pelo Zakk Chess.</span>
              </figcaption>
              <ol className="annotated-moves">
                {OPERA.map(([n, w, b]) => (
                  <li key={n}>
                    <span className="mv-n">{n}.</span>
                    <MoveChip m={w} />
                    {b ? <MoveChip m={b} /> : <span />}
                  </li>
                ))}
              </ol>
              <div className="annotated-score" aria-label="Precisão e rating estimado de cada jogador">
                <div>
                  <span className="sample-name">Morphy</span>
                  <span className="sample-acc">98,6</span>
                  <span className="sample-rating">rating estimado 2.875</span>
                </div>
                <div>
                  <span className="sample-name">Duque</span>
                  <span className="sample-acc muted-acc">88,8</span>
                  <span className="sample-rating">rating estimado 2.125</span>
                </div>
              </div>
            </figure>
            <div className="legend">
              {LEGEND.map((g) => (
                <div key={g.title} className="legend-group">
                  <h3>{g.title}</h3>
                  <ul>
                    {g.items.map((c) => (
                      <li key={c}>
                        <ClassBadge cls={c} size="md" />
                        <span>
                          <strong style={{color: CLASS_INFO[c].color}}>{CLASS_INFO[c].label}</strong> {CLASS_TEXT[c]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="como">
          <h2 id="como">Do seu nick ao relatório em minutos</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="section pro-teaser" aria-labelledby="pro">
          <div className="pro-teaser-card">
            <Mascot mood="wow" size={92} className="pro-teaser-mascot" />
            <div>
              <h2 id="pro">Quer um treinador que monta seu mês de treino?</h2>
              <p className="lead">
                No Zakk Chess Pro, o treinador analisa suas últimas 30 partidas, mostra os erros que mais se repetem e entrega um plano de
                30 dias feito para você. Depois de 30 dias, ele analisa de novo e mostra quanto você evoluiu.
              </p>
              <Link href="/pro" className="btn btn-primary">
                Conhecer o Pro
              </Link>
            </div>
          </div>
        </section>

        <section className="section final-cta" aria-labelledby="comece">
          <h2 id="comece">Sua próxima partida pode ser melhor que a última</h2>
          <NickForm compact />
        </section>
      </main>
      <Footer />
    </>
  );
}
