export default function EquipmentDetailLoading() {
  return (
    <div className="min-h-screen bg-neutral-50/70 pb-16 pt-8 animate-pulse">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-4 w-48 bg-neutral-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 rounded-xl bg-white border border-neutral-200 p-6 space-y-4">
              <div className="h-6 w-32 bg-neutral-200 rounded" />
              <div className="h-8 w-3/4 bg-neutral-200 rounded" />
              <div className="h-4 w-1/2 bg-neutral-200 rounded" />
            </div>
            <div className="h-64 rounded-xl bg-white border border-neutral-200 p-6" />
          </div>
          <div className="lg:col-span-1">
            <div className="h-96 rounded-xl bg-white border border-neutral-200 p-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
