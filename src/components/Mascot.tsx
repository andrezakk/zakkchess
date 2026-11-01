import type {Mood} from '../lib/coach';

const INK = '#10141b';

/** Pipo, o cavalinho treinador. Desenho próprio em SVG. */
export function Mascot({mood = 'happy', size = 56, className = ''}: {mood?: Mood; size?: number; className?: string}) {
  return (
    <svg
      className={`mascot mascot-${mood} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      {/* crina de trás */}
      <path
        d="M52 30 C40 20 26 28 30 40 C18 42 16 56 26 62 C16 68 18 84 30 84 C22 94 30 106 42 104 L50 60 Z"
        fill="#2f7d6d"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* orelha */}
      <path d="M52 36 L50 10 L68 30 Z" fill="#e8d9b5" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M54 30 L53 18 L62 28 Z" fill="#f2a7a0" />
      {/* cabeça */}
      <path
        d="M40 114 C30 94 30 72 38 54 C44 38 56 28 72 28 C84 28 92 38 100 50 C106 58 113 64 111 73 C109 83 99 86 89 84 C81 83 75 86 70 93 C67 100 67 107 69 114 Z"
        fill="#f6ecd2"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* topete */}
      <path
        d="M56 34 C58 20 72 16 78 26 C72 24 68 28 66 34 C64 30 60 30 56 34 Z"
        fill="#4fd1b0"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* focinho */}
      <ellipse cx="99" cy="72" rx="12" ry="10" fill="#e3cfa2" />
      <ellipse cx="104" cy="67" rx="2" ry="2.8" fill={INK} />
      {/* bochecha */}
      <ellipse cx="82" cy="66" rx="6" ry="3.6" fill="#f2a7a0" opacity="0.75" />

      {/* olho */}
      {mood === 'think' ? (
        <g>
          <ellipse cx="73" cy="50" rx="7.5" ry="9" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx="75" cy="45" r="4.6" fill={INK} />
          <circle cx="76.5" cy="43.5" r="1.4" fill="#fff" />
        </g>
      ) : mood === 'wow' ? (
        <g>
          <ellipse cx="73" cy="50" rx="7.5" ry="9" fill={INK} />
          <path d="M73 43 L74.6 47.6 L79 48 L75.6 51 L76.6 55.5 L73 53 L69.4 55.5 L70.4 51 L67 48 L71.4 47.6 Z" fill="#4fd1b0" />
        </g>
      ) : (
        <g>
          <ellipse cx="73" cy="50" rx="7" ry="8.5" fill={INK} />
          <circle cx="75.5" cy="46" r="2.8" fill="#fff" />
          <circle cx="70.5" cy="53.5" r="1.3" fill="#fff" />
        </g>
      )}

      {/* sobrancelha */}
      {mood === 'oops' && <path d="M64 37 Q72 33 80 39" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
      {mood === 'think' && <path d="M66 36 Q74 34 81 37" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}

      {/* boca */}
      {mood === 'happy' && <path d="M91 79 Q98 84 105 79" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
      {mood === 'wow' && <ellipse cx="98" cy="80" rx="3.6" ry="3" fill={INK} />}
      {mood === 'oops' && <path d="M91 81 Q94.5 78 98 81 T105 81" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
      {mood === 'think' && <path d="M93 80 L104 79" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}

      {/* gota de suor */}
      {mood === 'oops' && <path d="M92 32 C88 39 88 44 92 45 C96 44 96 39 92 32 Z" fill="#7fd3f2" stroke={INK} strokeWidth="2" />}
      {/* brilho */}
      {mood === 'wow' && (
        <g fill="#f3c04f" stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
          <path d="M100 22 L102 29 L109 31 L102 33 L100 40 L98 33 L91 31 L98 29 Z" />
        </g>
      )}
    </svg>
  );
}

export function CoachBubble({
  mood = 'happy',
  children,
  className = '',
}: {
  mood?: Mood;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`coach ${className}`}>
      <Mascot mood={mood} size={52} />
      <div className="coach-text">{children}</div>
    </div>
  );
}
