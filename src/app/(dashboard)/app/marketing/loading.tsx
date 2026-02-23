export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-36 bg-gray-200 rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="dash-card p-4 space-y-2">
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-6 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="dash-card p-5 space-y-4">
        <div className="h-4 w-40 bg-gray-200 rounded" />
        <div className="h-10 w-full bg-gray-100 rounded-lg" />
        <div className="h-24 w-full bg-gray-100 rounded-lg" />
        <div className="h-9 w-32 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
