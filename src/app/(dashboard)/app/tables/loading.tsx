export default function TablesLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 bg-white/[0.06] rounded-lg" />
          <div className="h-4 w-56 bg-white/[0.04] rounded-lg mt-2" />
        </div>
        <div className="h-9 w-32 bg-white/[0.06] rounded-xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-24 bg-white/[0.06] rounded" />
              <div className="h-6 w-12 bg-white/[0.04] rounded-full" />
            </div>
            <div className="w-32 h-32 mx-auto bg-white/[0.04] rounded-xl mb-4" />
            <div className="flex gap-2">
              <div className="h-8 flex-1 bg-white/[0.04] rounded-lg" />
              <div className="h-8 flex-1 bg-white/[0.04] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
