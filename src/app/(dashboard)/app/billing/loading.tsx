export default function BillingLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <div className="skeleton h-7 w-40 mb-2" />
        <div className="skeleton h-4 w-52" />
      </div>

      {/* Current plan */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="skeleton h-5 w-24 mb-4" />
        <div className="flex items-center gap-4 mb-4">
          <div className="skeleton h-12 w-12 rounded-xl" />
          <div>
            <div className="skeleton h-6 w-20 mb-1" />
            <div className="skeleton h-3.5 w-32" />
          </div>
        </div>
        <div className="skeleton h-10 w-48 rounded-lg" />
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="skeleton h-5 w-20 mb-2" />
            <div className="skeleton h-8 w-28 mb-3" />
            <div className="space-y-2 mb-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="skeleton h-3.5 w-full" />
              ))}
            </div>
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
