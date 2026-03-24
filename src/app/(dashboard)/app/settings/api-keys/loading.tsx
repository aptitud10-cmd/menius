export default function ApiKeysLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-32 mb-2" />
          <div className="skeleton h-4 w-56" />
        </div>
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-4">
              <div className="space-y-1">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-3 w-40 font-mono" />
              </div>
              <div className="flex items-center gap-3">
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
