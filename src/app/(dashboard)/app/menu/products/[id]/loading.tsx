export default function ProductEditorLoading() {
  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between h-14 border-b border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 skeleton" />
          <div className="h-4 w-40 skeleton" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 skeleton" />
          <div className="h-8 w-24 skeleton" />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <div className="h-4 w-28 skeleton mb-4" />
            <div className="space-y-4">
              <div>
                <div className="h-3 w-16 skeleton mb-1.5" />
                <div className="h-10 skeleton" />
              </div>
              <div>
                <div className="h-3 w-20 skeleton mb-1.5" />
                <div className="h-20 skeleton" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="h-3 w-20 skeleton mb-1.5" />
                  <div className="h-10 skeleton" />
                </div>
                <div>
                  <div className="h-3 w-20 skeleton mb-1.5" />
                  <div className="h-10 skeleton" />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="h-4 w-16 skeleton mb-4" />
            <div className="h-40 skeleton" />
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="h-4 w-36 skeleton mb-4" />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-7 w-20 skeleton rounded-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="h-4 w-40 skeleton mb-4" />
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="border border-gray-200 rounded-lg p-3">
                  <div className="h-4 w-24 skeleton mb-2" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-32 skeleton" />
                    <div className="h-3 w-28 skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
