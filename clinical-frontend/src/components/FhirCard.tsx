import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { PortalTooltip } from "./PortalTooltip";


interface FhirCardProps {
  resourceType: string;
  resource: any;
}

export function FhirCard({ resourceType, resource }: FhirCardProps) {
  /* ---------- TITLE ---------- */
  const getTitle = () => {
    switch (resourceType) {
      case "Patient": {
        const name = resource.name?.[0];
        return (
          `${name?.given?.join(" ") || ""} ${name?.family || ""}`.trim() ||
          "Unnamed Patient"
        );
      }

      case "Practitioner": {
        const name = resource.name?.[0];
        return (
          `${name?.given?.join(" ") || ""} ${name?.family || ""}`.trim() ||
          "Practitioner"
        );
      }

      case "Organization":
        return resource.name || "Unnamed Organization";

      case "Encounter":
        return (
          resource.type?.[0]?.text ||
          resource.type?.[0]?.coding?.[0]?.display ||
          "Encounter"
        );

        case "Appointment":
        return (
          resource.description ||
          resource.reasonCode?.[0]?.text ||
          "Appointment"
        );

      case "Observation":
  return getObservationTitle();
        
        case "Procedure":
  return (
    resource.code?.coding?.[0]?.display ||
    resource.code?.text ||
    resource.subject?.display ||
    "Procedure"
  );

case "MedicationRequest":
  return (
    resource.medicationCodeableConcept?.text ||
    resource.medicationCodeableConcept?.coding?.[0]?.display ||
    resource.extension?.[0]?.valueCodeableConcept?.text ||
    resource.status ||
    "Medication Request"
  );





      case "Condition":
        return resource.code?.text || "Condition";

      default:
        return resourceType;
    }
  };

  const formatDate = (dateString?: string) => {
  if (!dateString) return null;

  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};


  const getObservationTitle = () => {
  return (
    resource.code?.text ||
    resource.code?.coding?.[0]?.display ||
    resource.code?.coding?.[0]?.code ||
    "Observation"
  );
};

const getObservationValue = () => {
  if (resource.valueQuantity) {
    return `${resource.valueQuantity.value} ${resource.valueQuantity.unit || ""}`;
  }

  if (resource.valueCodeableConcept) {
    return (
      resource.valueCodeableConcept.coding?.[0]?.display ||
      resource.valueCodeableConcept.coding?.[0]?.code
    );
  }

  return null;
};


  /* ---------- SUBTITLE ---------- */
  const getSubtitle = () => {
    switch (resourceType) {
      case "Encounter":
        return resource.subject?.display || "Unknown Patient";
      case "Organization":
        return resource.type?.[0]?.text || "Organization";
      case "Patient":
        return resource.gender || "";
      case "Procedure":
        return resource.subject?.display || "Unknown Patient";
        case "MedicationRequest":
        return resource.subject?.display || "Unknown Patient";

      default:
        return "";
    }
  };

  

  const formatPeriod = () => {
    if (!resource.period?.start) return null;
    const start = new Date(resource.period.start).toLocaleDateString();
    const end = resource.period.end
      ? new Date(resource.period.end).toLocaleDateString()
      : "Ongoing";
    return `${start} → ${end}`;
  };

  const getAddress = () => {
    const addr = resource.address?.[0];
    if (!addr) return null;
    return [
      ...(addr.line || []),
      addr.city,
      addr.state,
      addr.country,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const [open, setOpen] = useState(false);

  const gender =
  resource.gender?.toLowerCase() === "male"
    ? "male"
    : resource.gender?.toLowerCase() === "female"
    ? "female"
    : "other";

    const getFullAddress = () => {
  const addr = resource.address?.[0];
  if (!addr) return null;

  const parts = [
    ...(addr.line || []),
    addr.city,
    addr.state,
    addr.postalCode,
    addr.country,
  ];

  return parts.filter(Boolean).join(", ");
};

function capitalizeFirstLetter(string: string) {
  if (string.length === 0) {
    return ""; // Handle empty strings safely
  }
  return string.charAt(0).toUpperCase() + string.slice(1);
}

  const truncateText = (text: string, maxLength = 12) => {
  if (!text) return "";
  return text.length > maxLength
    ? text.slice(0, maxLength) + "..."
    : text;
};

const emailRef = useRef<HTMLSpanElement>(null);
const [showTooltip, setShowTooltip] = useState(false);




  return (
<div
  className="
    bg-white dark:bg-gray-800
    rounded-2xl
    p-6
    overflow-hidden

    border border-gray-200 dark:border-gray-700
    shadow-sm

    transition-all duration-500 ease-out
    hover:shadow-md
    hover:bg-gray-50/60 dark:hover:bg-gray-800/60
    hover:border-gray-300 dark:hover:border-gray-600
    hover:-translate-y-[2px]
  "
>

    <div className="flex flex-col lg:flex-row gap-6">

      {/* LEFT PANEL */}
      <div onClick={() => setOpen(true)} className="cursor-pointer lg:w-1/3 flex flex-col items-center text-center border-r border-gray-200 dark:border-gray-700 pr-6">

        {/* Avatar */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white font-bold
            ${
              gender === "male"
                ? "bg-gradient-to-br from-blue-500 to-blue-700"
                : gender === "female"
                ? "bg-gradient-to-br from-pink-500 to-purple-600"
                : "bg-gradient-to-br from-gray-400 to-gray-600"
            }`}
        >
          {gender === "male" ? "👨" : gender === "female" ? "👩" : "👤"}
        </div>

        {/* Name */}
        <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {getTitle()}
        </h2>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center w-full min-w-0">
      <div className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300 w-full min-w-0">

          {resource.birthDate && (
            <Info label="Date of Birth" value={formatDate(resource.birthDate)} />
          )}

          {resource.telecom?.find((t: any) => t.system === "phone")?.value && (
            <Info
              label="Phone:"
              value={resource.telecom.find((t: any) => t.system === "phone")!.value}
            />
          )}

          {resource.telecom?.find((t: any) => t.system === "email")?.value && (
            <Info
              label="Email:"
              value={
                <>
                  <span
                    ref={emailRef}
                    className="truncate max-w-[180px] block cursor-help"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    {truncateText(resource.telecom.find((t:any)=>t.system==="email")!.value, 12)}
                  </span>

                  {showTooltip && (
                    <PortalTooltip text={resource.telecom.find((t:any)=>t.system==="email")!.value} targetRef={emailRef} />
                  )}
                </>
              }
            />
          )}


          {getFullAddress() && (
            <Info label="Address:" value={getFullAddress()} />
          )}

          {resource.meta?.lastUpdated && (
            <Info
              label="Registration:"
              value={formatDate(resource.meta.lastUpdated)}
            />
          )}

        </div>
      </div>

    </div>
    {open &&
  createPortal(
    <div
      className="
        fixed inset-0 z-[9999]
        flex items-center justify-center
        bg-black/40 backdrop-blur-sm
      "
      onClick={() => setOpen(false)}
    >
      <div
        className="
          w-full max-w-3xl max-h-[85vh]
          bg-white dark:bg-gray-900
          rounded-2xl shadow-xl
          p-6 overflow-y-auto
          text-gray-900 dark:text-gray-100
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">
            {resourceType} Details
          </h3>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
          >
            ✕
          </button>
        </div>

        {/* DETAILS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
          {getTitle() && <ModalInfo label="Name" value={getTitle()} />}
          {resource.gender && <ModalInfo label="Gender" value={capitalizeFirstLetter(resource.gender)} />}
          {resource.birthDate && (
            <ModalInfo label="Date of Birth" value={formatDate(resource.birthDate)} />
          )}

          {resource.telecom?.find((t:any)=>t.system==="phone")?.value && (
            <ModalInfo
              label="Phone"
              value={resource.telecom.find((t:any)=>t.system==="phone")!.value}
            />
          )}

          {resource.telecom?.find((t:any)=>t.system==="email")?.value && (
            <ModalInfo
              label="Email"
              value={resource.telecom.find((t:any)=>t.system==="email")!.value}
            />
          )}

          {getFullAddress() && (
            <ModalInfo label="Address" value={getFullAddress()} />
          )}

          {resource.meta?.lastUpdated && (
            <ModalInfo
              label="Registration Date"
              value={formatDate(resource.meta.lastUpdated)}
            />
          )}
        </div>

        {/* RAW JSON */}
        <div>
          <p className="font-semibold mb-2">FHIR Resource JSON</p>
          <pre
            className="
              bg-gray-100 dark:bg-gray-800
              rounded-lg p-3 text-xs
              overflow-x-auto max-h-[300px]
            "
          >
            {JSON.stringify(resource, null, 2)}
          </pre>
        </div>

        {/* FOOTER */}
        <div className="mt-6 text-right">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

  </div>
  
);

}
function Info({ label, value }: { label: any; value: any }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-x-2 items-start min-w-0 text-sm leading-snug">
    <span className="font-medium text-gray-500 break-words">
        {label}
      </span>

      <span className="text-gray-900 dark:text-gray-100 break-words">
        {value}
      </span>
    </div>
  );
}

function ModalInfo({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-xs font-medium text-gray-500">
        {label}
      </span>
      <span className="text-sm break-words">
        {value}
      </span>
    </div>
  );
}

function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative inline-block group max-w-full">
      {children}

      <div
        className="
          absolute z-50
          left-1/2 -translate-x-1/2
          -top-2 -translate-y-full
          hidden group-hover:block
          px-2 py-1
          rounded-md
          bg-gray-900 text-white
          text-xs
          whitespace-nowrap
          shadow-lg
        "
      >
        {text}
      </div>
    </div>
  );
}















