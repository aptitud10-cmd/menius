export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-56 skeleton mb-2" />
          <div className="h-4 w-40 skeleton" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 skeleton" />
          <div className="h-9 w-24 skeleton" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="w-9 h-9 skeleton mb-3" />
            <div className="h-7 w-16 skeleton" />
            <div className="h-3 w-24 skeleton mt-2" />
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="h-4 w-32 skeleton" />
          <div className="h-3 w-20 skeleton" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <div>
                <div className="h-4 w-28 skeleton" />
                <div className="h-3 w-20 skeleton mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 skeleton rounded-full" />
              <div className="h-4 w-14 skeleton" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-200">
            <div className="w-10 h-10 skeleton" />
            <div className="h-4 w-28 skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
