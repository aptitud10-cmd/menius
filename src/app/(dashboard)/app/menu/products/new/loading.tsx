export default function NewProductLoading() {
  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between h-14 border-b border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 skeleton" />
          <div className="h-4 w-32 skeleton" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 skeleton" />
          <div className="h-8 w-20 skeleton" />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="h-4 w-40 skeleton mb-4" />
            <div className="text-center py-10">
              <div className="w-10 h-10 skeleton mx-auto mb-3 rounded-lg" />
              <div className="h-4 w-40 skeleton mx-auto mb-2" />
              <div className="h-3 w-56 skeleton mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
