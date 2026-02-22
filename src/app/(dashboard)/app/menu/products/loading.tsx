export default function ProductsLoading() {
  return (
    <div>
      <div className="h-8 w-40 skeleton mb-6" />

      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 skeleton" />
          <div className="h-9 w-28 skeleton" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-24 skeleton" />
          <div className="h-9 w-48 skeleton" />
        </div>
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex items-center gap-2 mb-4">
        {[80, 72, 64, 56].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: w, height: 32 }} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="h-10 bg-gray-50 border-b border-gray-200" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
            <div className="w-3.5 h-3.5 skeleton rounded" />
            <div className="w-10 h-10 skeleton rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 skeleton" style={{ width: `${55 + (i % 3) * 15}%` }} />
              <div className="h-3 skeleton" style={{ width: `${30 + (i % 2) * 20}%` }} />
            </div>
            <div className="w-16 h-4 skeleton" />
            <div className="w-14 h-5 skeleton rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
