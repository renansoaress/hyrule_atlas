// Ícones SVG próprios do Hyrule Atlas (traço único, 24×24), sem dependências externas.
const PATHS: Record<string, string> = {
  search: 'M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.06-1.06-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 1.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
  star: 'M12 3.6 14.5 9l5.9.6-4.4 4 1.3 5.8L12 16.4l-5.3 3 1.3-5.8-4.4-4L9.5 9 12 3.6Z',
  close: 'M6.3 5.2 12 10.9l5.7-5.7 1.1 1.1-5.7 5.7 5.7 5.7-1.1 1.1-5.7-5.7-5.7 5.7-1.1-1.1 5.7-5.7-5.7-5.7 1.1-1.1Z',
  flask: 'M9 3h6v1.5h-1v4.8l5.2 8.6A2 2 0 0 1 17.5 21h-11a2 2 0 0 1-1.7-3.1L10 9.3V4.5H9V3Zm2.5 1.5v5.2L8.4 15h7.2l-3.1-5.3V4.5h-1Z',
  book: 'M5 4.5A2.5 2.5 0 0 1 7.5 2H19v16H7.5a1 1 0 0 0 0 2H19v1.5H7.5A2.5 2.5 0 0 1 5 19V4.5Zm2.5-1A1 1 0 0 0 6.5 4.5v12.7c.3-.1.6-.2 1-.2h10V3.5h-10Z',
  info: 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm0 1.5a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.8 6h1.6v7h-1.6v-7Zm.8-3.2a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z',
  fire: 'M12 2.5c.6 3-1.8 4.6-3 6.4A6.3 6.3 0 0 0 12 21a6.3 6.3 0 0 0 5.6-9.3c-.5 1.4-1.4 2.2-2.4 2.5.6-3.3-1-7.6-3.2-11.7Zm-.5 9.8c.2 1.6 2.6 2.4 2.6 4.6a2.3 2.3 0 0 1-4.6.2c0-1.7 1.6-2.6 2-4.8Z',
  bolt: 'M13.5 2 5 13.5h5.5L9 22l9-12h-5.6L13.5 2Z',
  sparkle: 'M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Zm7 12 .8 2.2 2.2.8-2.2.8L19 20l-.8-2.2L16 17l2.2-.8.8-2.2Z',
  grid: 'M4 4h7v7H4V4Zm1.5 1.5v4h4v-4h-4ZM13 4h7v7h-7V4Zm1.5 1.5v4h4v-4h-4ZM4 13h7v7H4v-7Zm1.5 1.5v4h4v-4h-4ZM13 13h7v7h-7v-7Zm1.5 1.5v4h4v-4h-4Z',
  arrow: 'M5 11.25h11.2l-4.7-4.7 1.06-1.06L19.06 12l-6.5 6.5-1.06-1.06 4.7-4.69H5v-1.5Z',
  back: 'M19 12.75H7.8l4.7 4.7-1.06 1.06L4.94 12l6.5-6.5 1.06 1.06-4.7 4.69H19v1.5Z',
  external: 'M14 3h7v7h-1.5V5.6l-8.2 8.2-1.1-1.1 8.2-8.2H14V3ZM5 6h6v1.5H6.5v10h10V13H18v6H5V6Z',
  check: 'M9.5 16.2 4.8 11.5l-1.1 1.1 5.8 5.8 11-11-1.1-1.1-9.9 9.9Z',
  question: 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm0 1.5a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 6.5a3 3 0 0 1 1.2 5.76c-.38.17-.45.3-.45.64v.6h-1.5v-.6c0-1.1.6-1.62 1.34-1.95A1.5 1.5 0 1 0 10.5 9.5H9a3 3 0 0 1 3-3Z',
  minus: 'M5 11.25h14v1.5H5v-1.5Z',
  dash: 'M4 11.25h3v1.5H4v-1.5Zm6.5 0h3v1.5h-3v-1.5Zm6.5 0h3v1.5h-3v-1.5Z',
  filter: 'M3 5h18v1.5l-7 7.3V20l-4-2v-4.2L3 6.5V5Zm2.4 1.5 6.1 6.4v4.2l1 .5v-4.7l6.1-6.4H5.4Z',
  sort: 'M7 3.5 11 8H8v12.5H6.5V8h-3L7 3.5ZM17 20.5 13 16h3V3.5h1.5V16h3l-4 4.5Z',
  heart: 'M12 20.5 4.6 13.3A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 7.4 6.7L12 20.5Z',
  shield: 'M12 2.5 19.5 5v6.2c0 4.7-3.2 8.5-7.5 10.3-4.3-1.8-7.5-5.6-7.5-10.3V5L12 2.5Zm0 1.6L6 6.1v5.1c0 3.8 2.5 7 6 8.6 3.5-1.6 6-4.8 6-8.6V6.1l-6-2Z',
  menu: 'M4 6.25h16v1.5H4v-1.5Zm0 5h16v1.5H4v-1.5Zm0 5h16v1.5H4v-1.5Z',
};

// ícones de traço (linhas) para formas que ficam melhores assim
const STROKES: Record<string, string> = {
  snow: 'M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.5 3.8 12 6.3l2.5-2.5M9.5 20.2 12 17.7l2.5 2.5',
};

export function Icon({ name, size = 18, title, className }: { name: string; size?: number; title?: string; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {STROKES[name] ? (
        <path d={STROKES[name]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d={PATHS[name] ?? PATHS.question} />
      )}
    </svg>
  );
}

/** Emblema original do Hyrule Atlas (rosa dos ventos estilizada), sem marcas registradas. */
export function Emblem({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="emblem">
      <defs>
        <linearGradient id="emb-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3dc9f" />
          <stop offset="1" stopColor="#b98d3e" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="none" stroke="url(#emb-g)" strokeWidth="2" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#4fd1f0" strokeOpacity=".55" strokeWidth="1.2" strokeDasharray="3 4" />
      <path d="M32 6 37 27 58 32 37 37 32 58 27 37 6 32 27 27Z" fill="url(#emb-g)" />
      <circle cx="32" cy="32" r="5" fill="#0d1c17" stroke="#4fd1f0" strokeWidth="1.6" />
    </svg>
  );
}
