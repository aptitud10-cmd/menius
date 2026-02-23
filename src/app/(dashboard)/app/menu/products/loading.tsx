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
          <div className="h-9 w-44 skeleton" />
        </div>
      </div>

      {/* Hierarchical table skeleton */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="h-9 bg-gray-50 border-b border-gray-200" />

        {/* Category group 1 */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <div className="w-4 h-4 skeleton rounded" />
          <div className="h-4 w-24 skeleton" />
          <div className="h-3 w-6 skeleton" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`a${i}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50">
            <div className="w-3.5 h-3.5 skeleton rounded" />
            <div className="w-9 h-9 skeleton rounded-lg" />
            <div className="flex-1">
              <div className="h-4 skeleton" style={{ width: `${50 + (i % 3) * 15}%` }} />
            </div>
            <div className="w-16 h-4 skeleton" />
            <div className="w-12 h-5 skeleton rounded-full" />
          </div>
        ))}

        {/* Category group 2 */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <div className="w-4 h-4 skeleton rounded" />
          <div className="h-4 w-20 skeleton" />
          <div className="h-3 w-6 skeleton" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`b${i}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50">
            <div className="w-3.5 h-3.5 skeleton rounded" />
            <div className="w-9 h-9 skeleton rounded-lg" />
            <div className="flex-1">
              <div className="h-4 skeleton" style={{ width: `${45 + (i % 2) * 20}%` }} />
            </div>
            <div className="w-16 h-4 skeleton" />
            <div className="w-12 h-5 skeleton rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
