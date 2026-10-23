export default function AppLoading() {
  return (
    <div className="flex flex-col min-h-screen pb-24" aria-busy="true" aria-label="載入中">
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <div className="flex flex-col gap-2">
          <div className="h-9 w-20 rounded-lg bg-butter/80 animate-pulse" />
          <div className="h-4 w-28 rounded bg-butter/60 animate-pulse" />
        </div>
        <div className="h-10 w-10 rounded-full bg-butter border border-border animate-pulse" />
      </div>

      <div className="px-6 flex flex-col gap-3 flex-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-butter/60 border border-border animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
