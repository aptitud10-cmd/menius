export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-44 bg-gray-200 rounded mb-6" />
      <div className="h-9 w-40 bg-gray-100 rounded-lg mb-5" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-gray-200 rounded" />
              <div className="h-5 w-14 bg-gray-100 rounded-full" />
            </div>
            <div className="h-3 w-full bg-gray-100 rounded" />
            <div className="h-3 w-2/3 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
