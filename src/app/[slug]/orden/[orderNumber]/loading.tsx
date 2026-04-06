export default function OrderTrackerLoading() {
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">

      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-100 px-4 flex items-center gap-3 flex-shrink-0">
        <div className="skeleton w-8 h-8 rounded-lg" />
        <div className="skeleton h-4 w-36 rounded-lg" />
      </div>

      <div className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full">
        {/* Status card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 text-center space-y-3">
          <div className="skeleton w-20 h-20 rounded-full mx-auto" />
          <div className="skeleton h-5 w-40 rounded-lg mx-auto" />
          <div className="skeleton h-4 w-56 rounded mx-auto" />
        </div>

        {/* ETA card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 text-center space-y-2">
          <div className="skeleton h-3.5 w-24 rounded mx-auto" />
          <div className="skeleton h-16 w-20 rounded-xl mx-auto" />
          <div className="skeleton h-3.5 w-32 rounded mx-auto" />
        </div>

        {/* Order items */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <div className="skeleton h-4 w-28 rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="skeleton h-3.5 w-1/2 rounded" />
              <div className="skeleton h-3.5 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
