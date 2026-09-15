import { DeliveryStatus, DeliveryEventDetail } from "../types";

interface DeliveryTimelineProps {
  status: DeliveryStatus;
  events?: DeliveryEventDetail[];
  estimatedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
}

const STAGES: { key: DeliveryStatus; label: string }[] = [
  { key: "PENDING", label: "Created" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "PICKED_UP", label: "Picked Up" },
  { key: "IN_TRANSIT", label: "In Transit" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

export function DeliveryTimeline({
  status,
  events = [],
  actualDeliveryDate,
}: DeliveryTimelineProps) {
  const isCancelled = status === "CANCELLED";
  const isFailed = status === "DELIVERY_FAILED";

  const getStageIndex = (st: DeliveryStatus): number => {
    switch (st) {
      case "PENDING":
      case "QUOTED":
        return 0;
      case "ASSIGNED":
      case "PICKUP_SCHEDULED":
        return 1;
      case "PICKED_UP":
        return 2;
      case "IN_TRANSIT":
        return 3;
      case "OUT_FOR_DELIVERY":
        return 4;
      case "DELIVERED":
        return 5;
      default:
        return 0;
    }
  };

  const currentIdx = getStageIndex(status);

  return (
    <div className="space-y-6">
      {/* Alert banner for failed or cancelled deliveries */}
      {isCancelled && (
        <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl text-stone-800 text-sm flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-stone-500"></span>
          <div>
            <p className="font-semibold">Consignment Cancelled</p>
            <p className="text-xs text-stone-600">This consignment dispatch was cancelled prior to physical pickup.</p>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
          <div>
            <p className="font-semibold">Delivery Attempt Failed</p>
            <p className="text-xs text-red-700">The carrier encountered a transit disruption. Carrier dispatch is investigating.</p>
          </div>
        </div>
      )}

      {/* Visual Stepper */}
      {!isCancelled && (
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-6">
            Transit Progress
          </h3>
          <div className="relative flex items-center justify-between">
            {/* Background connecting bar */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-stone-200 z-0"></div>
            {/* Active connecting bar */}
            <div
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 z-0 transition-all duration-300 ${
                isFailed ? "bg-amber-500" : "bg-emerald-600"
              }`}
              style={{
                width: `${(Math.min(currentIdx, STAGES.length - 1) / (STAGES.length - 1)) * 100}%`,
              }}
            ></div>

            {STAGES.map((stage, idx) => {
              const isCompleted = idx < currentIdx || (idx === currentIdx && status === "DELIVERED");
              const isCurrent = idx === currentIdx && status !== "DELIVERED";

              return (
                <div key={stage.key} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600"
                        : isCurrent
                        ? isFailed
                          ? "bg-amber-500 text-white ring-4 ring-amber-100"
                          : "bg-white border-2 border-emerald-600 text-emerald-600 ring-4 ring-emerald-50"
                        : "bg-white border-2 border-stone-300 text-stone-400"
                    }`}
                  >
                    {isCompleted ? "✓" : idx + 1}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium hidden sm:block ${
                      isCompleted || isCurrent ? "text-emerald-950 font-semibold" : "text-stone-400"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chronological Event History */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
            Consignment Event Ledger ({events.length})
          </h3>
          {actualDeliveryDate && (
            <span className="text-xs text-emerald-700 font-semibold">
              Delivered: {new Date(actualDeliveryDate).toLocaleDateString("en-NG", { dateStyle: "medium" })}
            </span>
          )}
        </div>

        {events.length === 0 ? (
          <p className="text-xs text-stone-500 italic">No tracking events recorded yet.</p>
        ) : (
          <div className="space-y-4 border-l-2 border-emerald-200 ml-2 pl-4">
            {events.map((ev) => (
              <div key={ev.id} className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white"></div>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-emerald-950">
                    {ev.status.replace(/_/g, " ")}
                  </p>
                  <span className="text-xs text-stone-400 font-mono">
                    {new Date(ev.occurredAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}{" "}
                    {new Date(ev.occurredAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {ev.locationName && (
                  <p className="text-xs text-emerald-700 font-medium">📍 {ev.locationName}</p>
                )}
                <p className="text-xs text-stone-600 mt-0.5">{ev.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
