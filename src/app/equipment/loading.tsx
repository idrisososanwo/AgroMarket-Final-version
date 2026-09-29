export default function EquipmentLoading() {
  return (
    <div className="min-h-screen bg-neutral-50/70 pb-16 pt-8 animate-pulse">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-4 w-48 bg-neutral-200 rounded" />
        <div className="space-y-2">
          <div className="h-8 w-80 bg-neutral-200 rounded" />
          <div className="h-4 w-96 bg-neutral-200 rounded" />
        </div>
        <div className="h-28 bg-white border border-neutral-200 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-xl border border-neutral-200 bg-white p-4 space-y-4"
            >
              <div className="h-6 w-1/3 bg-neutral-200 rounded" />
              <div className="h-6 w-3/4 bg-neutral-200 rounded" />
              <div className="h-20 bg-neutral-100 rounded" />
              <div className="h-10 bg-neutral-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
