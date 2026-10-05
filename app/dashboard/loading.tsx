export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-busy="true">
      <div className="h-9 w-48 animate-pulse rounded-sm bg-muted" />
      <div className="mt-12 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-sm bg-muted" />
        ))}
      </div>
    </main>
  );
}
