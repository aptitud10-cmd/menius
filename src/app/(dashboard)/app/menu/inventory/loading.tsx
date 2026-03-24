export default function InventoryLoading() {
  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <div className="skeleton h-7 w-36 mb-2" />
        <div className="skeleton h-4 w-60" />
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <div className="skeleton h-9 flex-1 rounded-lg" />
        <div className="skeleton h-9 w-28 rounded-lg" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="skeleton h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-3 w-24" />
              </div>
              <div className="skeleton h-6 w-16 rounded-full" />
              <div className="skeleton h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
