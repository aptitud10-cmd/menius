export default function SettingsDataLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <div className="skeleton h-7 w-40 mb-2" />
        <div className="skeleton h-4 w-64" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="skeleton h-5 w-36" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-9 w-36 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
