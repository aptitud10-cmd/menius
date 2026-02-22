export default function CategoriesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 skeleton" />
        <div className="h-9 w-36 skeleton" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-8 skeleton" />
              <div>
                <div className="h-5 w-32 skeleton" />
                <div className="h-3 w-20 skeleton mt-1.5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-12 skeleton rounded-full" />
              <div className="h-8 w-8 skeleton" />
              <div className="h-8 w-8 skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
