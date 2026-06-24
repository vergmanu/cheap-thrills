interface SquiggleProps {
  className?: string;
}

/** Hand-drawn wave divider. Color via `text-*`, width via `className`. */
export function Squiggle({ className = 'w-48 text-accent' }: SquiggleProps) {
  return (
    <svg
      viewBox="0 0 240 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      className={`h-auto overflow-visible ${className}`}
      aria-hidden
    >
      <path d="M3 12C21 4 39 4 57 12C75 20 93 20 111 12C129 4 147 4 165 12C183 20 201 20 219 12C226 9 231 9 237 11" />
    </svg>
  );
}
