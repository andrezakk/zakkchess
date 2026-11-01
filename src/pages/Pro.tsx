import {FormEvent, useState} from 'react';
import {CoachBubble, Mascot} from '../components/Mascot';
import {Footer, Header} from '../components/ui';
import {MASCOT_NAME} from '../lib/coach';

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
  const [email, setEmail] = useState('');
  const [nick, setNick] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setStatus('error');
      return;
    }
    setStatus('sending');
    try {
      const body = new URLSearchParams({'form-name': 'lista-pro', email, nick});
      const res = await fetch('/', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: body.toString(),
      });
      setStatus(res.ok ? 'ok' : 'error');
    } catch {
      setStatus('error');
    }
  };

  const cell = (v: boolean | string) =>
    v === true ? <span className="yes" aria-label="Incluído">✓</span> : v === false ? <span className="no" aria-label="Não incluído">—</span> : <span>{v}</span>;

  return (
    <>
      <Header />
      <main className="page pro-page">
        <section className="pro-hero">
          <Mascot mood="wow" size={110} />
          <h1>Zakk Chess Pro</h1>
          <p className="lead">
            Seu treinador de xadrez pessoal. Ele analisa suas últimas 30 partidas, mostra onde você erra e monta 30 dias de treino só
            para você.
          </p>
        </section>

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
                  Pro
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

        <section className="waitlist" aria-labelledby="lista">
          <h2 id="lista">O Pro está chegando</h2>
          <p className="muted">
            Deixe seu e-mail para entrar na lista de lançamento. Quem entrar agora ganha preço de fundador.
          </p>
          {status === 'ok' ? (
            <CoachBubble mood="wow">
              <p>Pronto, você está na lista! Eu aviso assim que o Pro abrir.</p>
            </CoachBubble>
          ) : (
            <form name="lista-pro" className="waitlist-form" onSubmit={onSubmit} noValidate>
              <label>
                <span>E-mail</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" required />
              </label>
              <label>
                <span>Nick no Chess.com (opcional)</span>
                <input value={nick} onChange={(e) => setNick(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
              </label>
              <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
                {status === 'sending' ? 'Enviando…' : 'Entrar na lista'}
              </button>
              {status === 'error' && (
                <p className="form-error" role="alert">
                  Confira o e-mail e tente de novo.
                </p>
              )}
            </form>
          )}
          <p className="muted small">Sem spam. Só um aviso do {MASCOT_NAME} quando o Pro abrir.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
