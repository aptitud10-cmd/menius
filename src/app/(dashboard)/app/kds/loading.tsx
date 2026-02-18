export default function KDSLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-white/[0.06] rounded-lg" />
          <div className="h-4 w-64 bg-white/[0.04] rounded-lg mt-2" />
        </div>
        <div className="h-3 w-3 rounded-full bg-white/[0.06]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 w-20 bg-white/[0.06] rounded" />
              <div className="h-5 w-16 bg-white/[0.04] rounded-full" />
            </div>
            <div className="space-y-2 mb-3">
              <div className="h-4 w-full bg-white/[0.04] rounded" />
              <div className="h-4 w-3/4 bg-white/[0.04] rounded" />
              <div className="h-4 w-1/2 bg-white/[0.04] rounded" />
            </div>
            <div className="h-3 w-24 bg-white/[0.04] rounded mt-3" />
            <div className="flex gap-2 mt-3">
              <div className="h-8 flex-1 bg-white/[0.06] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
