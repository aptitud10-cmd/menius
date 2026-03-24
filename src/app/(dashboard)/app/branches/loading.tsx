export default function BranchesLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-36 mb-2" />
          <div className="skeleton h-4 w-56" />
        </div>
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="space-y-1 flex-1">
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
            <div className="skeleton h-px w-full" />
            <div className="space-y-2">
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
