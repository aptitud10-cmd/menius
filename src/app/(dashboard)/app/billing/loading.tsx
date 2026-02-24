export default function BillingLoading() {
  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="skeleton h-7 w-40 mb-2" />
        <div className="skeleton h-4 w-72" />
      </div>

      {/* Current plan card */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="skeleton h-10 w-10 rounded-xl" />
                <div>
                  <div className="skeleton h-5 w-24 mb-1.5" />
                  <div className="skeleton h-4 w-20 rounded-full" />
                </div>
              </div>
              <div className="skeleton h-10 w-32 mb-4" />
              <div className="skeleton h-4 w-56 mb-5" />
              <div className="pt-5 border-t border-gray-100 grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-4 w-full" />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:min-w-[200px]">
              <div className="skeleton h-10 w-full rounded-xl" />
              <div className="skeleton h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Usage meters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="skeleton h-4 w-24 mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-4 w-16" />
              </div>
              <div className="skeleton h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="skeleton h-4 w-32" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-6 py-3.5 flex items-center gap-4 border-b border-gray-50 last:border-0">
            <div className="flex-1">
              <div className="skeleton h-4 w-24 mb-1" />
              <div className="skeleton h-3 w-16" />
            </div>
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-6 w-6 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Pricing cards */}
      <div className="mt-10">
        <div className="text-center mb-8">
          <div className="skeleton h-7 w-52 mx-auto mb-2" />
          <div className="skeleton h-4 w-80 mx-auto" />
        </div>
        <div className="flex justify-center mb-8">
          <div className="skeleton h-10 w-52 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="skeleton h-5 w-20 mb-2" />
              <div className="skeleton h-3.5 w-40 mb-5" />
              <div className="skeleton h-10 w-28 mb-6" />
              <div className="space-y-2.5 mb-6">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="skeleton h-3.5 w-full" />
                ))}
              </div>
              <div className="skeleton h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
