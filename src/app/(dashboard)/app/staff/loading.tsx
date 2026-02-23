export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-32 bg-gray-200 rounded mb-6" />
      <div className="h-9 w-40 bg-gray-100 rounded-lg mb-5" />
      <div className="dash-card divide-y divide-gray-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-28 bg-gray-200 rounded" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
