import {FormEvent, useState} from 'react';
import {Link} from 'wouter';
import {cancelPro, formatDate, restore, startCheckout, usePro} from '../lib/pro';
import {CoachBubble, Mascot} from '../components/Mascot';
import {Footer, Header} from '../components/ui';
import {MASCOT_NAME} from '../lib/coach';
import {PAGES, useSeo} from '../seo';

const ROWS: {feature: string; free: boolean | string; pro: boolean | string}[] = [
  {feature: 'Análise de partidas com o Stockfish', free: 'Ilimitada', pro: 'Ilimitada'},
  {feature: 'Notas de cada lance, precisão e rating estimado', free: true, pro: true},
  {feature: 'Relatório "onde você mais erra"', free: true, pro: true},
  {feature: 'Diagnóstico das suas últimas 30 partidas de uma vez', free: false, pro: true},
  {feature: 'Erros que mais se repetem, com exemplos das suas partidas', free: 'Básico', pro: 'Completo'},
  {feature: 'Plano de treino de 30 dias', free: '3 dias', pro: 'Completo'},
  {feature: 'Nova análise a cada 30 dias, com a sua evolução', free: false, pro: true},
];

const STEPS = [
  {title: 'Diagnóstico', text: 'O treinador analisa suas últimas 30 partidas com o Stockfish e encontra os padrões: em que fase, em que tipo de posição e com qual abertura você mais perde pontos.'},
  {title: '30 dias de treino', text: 'Você recebe um plano dividido dia a dia, com tempo estimado, exercícios e partidas para jogar. Cabe na rotina.'},
  {title: 'Direto no tabuleiro', text: 'Cada erro do plano leva para a posição da sua partida, com o lance que você jogou e o que era melhor.'},
  {title: 'Reanálise', text: 'No fim do mês, ele analisa de novo, compara com o mês anterior e monta o próximo plano.'},
];

export function Pro() {
  useSeo(PAGES.pro);
  const cell = (v: boolean | string) =>
    v === true ? <span className="yes" aria-label="Incluído">✓</span> : v === false ? <span className="no" aria-label="Não incluído">—</span> : <span>{v}</span>;

  return (
    <>
      <Header />
      <main className="page pro-page">
        <section className="pro-hero">
          <Mascot mood="wow" size={110} />
          <h1>Zakk Chess Pro</h1>
          <p className="pro-price">
            <strong>R$ 19,99</strong> por mês
          </p>
          <p className="lead">
            Seu treinador de xadrez pessoal. Ele analisa suas últimas 30 partidas, mostra onde você erra e monta 30 dias de
            treino só para você.
          </p>
        </section>

        <Subscribe />

        <ol className="steps pro-steps">
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

        <section className="panel compare" aria-labelledby="comparar">
          <h2 id="comparar" className="panel-title">
            Grátis ou Pro
          </h2>
          <table>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Recurso</span>
                </th>
                <th scope="col">Grátis</th>
                <th scope="col" className="pro-col">
                  Pro <span className="th-price">R$ 19,99/mês</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.feature}>
                  <th scope="row">{r.feature}</th>
                  <td>{cell(r.free)}</td>
                  <td className="pro-col">{cell(r.pro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Subscribe() {
  const pro = usePro();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [email, setEmail] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const subscribe = async () => {
    setBusy(true);
    setError('');
    try {
      await startCheckout();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível abrir o pagamento.');
      setBusy(false);
    }
  };

  const onRestore = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await restore(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível recuperar o acesso.');
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    setBusy(true);
    setError('');
    try {
      await cancelPro();
      setConfirmCancel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cancelar.');
    } finally {
      setBusy(false);
    }
  };

  if (pro.isPro && pro.info) {
    const cancelled = pro.info.status !== 'authorized';
    return (
      <section className="subscribe" aria-labelledby="assinatura">
        <h2 id="assinatura">Você é Pro</h2>
        <CoachBubble mood="wow">
          <p>
            {cancelled
              ? `Assinatura cancelada. Seu acesso Pro continua até ${formatDate(pro.info.paidUntil)}.`
              : `Tudo certo! ${pro.info.nextPayment ? `A próxima cobrança é em ${formatDate(pro.info.nextPayment)}.` : ''}`}
          </p>
        </CoachBubble>
        <p className="muted">Abra suas partidas e toque em "Diagnóstico das últimas 30" para gerar seu plano completo.</p>
        {!cancelled &&
          (confirmCancel ? (
            <div className="cancel-confirm">
              <p>Cancelar a assinatura? Você não será mais cobrado.</p>
              <div className="batch-actions">
                <button className="btn btn-ghost" onClick={() => setConfirmCancel(false)} disabled={busy}>
                  Manter assinatura
                </button>
                <button className="btn btn-danger" onClick={onCancel} disabled={busy}>
                  {busy ? 'Cancelando…' : 'Cancelar assinatura'}
                </button>
              </div>
            </div>
          ) : (
            <button className="link-btn" onClick={() => setConfirmCancel(true)}>
              Cancelar assinatura
            </button>
          ))}
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="subscribe" aria-labelledby="assinatura">
      <h2 id="assinatura" className="sr-only">
        Assinar
      </h2>
      <button className="btn btn-primary btn-big" onClick={subscribe} disabled={busy}>
        {busy && !showRestore ? 'Abrindo o Mercado Pago…' : 'Assinar o Pro por R$ 19,99/mês'}
      </button>
      <p className="muted small">
        Pagamento seguro pelo Mercado Pago, com cartão. Cobrança mensal, cancele quando quiser aqui mesmo.
      </p>
      {pro.hasPass && pro.info && !pro.info.active && (
        <p className="muted small">Sua assinatura anterior não está mais ativa. Assine de novo para voltar ao Pro.</p>
      )}
      {showRestore ? (
        <form className="waitlist-form" onSubmit={onRestore} noValidate>
          <label>
            <span>E-mail da sua conta do Mercado Pago</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" required />
          </label>
          <button type="submit" className="btn btn-secondary" disabled={busy}>
            {busy ? 'Procurando…' : 'Recuperar acesso'}
          </button>
        </form>
      ) : (
        <button className="link-btn" onClick={() => setShowRestore(true)}>
          Já assinei em outro aparelho
        </button>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="muted small">
        Dúvidas? O {MASCOT_NAME} explica tudo em <a href="/#como">como funciona</a>.
      </p>
    </section>
  );
}
