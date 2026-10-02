import { KnowledgeContentType } from "../types";
import { AlertCircle, ShieldAlert, HeartHandshake } from "lucide-react";

interface DisclaimerBannerProps {
  type: KnowledgeContentType;
  sourceName?: string | null;
}

export function DisclaimerBanner({ type, sourceName }: DisclaimerBannerProps) {
  if (type === "EXPERT_ADVICE") {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 shadow-sm flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">
            Educational & Practical Farming Guidance
          </strong>
          <span>
            This advisory article is prepared for educational purposes and agronomic best practice. It is not an automated replacement for on-field investigation by certified agricultural extension officers or licensed veterinarians in acute animal or crop disease outbreaks.
          </span>
        </div>
      </div>
    );
  }

  if (type === "GOVERNMENT_UPDATE") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 shadow-sm flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">
            Public Notice & Official Attribution
          </strong>
          <span>
            This bulletin is published for farmer awareness and attributed directly to{" "}
            <strong>{sourceName || "the relevant government agency"}</strong>. AgroMarket is an independent agricultural marketplace and digital platform and does not represent itself as a government ministry or statutory regulator.
          </span>
        </div>
      </div>
    );
  }

  if (type === "FOOD_HEALTH") {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-xs text-rose-900 shadow-sm flex items-start gap-3">
        <HeartHandshake className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">
            Food Hygiene & General Nutrition Standard
          </strong>
          <span>
            This guidance provides safe handling, produce preservation, and public nutritional education. It does not provide medical diagnosis, prescribe clinical treatment, or substitute for personalized advice from registered dietitians or medical professionals.
          </span>
        </div>
      </div>
    );
  }

  return null;
}
