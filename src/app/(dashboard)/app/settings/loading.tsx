export default function SettingsLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <div className="skeleton h-7 w-44 mb-2" />
        <div className="skeleton h-4 w-64" />
      </div>

      <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-6 space-y-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton h-3.5 w-28 mb-2" />
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        ))}
        <div className="skeleton h-10 w-40 rounded-lg" />
      </div>
    </div>
  );
}
