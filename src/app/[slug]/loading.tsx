export default function MenuLoading() {
  return (
    <div className="min-h-[100dvh] bg-[#f5f5f3] flex flex-col overflow-hidden">

      {/* ── Header bar ── */}
      <div className="h-14 bg-white border-b border-gray-100 px-4 flex items-center gap-3 flex-shrink-0">
        <div className="skeleton w-8 h-8 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-4 w-32 rounded-lg" />
          <div className="skeleton h-3 w-20 rounded-lg" />
        </div>
        <div className="skeleton w-9 h-9 rounded-full" />
      </div>

      {/* ── Cover photo ── */}
      <div className="skeleton w-full h-44 flex-shrink-0" />

      {/* ── Restaurant info strip ── */}
      <div className="bg-white px-4 pt-3 pb-4 flex-shrink-0">
        <div className="skeleton h-5 w-40 rounded-lg mb-2" />
        <div className="flex gap-3">
          <div className="skeleton h-3.5 w-16 rounded" />
          <div className="skeleton h-3.5 w-20 rounded" />
          <div className="skeleton h-3.5 w-14 rounded" />
        </div>
      </div>

      {/* ── Category pills bar ── */}
      <div className="bg-[#f5f5f3] border-b border-gray-100 px-3 py-2 flex gap-2 overflow-hidden flex-shrink-0">
        {[72, 56, 80, 64, 60, 68].map((w, i) => (
          <div
            key={i}
            className="skeleton h-8 rounded-lg flex-shrink-0"
            style={{ width: w, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>

      {/* ── Section title ── */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="skeleton h-4 w-24 rounded-lg" />
      </div>

      {/* ── Product grid (2 columns — matches real layout) ── */}
      <div className="px-3 grid grid-cols-2 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl overflow-hidden border border-gray-100"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {/* Image placeholder */}
            <div className="skeleton w-full aspect-[4/3]" />
            {/* Content */}
            <div className="p-3 space-y-2">
              <div className="skeleton h-3.5 w-full rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
              <div className="flex items-center justify-between pt-1">
                <div className="skeleton h-4 w-14 rounded" />
                <div className="skeleton w-9 h-9 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
