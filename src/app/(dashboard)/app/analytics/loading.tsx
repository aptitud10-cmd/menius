export default function AnalyticsLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <div className="skeleton h-7 w-36 mb-2" />
        <div className="skeleton h-4 w-56" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="skeleton h-3.5 w-24 mb-3" />
            <div className="skeleton h-8 w-28" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="skeleton h-5 w-32 mb-4" />
          <div className="skeleton h-48 w-full rounded-lg" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="skeleton h-5 w-40 mb-4" />
          <div className="skeleton h-48 w-full rounded-lg" />
        </div>
      </div>

      {/* Top products */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="skeleton h-5 w-36 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-6 w-6 rounded-full" />
              <div className="skeleton h-4 flex-1 max-w-xs" />
              <div className="skeleton h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
