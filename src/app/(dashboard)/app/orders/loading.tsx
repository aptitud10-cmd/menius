export default function OrdersLoading() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-32 mb-2" />
          <div className="skeleton h-4 w-48" />
        </div>
        <div className="skeleton h-8 w-24 rounded-full" />
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="skeleton h-4 w-4 rounded-full" />
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-5 w-6 rounded-full ml-auto" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="skeleton h-4 w-16 mb-2" />
                  <div className="skeleton h-3 w-24 mb-1.5" />
                  <div className="skeleton h-3 w-full mb-1" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
