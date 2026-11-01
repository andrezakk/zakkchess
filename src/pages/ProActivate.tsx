import {useEffect, useState} from 'react';
import {Link, useSearch} from 'wouter';
import {CoachBubble} from '../components/Mascot';
import {Footer, Header, Spinner} from '../components/ui';
import {activate} from '../lib/pro';
import {useTitle} from '../seo';

/** Página de volta do Mercado Pago depois de assinar. */
export function ProActivate() {
  useTitle('Ativando o Pro');
  const search = useSearch();
  const id = new URLSearchParams(search).get('preapproval_id');
  const [state, setState] = useState<'loading' | 'ok' | 'pending' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setState('error');
      setError('Não recebemos o código da assinatura do Mercado Pago.');
      return;
    }
    let tries = 0;
    let alive = true;
    const run = async () => {
      try {
        const info = await activate(id);
        if (!alive) return;
        if (info.active) setState('ok');
        else if (tries++ < 5) {
          setState('pending');
          setTimeout(run, 4000); // o Mercado Pago pode levar alguns segundos para confirmar
        } else setState('pending');
      } catch (e) {
        if (!alive) return;
        setState('error');
        setError(e instanceof Error ? e.message : 'Não foi possível confirmar a assinatura.');
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <>
      <Header />
      <main className="page narrow">
        <h1 className="page-title">Zakk Chess Pro</h1>
        {state === 'loading' && <Spinner label="Confirmando sua assinatura com o Mercado Pago…" />}
        {state === 'ok' && (
          <>
            <CoachBubble mood="wow">
              <p>Bem-vindo ao Pro! Agora abra suas partidas e gere o diagnóstico das últimas 30.</p>
            </CoachBubble>
            <Link href="/" className="btn btn-primary">
              Começar
            </Link>
          </>
        )}
        {state === 'pending' && (
          <CoachBubble mood="think">
            <p>
              O Mercado Pago ainda está confirmando o pagamento. Isso pode levar alguns minutos. Depois, volte em{' '}
              <Link href="/pro">Pro</Link> e toque em "Já assinei em outro aparelho" com o e-mail da sua conta do Mercado
              Pago.
            </p>
          </CoachBubble>
        )}
        {state === 'error' && (
          <>
            <CoachBubble mood="oops">
              <p>{error}</p>
            </CoachBubble>
            <Link href="/pro" className="btn btn-secondary">
              Voltar para o Pro
            </Link>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
