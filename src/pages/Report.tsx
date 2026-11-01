import {useMemo} from 'react';
import {Link} from 'wouter';
import {CoachBubble, Mascot} from '../components/Mascot';
import {Chessboard} from 'react-chessboard';
import {accuracyColor, Footer, Header} from '../components/ui';
import {ERROR_LABEL, MASCOT_NAME, PHASE_LABEL} from '../lib/coach';
import {buildPlan, buildReport, diagnosis, momentText} from '../lib/report';
import {useAnalysesVersion} from '../lib/runner';
import {useTitle} from '../seo';
import {listAnalyses} from '../lib/storage';
import {usePro} from '../lib/pro';

const FREE_DAYS = 3;
const fmt = (n: number) => n.toFixed(1).replace('.', ',');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Report({nick}: {nick: string}) {
  useTitle(`Onde ${nick} mais erra`);
  const version = useAnalysesVersion();
  const items = useMemo(() => listAnalyses(nick), [nick, version]);
  const report = useMemo(() => buildReport(nick, items), [nick, items]);
  const plan = useMemo(() => buildPlan(report), [report]);
  const {isPro} = usePro();
  const visibleDays = isPro ? plan.days.length : FREE_DAYS;

  if (items.length === 0) {
    return (
      <>
        <Header nick={nick} />
        <main className="page narrow">
          <h1 className="page-title">Onde você mais erra</h1>
          <CoachBubble mood="think">
            <p>
              Ainda não tenho partidas suas analisadas neste aparelho. Analise algumas e eu monto seu relatório. Com 10
              partidas o padrão já aparece.
            </p>
          </CoachBubble>
          <Link href={`/u/${nick}`} className="btn btn-primary">
            Escolher partidas
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const maxPhase = Math.max(1, ...report.phases.map((p) => p.share));
  const worst = report.worstMoments[0];
  const maxType = Math.max(1, ...report.types.map((t) => t.count));

  return (
    <>
      <Header nick={nick} />
      <main className="page report-page">
        <h1 className="page-title">Onde você mais erra</h1>

        <section className="diagnosis-hero" aria-label={`Diagnóstico do ${MASCOT_NAME}`}>
          <div className="diagnosis-copy">
            <CoachBubble mood={report.totalErrors ? 'think' : 'wow'} className="diagnosis">
              <p>
                <strong>Diagnóstico do {MASCOT_NAME}:</strong> {diagnosis(report)}
              </p>
            </CoachBubble>
            <p className="facts">
              {report.games} {report.games === 1 ? 'partida analisada' : 'partidas analisadas'}, precisão média{' '}
              <strong style={{color: accuracyColor(report.accuracy)}}>{fmt(report.accuracy)}</strong>
              {report.rating ? (
                <>
                  , rating estimado <strong>{report.rating.toLocaleString('pt-BR')}</strong>
                </>
              ) : null}
              . {plural(report.results.win, 'vitória', 'vitórias')}, {plural(report.results.draw, 'empate', 'empates')} e{' '}
              {plural(report.results.loss, 'derrota', 'derrotas')}
              {report.brilliants > 0 && <>, com {plural(report.brilliants, 'lance brilhante', 'lances brilhantes')}</>}.
              {report.games < 5 && ' Analise pelo menos 5 partidas para um retrato mais fiel.'}
            </p>
          </div>
          {worst && (
            <figure className="worst">
              <div className="worst-board">
                <Chessboard
                  options={{
                    id: 'worst',
                    position: worst.move.fenBefore,
                    boardOrientation: worst.move.color === 'w' ? 'white' : 'black',
                    allowDragging: false,
                    showAnimations: false,
                    showNotation: false,
                    darkSquareStyle: {backgroundColor: '#2f7d6d'},
                    lightSquareStyle: {backgroundColor: '#e8d9b5'},
                    boardStyle: {borderRadius: 12, overflow: 'hidden'},
                    arrows: [
                      {startSquare: worst.move.from, endSquare: worst.move.to, color: 'rgba(255, 94, 87, 0.9)'},
                      ...(worst.move.bestUci
                        ? [{startSquare: worst.move.bestUci.slice(0, 2), endSquare: worst.move.bestUci.slice(2, 4), color: 'rgba(79, 209, 176, 0.95)'}]
                        : []),
                    ],
                  }}
                />
              </div>
              <figcaption>
                <span className="worst-title">Seu lance mais caro</span>
                <span>{momentText(worst)}</span>
                <span className="worst-legend">
                  <span className="dot dot-bad" /> o que você jogou <span className="dot dot-good" /> o melhor
                </span>
                <Link href={`/u/${nick}/p/${worst.saved.month}/${worst.saved.game.uuid}?lance=${worst.move.ply}`} className="btn btn-secondary btn-sm">
                  Abrir na partida
                </Link>
              </figcaption>
            </figure>
          )}
        </section>

        <div className="report-grid">
          <section className="panel" aria-labelledby="fases">
            <h2 id="fases" className="panel-title">
              Erros por fase da partida
            </h2>
            {report.phases.map((p) => (
              <div className="bar-row" key={p.phase}>
                <span className="bar-label">{PHASE_LABEL[p.phase]}</span>
                <span className="bar-track">
                  <span
                    className={`bar-fill ${p.phase === report.weakPhase ? 'bar-hot' : ''}`}
                    style={{width: `${(p.share / maxPhase) * 100}%`}}
                  />
                </span>
                <span className="bar-value">{p.share}%</span>
              </div>
            ))}
            {report.timeTroubleErrors > 0 && (
              <p className="panel-note">{report.timeTroubleErrors}% dos erros aconteceram com pouco tempo no relógio.</p>
            )}
          </section>

          <section className="panel" aria-labelledby="tipos">
            <h2 id="tipos" className="panel-title">
              Tipos de erro que mais se repetem
            </h2>
            {report.types.length === 0 ? (
              <p className="muted">Nenhum erro sério encontrado. Bom sinal!</p>
            ) : (
              report.types.map((t, i) => (
                <div className="bar-row" key={t.type}>
                  <span className="bar-label">{ERROR_LABEL[t.type]}</span>
                  <span className="bar-track">
                    <span className={`bar-fill ${i === 0 ? 'bar-hot' : ''}`} style={{width: `${(t.count / maxType) * 100}%`}} />
                  </span>
                  <span className="bar-value">{t.count}×</span>
                </div>
              ))
            )}
          </section>

          {report.worstMoments.length > 1 && (
            <section className="panel" aria-labelledby="momentos">
              <h2 id="momentos" className="panel-title">
                Outros lances caros
              </h2>
              <ul className="moments">
                {report.worstMoments.slice(1).map((m) => (
                  <li key={`${m.saved.game.uuid}-${m.move.ply}`}>
                    <Link href={`/u/${nick}/p/${m.saved.month}/${m.saved.game.uuid}?lance=${m.move.ply}`}>
                      <span>{momentText(m)}</span>
                      <span className="moment-tag">{m.move.errorType ? ERROR_LABEL[m.move.errorType] : ''}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.openings.length > 0 && (
            <section className="panel" aria-labelledby="aberturas">
              <h2 id="aberturas" className="panel-title">
                Suas aberturas
              </h2>
              <table className="openings">
                <thead>
                  <tr>
                    <th scope="col">Abertura</th>
                    <th scope="col">Partidas</th>
                    <th scope="col">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {report.openings.map((o) => (
                    <tr key={o.name}>
                      <td>{o.name}</td>
                      <td className="num">{o.games}</td>
                      <td className={`num ${o.score < 40 ? 'bad' : o.score >= 60 ? 'good' : ''}`}>{o.score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <section className="plan" aria-labelledby="plano">
          <div className="plan-head">
            <Mascot mood="happy" size={72} />
            <div>
              <h2 id="plano">Seu plano de treino de 30 dias</h2>
              <p className="muted">Montado a partir dos erros que mais se repetem nas suas partidas.</p>
            </div>
          </div>
          <ol className="focus-list">
            {plan.focus.map((f, i) => (
              <li key={f.key}>
                <strong>{f.title}</strong>
                <span className="muted">
                  {i === 0 ? 'Semanas 1 e 4' : `Semana ${i + 1}`}. {f.why}
                </span>
              </li>
            ))}
          </ol>

          <ol className="days">
            {plan.days.slice(0, visibleDays).map((d) => (
              <li key={d.day} className="day">
                <div className="day-head">
                  <span className="day-n">Dia {d.day}</span>
                  <strong>{d.title}</strong>
                  <span className="muted small">{d.minutes} min</span>
                </div>
                <p className="day-focus">{d.focus}</p>
                <ul>
                  {d.tasks.map((t) => (
                    <li key={t.text}>
                      {t.text}{' '}
                      {t.link && (
                        <a href={t.link.url} target="_blank" rel="noreferrer">
                          {t.link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          {!isPro && (
          <div className="locked">
            <ol className="days days-locked" aria-hidden="true">
              {plan.days.slice(FREE_DAYS, FREE_DAYS + 4).map((d) => (
                <li key={d.day} className="day">
                  <div className="day-head">
                    <span className="day-n">Dia {d.day}</span>
                    <strong>{d.title}</strong>
                  </div>
                  <ul>
                    {d.tasks.map((t) => (
                      <li key={t.text}>{t.text}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <div className="locked-cta">
              <p>
                <strong>Mais 27 dias de treino</strong> esperando por você no Zakk Chess Pro, com explicações do treinador
                em cada erro e uma nova análise no fim do mês.
              </p>
              <Link href="/pro" className="btn btn-primary">
                Desbloquear o plano completo
              </Link>
            </div>
          </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
