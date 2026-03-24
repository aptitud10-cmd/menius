export default function NewProductLoading() {
  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      <div>
        <div className="skeleton h-7 w-40 mb-2" />
        <div className="skeleton h-4 w-52" />
      </div>

      {/* Image upload */}
      <div className="skeleton h-44 w-full rounded-2xl" />

      {/* Form fields */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
      ))}

      {/* Price + category row */}
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

      {/* Submit */}
      <div className="skeleton h-11 w-full rounded-xl" />
    </div>
  );
}
