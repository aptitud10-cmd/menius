export default function DashboardLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 mb-2 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-32 rounded-lg bg-white/[0.04] animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-white/[0.06] animate-pulse" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-4">
            <div className="h-3.5 w-20 mb-3 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-7 w-24 mb-1 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>

      <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-6">
        <div className="h-5 w-36 mb-4 rounded bg-white/[0.06] animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-white/[0.06] animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-3/4 mb-1.5 rounded bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/[0.04] animate-pulse" />
              </div>
              <div className="h-5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
