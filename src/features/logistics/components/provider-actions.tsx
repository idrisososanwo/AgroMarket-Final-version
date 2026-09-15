"use client";

import { useState } from "react";
import { DeliveryStatus } from "../types";
import { updateDeliveryStatusAction } from "../actions";

interface ProviderActionsProps {
  deliveryId: string;
  currentStatus: DeliveryStatus;
  pickupState: string;
  deliveryState: string;
}

export function ProviderActions({
  deliveryId,
  currentStatus,
  pickupState,
  deliveryState,
}: ProviderActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureReason, setFailureReason] = useState("");

  const handleStatusUpdate = async (targetStatus: DeliveryStatus) => {
    setLoading(true);
    setError(null);

    try {
      const res = await updateDeliveryStatusAction({
        deliveryId,
        targetStatus,
        locationName: locationName.trim() || undefined,
        description: notes.trim() || undefined,
        failureReason: failureReason.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to update status.");
      } else {
        setLocationName("");
        setNotes("");
        setShowFailureModal(false);
      }
    } catch (err) {
      console.error("Status update error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === "DELIVERED" || currentStatus === "CANCELLED") {
    return (
      <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-500 text-center">
        This consignment has reached a terminal status ({currentStatus}). No further state changes can be made.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-emerald-950">Dispatch & Carrier Controls</h3>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Transit checkpoint input */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Current Checkpoint Location
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder={`e.g. ${currentStatus === "ASSIGNED" ? pickupState : deliveryState} Tollgate Hub`}
            className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Waypoint Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Produce inspected; loaded into truck."
            className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Action Buttons based on current state */}
      <div className="flex flex-wrap gap-2 pt-2">
        {currentStatus === "QUOTED" && (
          <span className="text-xs text-amber-700 italic">
            Consignment awaiting 3PL provider assignment by platform administrator.
          </span>
        )}

        {currentStatus === "ASSIGNED" && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusUpdate("PICKUP_SCHEDULED")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
            >
              📅 Schedule Farm Pickup
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusUpdate("PICKED_UP")}
              className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
            >
              📦 Confirm Produce Picked Up
            </button>
          </>
        )}

        {currentStatus === "PICKUP_SCHEDULED" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleStatusUpdate("PICKED_UP")}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            📦 Confirm Produce Picked Up
          </button>
        )}

        {currentStatus === "PICKED_UP" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleStatusUpdate("IN_TRANSIT")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            🚚 Depart on Interstate Transit
          </button>
        )}

        {currentStatus === "IN_TRANSIT" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleStatusUpdate("OUT_FOR_DELIVERY")}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            🛵 Arrived at Local Hub: Out for Delivery
          </button>
        )}

        {currentStatus === "OUT_FOR_DELIVERY" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleStatusUpdate("DELIVERED")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-5 rounded-lg shadow transition disabled:opacity-50"
          >
            ✅ Confirm Successful Handover to Buyer
          </button>
        )}

        {currentStatus === "DELIVERY_FAILED" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleStatusUpdate("PICKUP_SCHEDULED")}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            🔄 Reschedule Delivery Attempt
          </button>
        )}

        {/* Report Issue Button for transit stages */}
        {["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(currentStatus) && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowFailureModal(true)}
            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold py-2 px-4 rounded-lg transition"
          >
            ⚠️ Report Transit Issue
          </button>
        )}
      </div>

      {/* Issue Modal */}
      {showFailureModal && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3 mt-3">
          <p className="text-xs font-bold text-red-900">Record Transit Disruption / Failed Handover</p>
          <input
            type="text"
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value)}
            placeholder="e.g. Recipient phone unreachable at destination address; road obstruction."
            className="w-full text-xs p-2.5 border border-red-300 rounded-lg bg-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || !failureReason.trim()}
              onClick={() => handleStatusUpdate("DELIVERY_FAILED")}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg disabled:opacity-50"
            >
              Submit Failure Report
            </button>
            <button
              type="button"
              onClick={() => setShowFailureModal(false)}
              className="bg-white border border-stone-300 text-stone-700 text-xs font-medium py-1.5 px-3 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
