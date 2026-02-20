export default function ProductsLoading() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-28 mb-2" />
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>

      <div className="flex gap-2">
        <div className="skeleton h-8 w-20 rounded-full" />
        <div className="skeleton h-8 w-24 rounded-full" />
        <div className="skeleton h-8 w-20 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="skeleton h-40 w-full" />
            <div className="p-4 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-full" />
              <div className="flex justify-between">
                <div className="skeleton h-5 w-16" />
                <div className="skeleton h-7 w-7 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
