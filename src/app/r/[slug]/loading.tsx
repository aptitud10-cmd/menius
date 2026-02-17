export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero skeleton */}
      <div className="skeleton h-56 md:h-72 w-full" style={{ borderRadius: 0 }} />

      {/* Restaurant info */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="skeleton h-7 w-48 mb-2" />
          <div className="skeleton h-4 w-full max-w-sm" />
        </div>
      </div>

      {/* Category nav */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-24 rounded-full flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="max-w-4xl mx-auto px-4 mt-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="skeleton h-36 w-full" />
              <div className="p-3 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
