export default function ProductDetailLoading() {
  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="skeleton h-8 w-8 rounded-lg" />
        <div className="skeleton h-7 w-48" />
      </div>

      {/* Image */}
      <div className="skeleton h-52 w-full rounded-2xl" />

      {/* Fields */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* Modifier groups */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <div className="skeleton h-5 w-36" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="skeleton h-12 w-full rounded-lg" />
        ))}
      </div>

      <div className="skeleton h-11 w-full rounded-xl" />
    </div>
  );
}
