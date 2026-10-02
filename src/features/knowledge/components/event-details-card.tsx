import { Calendar, MapPin, Globe, ExternalLink } from "lucide-react";

interface EventDetailsCardProps {
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  venue?: string | null;
  isOnline: boolean;
  organizer?: string | null;
  registrationUrl?: string | null;
}

export function EventDetailsCard({
  eventStartDate,
  eventEndDate,
  venue,
  isOnline,
  organizer,
  registrationUrl,
}: EventDetailsCardProps) {
  if (!eventStartDate && !venue && !organizer && !registrationUrl) {
    return null;
  }

  const formatEventDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-NG", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm space-y-4">
      <div className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
        <Calendar className="h-4 w-4 text-indigo-700" />
        <span>Event & Training Logistics</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {eventStartDate && (
          <div className="space-y-1">
            <span className="text-neutral-500 font-medium">Schedule</span>
            <div className="font-bold text-neutral-900">
              {formatEventDate(eventStartDate)}
              {eventEndDate && ` — ${formatEventDate(eventEndDate)}`}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <span className="text-neutral-500 font-medium">Venue & Format</span>
          <div className="font-bold text-neutral-900 flex items-center gap-1">
            {isOnline ? (
              <>
                <Globe className="h-3.5 w-3.5 text-indigo-600" />
                <span>Online / Webinar Session</span>
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                <span>{venue || "In-Person Field Venue"}</span>
              </>
            )}
          </div>
        </div>

        {organizer && (
          <div className="space-y-1 sm:col-span-2">
            <span className="text-neutral-500 font-medium">Organizing Body</span>
            <div className="font-semibold text-neutral-800">{organizer}</div>
          </div>
        )}
      </div>

      {registrationUrl && (
        <div className="pt-2">
          <a
            href={registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-800 transition min-h-[44px]"
          >
            <span>Register for this Program</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
