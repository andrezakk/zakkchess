import {useMemo} from 'react';
import {Link} from 'wouter';
import {CoachBubble, Mascot} from '../components/Mascot';
import {Footer, Header} from '../components/ui';
import {ERROR_LABEL, MASCOT_NAME, PHASE_LABEL} from '../lib/coach';
import {buildPlan, buildReport, diagnosis, momentText} from '../lib/report';
import {useAnalysesVersion} from '../lib/runner';
import {listAnalyses} from '../lib/storage';

const FREE_DAYS = 3;
const fmt = (n: number) => n.toFixed(1).replace('.', ',');

export function Report({nick}: {nick: string}) {
  const version = useAnalysesVersion();
  const items = useMemo(() => listAnalyses(nick), [nick, version]);
  const report = useMemo(() => buildReport(nick, items), [nick, items]);
  const plan = useMemo(() => buildPlan(report), [report]);

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
  const maxType = Math.max(1, ...report.types.map((t) => t.count));

  return (
    <>
      <Header nick={nick} />
      <main className="page report-page">
        <h1 className="page-title">Onde você mais erra</h1>
        <p className="muted">
          Baseado em {report.games} {report.games === 1 ? 'partida analisada' : 'partidas analisadas'}.
          {report.games < 5 && ' Analise pelo menos 5 para um retrato mais fiel.'}
        </p>

        <div className="stats">
          <div className="stat">
            <span className="stat-value">{fmt(report.accuracy)}</span>
            <span className="stat-label">precisão média</span>
          </div>
          <div className="stat">
            <span className="stat-value">{report.rating ? report.rating.toLocaleString('pt-BR') : '—'}</span>
            <span className="stat-label">rating médio estimado</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {report.results.win}
              <small>V</small> {report.results.draw}
              <small>E</small> {report.results.loss}
              <small>D</small>
            </span>
            <span className="stat-label">resultados</span>
          </div>
          <div className="stat">
            <span className="stat-value">{report.brilliants}</span>
            <span className="stat-label">lances brilhantes</span>
          </div>
        </div>

        <CoachBubble mood={report.totalErrors ? 'think' : 'wow'} className="diagnosis">
          <p>
            <strong>Diagnóstico do {MASCOT_NAME}:</strong> {diagnosis(report)}
          </p>
        </CoachBubble>

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

          {report.worstMoments.length > 0 && (
            <section className="panel" aria-labelledby="momentos">
              <h2 id="momentos" className="panel-title">
                Os lances que mais custaram
              </h2>
              <ul className="moments">
                {report.worstMoments.map((m) => (
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
                <span className="focus-week">{i === 0 ? 'Semana 1 e 4' : `Semana ${i + 1}`}</span>
                <strong>{f.title}</strong>
                <span className="muted">{f.why}</span>
              </li>
            ))}
          </ol>

          <ol className="days">
            {plan.days.slice(0, FREE_DAYS).map((d) => (
              <li key={d.day} className="day">
                <div className="day-head">
                  <span className="day-n">Dia {d.day}</span>
                  <strong>{d.title}</strong>
                  <span className="muted small">{d.minutes} min</span>
                </div>
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
        </section>
      </main>
      <Footer />
    </>
  );
}
