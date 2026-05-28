export function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true" aria-label="Loading venues">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-surface p-5 animate-pulse"
        >
          <div className="flex justify-between mb-4">
            <div className="h-5 w-24 rounded bg-border" />
            <div className="h-5 w-12 rounded bg-border" />
          </div>
          <div className="h-7 w-3/4 rounded bg-border mb-2" />
          <div className="h-4 w-full rounded bg-border mb-6" />
          <div className="h-px bg-border mb-4" />
          <div className="h-4 w-5/6 rounded bg-border mb-2" />
          <div className="h-4 w-2/3 rounded bg-border mb-4" />
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full bg-border" />
            <div className="h-6 w-14 rounded-full bg-border" />
          </div>
        </div>
      ))}
    </div>
  );
}
