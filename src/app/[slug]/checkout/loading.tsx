export default function CheckoutLoading() {
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">

      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-100 px-4 flex items-center gap-3 flex-shrink-0">
        <div className="skeleton w-8 h-8 rounded-lg" />
        <div className="skeleton h-4 w-28 rounded-lg" />
      </div>

      <div className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full">
        {/* Section block */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 space-y-3 border border-gray-100">
            <div className="skeleton h-4 w-32 rounded-lg" />
            <div className="skeleton h-12 w-full rounded-xl" />
            {i < 3 && <div className="skeleton h-12 w-full rounded-xl" />}
          </div>
        ))}

        {/* Order summary */}
        <div className="bg-white rounded-2xl p-4 space-y-3 border border-gray-100">
          <div className="skeleton h-4 w-28 rounded-lg" />
          {[1, 2, 3].map((j) => (
            <div key={j} className="flex justify-between">
              <div className="skeleton h-3.5 w-2/3 rounded" />
              <div className="skeleton h-3.5 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Sticky footer CTA */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="skeleton h-14 w-full rounded-2xl" />
      </div>

    </div>
  );
}
