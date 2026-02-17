export default function DashboardLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-48 mb-2" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="skeleton h-9 w-28 rounded-lg" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="skeleton h-3.5 w-20 mb-3" />
            <div className="skeleton h-7 w-24 mb-1" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="skeleton h-5 w-36 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-10 w-10 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="skeleton h-4 w-3/4 mb-1.5" />
                <div className="skeleton h-3 w-1/2" />
              </div>
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
