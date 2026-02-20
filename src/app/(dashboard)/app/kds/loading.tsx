export default function KDSLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-gray-100 rounded-lg" />
          <div className="h-4 w-64 bg-gray-100 rounded-lg mt-2" />
        </div>
        <div className="h-3 w-3 rounded-full bg-gray-100" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 w-20 bg-gray-100 rounded" />
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
            </div>
            <div className="space-y-2 mb-3">
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-3/4 bg-gray-100 rounded" />
              <div className="h-4 w-1/2 bg-gray-100 rounded" />
            </div>
            <div className="h-3 w-24 bg-gray-100 rounded mt-3" />
            <div className="flex gap-2 mt-3">
              <div className="h-8 flex-1 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
