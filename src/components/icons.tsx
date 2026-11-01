// Ícones desenhados (um traço só, mesma espessura), no lugar de símbolos de texto.
type P = {size?: number; className?: string};

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconStar = ({size = 16, className}: P) => (
  <svg {...base(size)} className={className} fill="currentColor" strokeWidth={1.6}>
    <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9L3.4 9.5l6-.8z" />
  </svg>
);

export const IconCheck = ({size = 16, className}: P) => (
  <svg {...base(size)} className={className} strokeWidth={3}>
    <path d="M5 12.5l4.2 4.2L19 7" />
  </svg>
);

export const IconBook = ({size = 16, className}: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 5.5C6.5 4.3 9.3 4.3 12 6c2.7-1.7 5.5-1.7 8-.5V19c-2.5-1.2-5.3-1.2-8 .5-2.7-1.7-5.5-1.7-8-.5z" />
    <path d="M12 6v13.5" />
  </svg>
);

export const IconFirst = ({size = 20, className}: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 5v14M18 6l-7 6 7 6" />
  </svg>
);
export const IconPrev = ({size = 20, className}: P) => (
  <svg {...base(size)} className={className}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const IconNext = ({size = 20, className}: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);
export const IconLast = ({size = 20, className}: P) => (
  <svg {...base(size)} className={className}>
    <path d="M18 5v14M6 6l7 6-7 6" />
  </svg>
);
export const IconArrowLeft = ({size = 18, className}: P) => (
  <svg {...base(size)} className={className}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

/** Rei pequeno que indica com que cor a pessoa jogou (branco ou preto). */
export function SideKing({color, label}: {color: 'white' | 'black'; label?: string}) {
  const fill = color === 'white' ? '#f6f3ea' : '#0b0d12';
  const stroke = color === 'white' ? '#0b0d12' : '#c3cbdb';
  return (
    <svg
      className="side-king"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d="M12 2.5v4M10 4.5h4" stroke={color === 'white' ? '#f6f3ea' : '#c3cbdb'} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6.5 20.5h11l1-3.2c1.9-1.2 3-3.2 2.6-5.3-.5-2.4-3-3.6-5.1-2.6-1 .5-1.9 1.4-2.5 2.6h-3c-.6-1.2-1.5-2.1-2.5-2.6-2.1-1-4.6.2-5.1 2.6-.4 2.1.7 4.1 2.6 5.3z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
