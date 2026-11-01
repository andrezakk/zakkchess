import {useEffect} from 'react';
import {Link, Route, Switch, useLocation, useSearch} from 'wouter';
import {Home} from './pages/Home';
import {Player} from './pages/Player';
import {Game} from './pages/Game';
import {Report} from './pages/Report';
import {Pro} from './pages/Pro';
import {ProActivate} from './pages/ProActivate';
import {Footer, Header} from './components/ui';
import {CoachBubble} from './components/Mascot';

function ScrollTop() {
  const [loc] = useLocation();
  useEffect(() => window.scrollTo(0, 0), [loc]);
  return null;
}

function GameRoute({params}: {params: {nick: string; y: string; m: string; uuid: string}}) {
  const search = useSearch();
  const lance = Number(new URLSearchParams(search).get('lance')) || undefined;
  return <Game key={params.uuid} nick={params.nick} month={`${params.y}/${params.m}`} uuid={params.uuid} initialPly={lance} />;
}

export function App() {
  return (
    <>
      <ScrollTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/pro" component={Pro} />
        <Route path="/pro/ativar" component={ProActivate} />
        <Route path="/u/:nick">{(p) => <Player key={p.nick} nick={p.nick} />}</Route>
        <Route path="/u/:nick/relatorio">{(p) => <Report nick={p.nick} />}</Route>
        <Route path="/u/:nick/p/:y/:m/:uuid" component={GameRoute} />
        <Route>
          <Header />
          <main className="page narrow">
            <CoachBubble mood="oops">
              <p>Esta página não existe. Volte para o início e digite seu nick.</p>
            </CoachBubble>
            <Link href="/" className="btn btn-primary">
              Ir para o início
            </Link>
          </main>
          <Footer />
        </Route>
      </Switch>
    </>
  );
}
