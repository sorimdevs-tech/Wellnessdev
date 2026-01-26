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


      case "Condition":
        return resource.code?.text || "Condition";

      default:
        return resourceType;
    }
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

  return (
    <div className="bg-white rounded-xl shadow hover:shadow-lg transition p-5 border-l-4 border-blue-500">
      <h2 className="text-xl font-semibold text-gray-800">
        {getTitle()}
      </h2>

      {getSubtitle() && (
        <p className="text-sm text-gray-500 mb-2">
          {getSubtitle()}
        </p>
      )}

      <div className="text-sm text-gray-600 space-y-1 mt-2">
        <p>
          <span className="font-medium">ID:</span> {resource.id}
        </p>

        {resource.status && (
          <p>
            <span className="font-medium">Status:</span> {resource.status}
          </p>
        )}

        {resource.class?.display && (
          <p>
            <span className="font-medium">Class:</span>{" "}
            {resource.class.display}
          </p>
        )}

        {formatPeriod() && (
          <p>
            <span className="font-medium">Period:</span> {formatPeriod()}
          </p>
        )}

        {resource.serviceProvider?.display && (
          <p>
            <span className="font-medium">Provider:</span>{" "}
            {resource.serviceProvider.display}
          </p>
        )}

        {resource.birthDate && (
          <p>
            <span className="font-medium">DOB:</span> {resource.birthDate}
          </p>
        )}

        {resource.telecom?.[0]?.value && (
          <p>
            <span className="font-medium">Phone:</span>{" "}
            {resource.telecom[0].value}
          </p>
        )}

        {getAddress() && (
          <p>
            <span className="font-medium">Address:</span> {getAddress()}
          </p>
        )}

        {resource.meta?.lastUpdated && (
          <p className="text-xs text-gray-400">
            Updated: {resource.meta.lastUpdated}
          </p>
        )}
      </div>

      <div className="mt-4">
        <button className="text-blue-600 text-sm font-medium hover:underline">
          View Details →
        </button>
      </div>
    </div>
  );
}
