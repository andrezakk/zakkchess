import {FormEvent, useState} from 'react';
import {Link, useLocation} from 'wouter';
import type {MoveClass} from '../lib/analysis';
import {CLASS_INFO} from '../lib/coach';

export function Logo() {
  return (
    <span className="logo" aria-label="Zakk Chess">
      <span>ZAKK</span> <span className="logo-accent">CHESS</span>
    </span>
  );
}

export function Header({nick}: {nick?: string}) {
  return (
    <header className="site-header">
      <Link href="/" className="logo-link" aria-label="Zakk Chess, página inicial">
        <Logo />
      </Link>
      <nav className="header-nav" aria-label="Principal">
        {nick && (
          <>
            <Link href={`/u/${nick}`}>Partidas</Link>
            <Link href={`/u/${nick}/relatorio`}>Relatório</Link>
          </>
        )}
        <Link href="/pro" className="nav-pro">
          Pro
        </Link>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <Logo />
      <p>Treine. Analise. Evolua.</p>
      <p className="fine">
        Análise feita pelo Stockfish, no seu próprio aparelho. Zakk Chess não é afiliado ao Chess.com.
      </p>
    </footer>
  );
}

export function ClassBadge({cls, size = 'md'}: {cls: MoveClass; size?: 'sm' | 'md' | 'lg'}) {
  const info = CLASS_INFO[cls];
  return (
    <span className={`badge badge-${size}`} style={{background: info.color}} title={info.label} aria-label={info.label}>
      {info.symbol}
    </span>
  );
}

export function NickForm({compact = false, initial = ''}: {compact?: boolean; initial?: string}) {
  const [nick, setNick] = useState(initial);
  const [error, setError] = useState('');
  const [, navigate] = useLocation();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = nick.trim().replace(/^@/, '').replace(/.*chess\.com\/member\//i, '').replace(/\/.*$/, '');
    if (!/^[A-Za-z0-9_-]{3,25}$/.test(clean)) {
      setError('Digite o nick como aparece no seu perfil do Chess.com (letras, números, _ ou -).');
      return;
    }
    setError('');
    navigate(`/u/${clean.toLowerCase()}`);
  };

  return (
    <form className={`nick-form ${compact ? 'nick-form-compact' : ''}`} onSubmit={onSubmit} noValidate>
      <label htmlFor={compact ? 'nick-c' : 'nick'} className="sr-only">
        Seu nick no Chess.com
      </label>
      <input
        id={compact ? 'nick-c' : 'nick'}
        value={nick}
        onChange={(e) => setNick(e.target.value)}
        placeholder="Seu nick no Chess.com"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="username"
        enterKeyHint="go"
        aria-invalid={!!error}
        aria-describedby={error ? 'nick-err' : undefined}
      />
      <button type="submit">Analisar minhas partidas</button>
      {error && (
        <p id="nick-err" className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function Spinner({label}: {label: string}) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
