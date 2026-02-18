export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-56 bg-white/[0.06] rounded-lg" />
          <div className="h-4 w-40 bg-white/[0.04] rounded-lg mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-white/[0.06] rounded-xl" />
          <div className="h-9 w-24 bg-white/[0.06] rounded-xl" />
        </div>
      </div>

      {/* KPI skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-4">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] mb-3" />
            <div className="h-7 w-16 bg-white/[0.06] rounded-lg" />
            <div className="h-3 w-24 bg-white/[0.04] rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Orders skeleton */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06]">
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="h-4 w-32 bg-white/[0.06] rounded" />
          <div className="h-3 w-20 bg-white/[0.04] rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] last:border-0">
            <div className="flex items-center gap-3">
              <div>
                <div className="h-4 w-28 bg-white/[0.06] rounded" />
                <div className="h-3 w-20 bg-white/[0.04] rounded mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 bg-white/[0.06] rounded-full" />
              <div className="h-4 w-14 bg-white/[0.06] rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick links skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-[#0a0a0a] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
            <div className="h-4 w-28 bg-white/[0.06] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
