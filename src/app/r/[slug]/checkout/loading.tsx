export default function CheckoutLoading() {
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col animate-pulse">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gray-200" />
          <div className="w-20 h-4 rounded bg-gray-200" />
        </div>
        <div className="w-16 h-4 rounded bg-gray-200" />
        <div className="w-12 h-4 rounded bg-gray-200" />
      </header>
      <div className="flex-1 max-w-lg mx-auto px-5 py-6 w-full space-y-6">
        <div className="bg-white rounded-2xl p-5 space-y-4 border border-gray-100">
          <div className="w-24 h-3 rounded bg-gray-200" />
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-4 rounded bg-gray-200" />
              <div className="w-1/3 h-3 rounded bg-gray-200" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-2/3 h-4 rounded bg-gray-200" />
              <div className="w-1/4 h-3 rounded bg-gray-200" />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <div className="w-12 h-5 rounded bg-gray-200" />
            <div className="w-20 h-5 rounded bg-gray-200" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
          <div className="w-20 h-4 rounded bg-gray-200" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-11 rounded-xl bg-gray-200" />
            <div className="h-11 rounded-xl bg-gray-200" />
            <div className="h-11 rounded-xl bg-gray-200" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <div className="w-16 h-3 rounded bg-gray-200" />
          <div className="h-12 rounded-2xl bg-gray-200" />
          <div className="h-12 rounded-2xl bg-gray-200" />
          <div className="h-12 rounded-2xl bg-gray-200" />
        </div>
      </div>
      <div className="sticky bottom-0 bg-white border-t-2 border-gray-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto">
          <div className="h-14 rounded-2xl bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
