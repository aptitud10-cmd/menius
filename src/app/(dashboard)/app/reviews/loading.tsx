export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded mb-6" />
      <div className="flex gap-3 mb-4">
        <div className="h-9 flex-1 max-w-xs bg-gray-100 rounded-lg" />
        <div className="h-9 w-28 bg-gray-100 rounded-lg" />
      </div>
      <div className="dash-card divide-y divide-gray-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="w-4 h-4 rounded bg-gray-200" />
              ))}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-64 bg-gray-100 rounded" />
            </div>
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
