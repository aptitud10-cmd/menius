export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded mb-6" />
      <div className="flex gap-3 mb-4">
        <div className="h-9 w-32 bg-gray-100 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
