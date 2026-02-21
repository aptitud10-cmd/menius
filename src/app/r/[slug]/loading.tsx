export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header skeleton */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="skeleton h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-3 w-24" />
          </div>
          <div className="skeleton h-9 w-20 rounded-full" />
        </div>
      </header>

      {/* Category pills skeleton */}
      <div className="sticky top-[57px] z-20 bg-white border-b border-gray-100 lg:hidden">
        <div className="flex gap-2 px-4 py-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-8 rounded-full flex-shrink-0" style={{ width: `${60 + i * 12}px` }} />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-4 pb-28 flex gap-6">
        {/* Desktop sidebar skeleton */}
        <aside className="hidden lg:block w-56 flex-shrink-0 space-y-2 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-full rounded-xl" />
          ))}
        </aside>

        {/* Products skeleton */}
        <div className="flex-1 space-y-6">
          {/* Category title */}
          <div className="skeleton h-6 w-32 mt-2" />

          {/* Mobile: list cards */}
          <div className="lg:hidden space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 bg-white rounded-2xl border border-gray-100">
                <div className="flex-1 space-y-2 py-1">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-4 w-16 mt-1" />
                </div>
                <div className="skeleton w-[88px] h-[88px] rounded-xl flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* Desktop: grid cards */}
          <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="skeleton h-40 w-full" style={{ borderRadius: 0 }} />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-5 w-20 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar skeleton (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="skeleton h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
