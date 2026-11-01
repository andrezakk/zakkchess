import {useEffect, useMemo, useState} from 'react';
import {Link} from 'wouter';
import {CoachBubble} from '../components/Mascot';
import {Footer, Header, NickForm, Spinner} from '../components/ui';
import {
  ChessComError,
  formatDate,
  getArchives,
  getMonth,
  getPlayer,
  getRatings,
  monthLabel,
  openingName,
  outcomeFor,
  TIME_CLASS_LABEL,
  timeControlLabel,
  userSide,
  type ChessComGame,
  type ChessComPlayer,
  type Ratings,
} from '../lib/chesscom';
import {MASCOT_NAME} from '../lib/coach';
import {enqueue, cancelQueue, useAnalysesVersion, useRunner} from '../lib/runner';
import {useTitle} from '../seo';
import {getDepth, listAnalyses, loadAnalysis, setDepth} from '../lib/storage';
import {usePro} from '../lib/pro';

type MonthGames = {month: string; games: ChessComGame[]};
type Filter = 'all' | 'rapid' | 'blitz' | 'bullet' | 'daily';

const OUTCOME_LABEL = {win: 'Vitória', loss: 'Derrota', draw: 'Empate'};
const BATCH = 10;
const PRO_BATCH = 30;

export function Player({nick}: {nick: string}) {
  useTitle(`Partidas de ${nick}`);
  const [player, setPlayer] = useState<ChessComPlayer | null>(null);
  const [ratings, setRatings] = useState<Ratings>({});
  const [archives, setArchives] = useState<string[]>([]);
  const [months, setMonths] = useState<MonthGames[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [depth, setDepthState] = useState(getDepth());
  const runner = useRunner();
  const {isPro} = usePro();
  const [gathering, setGathering] = useState(false);
  const version = useAnalysesVersion();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setMonths([]);
    (async () => {
      try {
        const p = await getPlayer(nick);
        if (!alive) return;
        setPlayer(p);
        getRatings(nick).then((r) => alive && setRatings(r)).catch(() => undefined);
        const arch = await getArchives(nick);
        if (!alive) return;
        setArchives(arch);
        // Carrega meses até juntar pelo menos 20 partidas (ou 3 meses).
        const loaded: MonthGames[] = [];
        let count = 0;
        for (const m of arch.slice(0, 3)) {
          const games = await getMonth(nick, m);
          loaded.push({month: m, games});
          count += games.length;
          if (count >= 20) break;
        }
        if (alive) setMonths(loaded);
      } catch (e) {
        if (alive) setError(e instanceof ChessComError ? e.message : 'Algo deu errado ao buscar suas partidas.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [nick]);

  const nextMonth = archives[months.length];
  const loadMore = async () => {
    if (!nextMonth) return;
    setLoadingMore(true);
    try {
      const games = await getMonth(nick, nextMonth);
      setMonths((ms) => [...ms, {month: nextMonth, games}]);
    } catch (e) {
      setError(e instanceof ChessComError ? e.message : 'Não deu para carregar mais partidas.');
    } finally {
      setLoadingMore(false);
    }
  };

  const allGames = useMemo(() => months.flatMap((m) => m.games.map((g) => ({g, month: m.month}))), [months]);
  const analyzedCount = useMemo(() => listAnalyses(nick).length, [nick, version]);
  const pending = allGames.filter(({g}) => !loadAnalysis(nick, g.uuid));
  const queued = runner.queue.length + (runner.current ? 1 : 0);

  const analyzeBatch = async () => {
    if (!isPro) {
      pending
        .filter(({g}) => filter === 'all' || g.time_class === filter)
        .slice(0, BATCH)
        .forEach(({g, month}) => enqueue({username: nick, month, game: g}));
      return;
    }
    // Pro: diagnóstico das 30 partidas mais recentes (busca meses anteriores se precisar).
    setGathering(true);
    try {
      let loaded = months;
      const count = () => loaded.flatMap((m) => m.games).filter((g) => filter === 'all' || g.time_class === filter).length;
      while (count() < PRO_BATCH && archives[loaded.length] && loaded.length < 12) {
        const m = archives[loaded.length];
        loaded = [...loaded, {month: m, games: await getMonth(nick, m)}];
      }
      setMonths(loaded);
      loaded
        .flatMap((m) => m.games.map((g) => ({g, month: m.month})))
        .filter(({g}) => filter === 'all' || g.time_class === filter)
        .slice(0, PRO_BATCH)
        .filter(({g}) => !loadAnalysis(nick, g.uuid))
        .forEach(({g, month}) => enqueue({username: nick, month, game: g}));
    } catch (e) {
      setError(e instanceof ChessComError ? e.message : 'Não deu para buscar as partidas.');
    } finally {
      setGathering(false);
    }
  };

  const changeDepth = (d: number) => {
    setDepth(d);
    setDepthState(d);
  };

  if (error && !player) {
    return (
      <>
        <Header />
        <main className="page narrow">
          <CoachBubble mood="oops">
            <p>{error}</p>
          </CoachBubble>
          <NickForm initial={nick} />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header nick={nick} />
      <main className="page">
        <section className="profile">
          {player?.avatar ? (
            <img className="avatar" src={player.avatar} alt="" width={64} height={64} />
          ) : (
            <span className="avatar avatar-empty" aria-hidden="true">
              {nick.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="profile-main">
            <h1 className="profile-name">{player?.username ?? nick}</h1>
            <ul className="ratings" aria-label="Ratings no Chess.com">
              {(['rapid', 'blitz', 'bullet', 'daily'] as const)
                .filter((k) => ratings[k])
                .map((k) => (
                  <li key={k}>
                    <span>{TIME_CLASS_LABEL[k]}</span> <strong>{ratings[k]}</strong>
                  </li>
                ))}
            </ul>
          </div>
        </section>

        <section className="batch-card" aria-label="Analisar várias partidas">
          <div className="batch-text">
            {runner.current || runner.queue.length ? (
              <p>
                Analisando… faltam <strong>{queued}</strong> {queued === 1 ? 'partida' : 'partidas'}. Pode continuar
                navegando nesta aba.
              </p>
            ) : analyzedCount >= 3 ? (
              <p>
                Você já tem <strong>{analyzedCount}</strong> partidas analisadas. Veja onde você mais erra.
              </p>
            ) : (
              <p>
                Analise algumas partidas e o {MASCOT_NAME} monta seu relatório de pontos fracos. Quanto mais partidas,
                mais certeiro.
              </p>
            )}
          </div>
          <div className="batch-actions">
            {runner.current || runner.queue.length ? (
              <button className="btn btn-ghost" onClick={cancelQueue}>
                Parar depois desta
              </button>
            ) : (
              <button className="btn btn-primary" onClick={analyzeBatch} disabled={(!isPro && !pending.length) || loading || gathering}>
                {gathering
                  ? 'Buscando partidas…'
                  : isPro
                    ? `Diagnóstico das últimas ${PRO_BATCH}`
                    : `Analisar as ${Math.min(BATCH, pending.length) || BATCH} mais recentes`}
              </button>
            )}
            {analyzedCount > 0 && (
              <Link href={`/u/${nick}/relatorio`} className="btn btn-secondary">
                Ver relatório
              </Link>
            )}
          </div>
          {!isPro && (
            <p className="pro-hint">
              Quer o diagnóstico das suas últimas 30 partidas e o plano de 30 dias completo?{' '}
              <Link href="/pro">Conheça o Pro</Link>
            </p>
          )}
          <div className="depth-row">
            <span id="depth-label">Profundidade da análise</span>
            <div className="seg" role="radiogroup" aria-labelledby="depth-label">
              {[
                {d: 12, l: 'Rápida'},
                {d: 14, l: 'Normal'},
                {d: 18, l: 'Profunda'},
              ].map((o) => (
                <button key={o.d} role="radio" aria-checked={depth === o.d} onClick={() => changeDepth(o.d)}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="filters" role="radiogroup" aria-label="Filtrar por ritmo">
          {(['all', 'rapid', 'blitz', 'bullet', 'daily'] as Filter[]).map((f) => (
            <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todas' : TIME_CLASS_LABEL[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <Spinner label="Buscando suas partidas no Chess.com…" />
        ) : months.length === 0 || allGames.length === 0 ? (
          <CoachBubble mood="think">
            <p>Não achamos partidas de xadrez normal neste perfil. Jogue uma partida no Chess.com e volte aqui.</p>
          </CoachBubble>
        ) : (
          months.map((m) => {
            const games = m.games.filter((g) => filter === 'all' || g.time_class === filter);
            if (!games.length) return null;
            return (
              <section key={m.month} className="month" aria-label={monthLabel(m.month)}>
                <h2 className="month-title">{monthLabel(m.month)}</h2>
                <ul className="game-list">
                  {games.map((g) => (
                    <GameRow key={g.uuid} g={g} month={m.month} nick={nick} runnerUuid={runner.current?.uuid} progress={runner.current} queued={runner.queue.includes(g.uuid)} version={version} />
                  ))}
                </ul>
              </section>
            );
          })
        )}

        {error && player && <p className="form-error">{error}</p>}
        {!loading && nextMonth && (
          <button className="btn btn-ghost load-more" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Carregando…' : `Carregar ${monthLabel(nextMonth).toLowerCase()}`}
          </button>
        )}
      </main>
      <Footer />
    </>
  );
}

function GameRow({
  g,
  month,
  nick,
  runnerUuid,
  progress,
  queued,
}: {
  g: ChessComGame;
  month: string;
  nick: string;
  runnerUuid?: string;
  progress: {done: number; total: number} | null;
  queued: boolean;
  version: number;
}) {
  const side = userSide(g, nick);
  const opp = side === 'white' ? g.black : g.white;
  const me = g[side];
  const out = outcomeFor(g, nick);
  const saved = loadAnalysis(nick, g.uuid);
  const sum = saved ? (side === 'white' ? saved.analysis.white : saved.analysis.black) : null;
  const running = runnerUuid === g.uuid;
  const opening = openingName(g);

  return (
    <li>
      <Link href={`/u/${nick}/p/${month}/${g.uuid}`} className={`game-row out-${out}`}>
        <span className={`side-dot side-${side}`} aria-label={side === 'white' ? 'Você de brancas' : 'Você de pretas'} />
        <span className="game-main">
          <span className="game-opp">
            {opp.username} <span className="muted">({opp.rating})</span>
          </span>
          <span className="game-meta">
            {TIME_CLASS_LABEL[g.time_class]} · {timeControlLabel(g.time_control)} · {formatDate(g.end_time)}
            {opening ? ` · ${opening}` : ''}
          </span>
        </span>
        <span className="game-side">
          <span className={`result result-${out}`}>{OUTCOME_LABEL[out]}</span>
          {sum ? (
            <span className="acc-pill" title="Sua precisão nesta partida">
              {sum.accuracy.toFixed(1).replace('.', ',')}
            </span>
          ) : running && progress ? (
            <span className="acc-pill acc-running">{Math.round((progress.done / progress.total) * 100)}%</span>
          ) : queued ? (
            <span className="acc-pill acc-queued">na fila</span>
          ) : (
            <span className="acc-pill acc-none">{me.rating}</span>
          )}
        </span>
      </Link>
    </li>
  );
}
