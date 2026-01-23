import { useEffect, useState } from "react";
import axios from "axios";
import { FhirCard } from "./FhirCard";

const BASE_URL = "https://hapi.fhir.org/baseR4";

const resources = [
  "Patient",
  "Practitioner",
  "Encounter",
  "Appointment",
  "Observation",
  "Condition",
  "Procedure",
  "MedicationRequest",
  "CarePlan",
  "Organization",
  "DiagnosticReport",
];

interface FhirEntry {
  resource: any;
}

/* =========================
   DEDUPLICATION
========================= */
function removeDuplicates(entries: FhirEntry[]) {
  const seen = new Set<string>();

  return entries.filter(({ resource }) => {
    const key =
      resource?.id ||
      resource?.identifier?.[0]?.value ||
      JSON.stringify(resource);

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function FHIRPlatform() {
  const [resourceType, setResourceType] = useState("Patient");
  const [data, setData] = useState<FhirEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchResource();
  }, [resourceType]);

  const fetchResource = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${BASE_URL}/${resourceType}?_count=10`
      );

      const entries = res.data.entry || [];
      const unique = removeDuplicates(entries);

      setData(unique);
    } catch (error) {
      console.error(error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          🧬 FHIR Data Explorer
        </h1>

        <select
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          className="mt-4 md:mt-0 px-4 py-2 rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500"
        >
          {resources.map((res) => (
            <option key={res} value={res}>
              {res}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-lg text-gray-600 mt-20">
          Loading {resourceType} data...
        </div>
      ) : data.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          No data available
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map(({ resource }) => (
            <FhirCard
              key={`${resource.resourceType}-${resource.id}`}
              resourceType={resourceType}
              resource={resource}
            />
          ))}
        </div>
      )}
    </div>
  );
}
