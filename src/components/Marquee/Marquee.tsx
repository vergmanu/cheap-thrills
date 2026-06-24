interface MarqueeProps {
  items: string[];
  className?: string;
}

/**
 * Horizontally scrolling ticker. Items are rendered twice so the
 * -50% keyframe loops seamlessly. Pauses for prefers-reduced-motion.
 */
export function Marquee({ items, className = '' }: MarqueeProps) {
  const doubled = [...items, ...items];
  return (
    <div className={`marquee ${className}`} aria-hidden>
      <div className="marquee-track py-2.5 text-xs">
        {doubled.map((item, i) => (
          <span key={i}>{item} ✦</span>
        ))}
      </div>
    </div>
  );
}
