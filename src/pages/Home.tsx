import {Link} from 'wouter';
import {HeroBoard} from '../components/HeroBoard';
import {CoachBubble, Mascot} from '../components/Mascot';
import {ClassBadge, Footer, Header, NickForm} from '../components/ui';
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

const SHOWCASE: MoveClass[] = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder'];

const STEPS = [
  {title: 'Digite seu nick', text: 'Buscamos suas partidas direto do Chess.com. Sem cadastro, sem senha.'},
  {title: 'Escolha uma partida', text: 'O Stockfish confere cada lance no seu próprio aparelho, sem fila e sem limite diário.'},
  {title: 'Veja onde errou', text: `Cada lance ganha uma nota, e o ${MASCOT_NAME} aponta o erro e o lance melhor no tabuleiro.`},
  {title: 'Junte várias partidas', text: 'O relatório mostra em que fase e em que tipo de lance você mais perde pontos.'},
];

export function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <h1>Treine. Analise. Evolua.</h1>
            <p className="lead">
              Análise completa das suas partidas do Chess.com, de graça e sem limite. Digite seu nick e descubra onde
              você perde pontos, lance por lance.
            </p>
            <NickForm />
            <p className="form-note">Grátis e ilimitado. Sem cadastro. Funciona no celular.</p>
          </div>
          <div className="hero-board">
            <HeroBoard />
            <CoachBubble mood="oops" className="hero-coach">
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
            <ul className="class-grid">
              {SHOWCASE.map((c) => (
                <li key={c}>
                  <ClassBadge cls={c} size="lg" />
                  <div>
                    <strong style={{color: CLASS_INFO[c].color}}>{CLASS_INFO[c].label}</strong>
                    <span>{CLASS_TEXT[c]}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="sample-summary" aria-label="Exemplo de resumo de partida">
              <div className="sample-player">
                <span className="sample-name">Você</span>
                <span className="sample-acc">86,4</span>
                <span className="sample-cap">precisão</span>
                <span className="sample-rating">Rating da partida: 1.850</span>
              </div>
              <div className="sample-vs" aria-hidden="true">×</div>
              <div className="sample-player">
                <span className="sample-name">Adversário</span>
                <span className="sample-acc muted-acc">71,2</span>
                <span className="sample-cap">precisão</span>
                <span className="sample-rating">Rating da partida: 1.150</span>
              </div>
              <p className="sample-note">Exemplo ilustrativo.</p>
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
                No Zakk Chess Pro, o treinador revisa todas as suas partidas, explica onde você erra e entrega um plano de
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
