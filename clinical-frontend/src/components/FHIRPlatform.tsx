import { useEffect, useState } from "react";
import { FhirCard } from "./FhirCard";
import { fhirApi } from "../services/api";
import { useTheme } from "../context/ThemeContext";


/* =========================
   TYPES
========================= */
interface FhirEntry {
  resource: any;
}

interface FhirBundle {
  resourceType: "Bundle";
  entry?: FhirEntry[];
}



/* =========================
   RESOURCE API MAPPER
========================= */
const fetchByResourceType = async (
  resourceType: string
): Promise<FhirBundle> => {
  switch (resourceType) {
    case "Patient":
      return (await fhirApi.getPatients({ _count: 30 })) as FhirBundle;

    case "Practitioner":
      return (await fhirApi.getPractitioners()) as FhirBundle;

    case "Encounter":
      return (await fhirApi.getEncounters()) as FhirBundle;

    case "Appointment":
      return (await fhirApi.getAppointments()) as FhirBundle;

    case "Observation":
      return (await fhirApi.getObservations()) as FhirBundle;

    case "Condition":
      return (await fhirApi.getConditions()) as FhirBundle;

    case "Procedure":
      return (await fhirApi.getProcedures()) as FhirBundle; 

    case "MedicationRequest":
      return (await fhirApi.getMedicationRequests()) as FhirBundle; 

    case "Organization":
      return (await fhirApi.getOrganizations()) as FhirBundle;

    case "DiagnosticReport":
      return (await fhirApi.getDiagnosticReports()) as FhirBundle; 
    // ...
    default:
      throw new Error(`Unsupported resource: ${resourceType}`);
  }
};


/* =========================
   DEDUPLICATION
========================= */

const getName = (resource: any) => {
  const name = resource.name?.[0];
  if (!name) return "";
  return `${(name.given || []).join(" ")} ${name.family || ""}`.trim();
};

const getPhone = (resource: any) => {
  return resource.telecom?.find(
    (t: any) => t.system === "phone"
  )?.value || "";
};

const getNameKey = (resource: any) => {
  const name = resource.name?.[0];
  if (!name) return "";

  const fullName = `${(name.given || []).join(" ")} ${name.family || ""}`
    .trim()
    .toLowerCase();

  // ❌ reject unnamed entries
  if (!fullName || fullName.includes("unnamed")) {
    return "";
  }

  return fullName;
};


const getPhoneKey = (resource: any) => {
  return (
    resource.telecom?.find((t: any) => t.system === "phone")?.value || ""
  )
    .replace(/\s+/g, "")
    .toLowerCase();
};

const getEmailKey = (resource: any) => {
  return (
    resource.telecom?.find((t: any) => t.system === "email")?.value || ""
  )
    .toLowerCase();
};


function removeDuplicates(entries: FhirEntry[]) {
  const seen = new Map<string, FhirEntry>();

  for (const entry of entries) {
    const resource = entry.resource;

    const name = getNameKey(resource);
    const phone = getPhoneKey(resource);
    const email = getEmailKey(resource);

    // ❌ If name is explicitly invalid AND no phone/email, skip entry
    if (!name && !phone && !email) {
      continue;
    }

    const key = `${name}|${phone}|${email}`;

    if (!seen.has(key)) {
      seen.set(key, entry);
    }
  }

  return Array.from(seen.values());
}




/* =========================
   RESOURCES LIST
========================= */
const resources = [
  "Patient",
  "Practitioner",
  "Encounter",
  "Appointment",
  "Observation",
  "Condition",
  "Procedure",
  "MedicationRequest",
  "Organization",
  "DiagnosticReport",
];

/* =========================
   COMPONENT
========================= */
export default function FHIRPlatform() {
  const [resourceType, setResourceType] = useState("Patient");
  const [data, setData] = useState<FhirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
  setCurrentPage(1);
}, [resourceType, searchTerm]);


  useEffect(() => {
    fetchResource();
  }, [resourceType]);

  const getSearchableText = (resource: any, resourceType: string) => {
  switch (resourceType) {
    case "Patient":
    case "Practitioner": {
      const name = resource.name?.[0];
      if (!name) return "";
      return `${(name.given || []).join(" ")} ${name.family || ""}`.trim();
    }

    case "Organization":
      return resource.name || "";

    case "Appointment":
      return (
        resource.description ||
        resource.reasonCode?.[0]?.text ||
        ""
      );

    case "Encounter":
      return [
        resource.subject?.display,
        resource.type?.[0]?.coding?.[0]?.display,
        resource.reasonCode?.[0]?.coding?.[0]?.display,
      ]
        .filter(Boolean)
        .join(" ");

    case "Observation":
      return (
        resource.code?.text ||
        resource.code?.coding?.[0]?.display ||
        resource.code?.coding?.[0]?.code ||
        ""
      );

    case "Condition":
      return resource.code?.text || "";

    case "Procedure":
      return [
        resource.code?.coding?.[0]?.display,
        resource.subject?.display,
        resource.performer?.[0]?.actor?.display,
        resource.reasonCode?.[0]?.text,
      ]
        .filter(Boolean)
        .join(" ");

    case "MedicationRequest":
      return [
        resource.medicationCodeableConcept?.text,
        resource.medicationCodeableConcept?.coding?.[0]?.display,
        resource.extension?.[0]?.valueCodeableConcept?.text,
        resource.subject?.display,
        resource.status,
        resource.authoredOn,
      ]
        .filter(Boolean)
        .join(" ");

    default:
      return "";
  }
};




  const fetchResource = async () => {
    setLoading(true);
    try {
      const bundle = await fetchByResourceType(resourceType);
      const entries = bundle.entry ?? [];
      const unique = removeDuplicates(entries);
      setData(unique);
    } catch (error) {
      console.error(error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(({ resource }) => {
  if (!searchTerm.trim()) return true;

  const searchableText = getSearchableText(resource, resourceType);

  return searchableText
    .toLowerCase()
    .includes(searchTerm.toLowerCase());
});

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

const paginatedData = filteredData.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE
);


    return (
  <div className="p-6 min-h-screen bg-white-100 dark:bg-gray-900 transition-colors">
  {/* HEADER */}
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
    
    {/* LEFT: TITLE */}
    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
      🧬 FHIR Data Explorer
    </h1>

    {/* RIGHT: SEARCH + FILTER */}
    <div className="flex gap-3 items-center w-full md:w-auto justify-end">
      
      {/* Search */}
      <input
        type="text"
        placeholder={`Search ${resourceType} by name...`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="
          w-full md:w-64
          px-4 py-2 rounded-lg
          border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          focus:ring-2 focus:ring-blue-500
        "
      />

      {/* Resource Filter */}
      <select
        value={resourceType}
        onChange={(e) => setResourceType(e.target.value)}
        className="
          px-4 py-2 rounded-lg
          border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          shadow-sm focus:ring-2 focus:ring-blue-500
        "
      >
        {resources.map((res) => (
          <option key={res} value={res}>
            {res}
          </option>
        ))}
      </select>
    </div>
  </div>

  {/* CONTENT */}
  {loading ? (
    <div className="text-center text-lg text-gray-600 dark:text-gray-400 mt-20">
      Loading {resourceType} data...
    </div>
  ) : filteredData.length === 0 ? (
    <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
      No data available
    </div>
  ) : (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {paginatedData.map(({ resource }) => (
        <FhirCard
          key={`${resource.resourceType}-${resource.id}`}
          resourceType={resourceType}
          resource={resource}
        />
      ))}
    </div>
  )}

  {totalPages > 1 && (
  <div className="flex justify-center items-center gap-2 mt-10">

    {/* Prev */}
    <button
      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
      disabled={currentPage === 1}
      className="
        px-3 py-1.5 rounded-lg text-sm
        border border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-800
        text-gray-700 dark:text-gray-200
        disabled:opacity-50
      "
    >
      Prev
    </button>

    {/* Page numbers */}
    {Array.from({ length: totalPages }).map((_, i) => {
      const page = i + 1;
      return (
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          className={`
            px-3 py-1.5 rounded-lg text-sm
            ${
              currentPage === page
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            }
            border border-gray-300 dark:border-gray-600
          `}
        >
          {page}
        </button>
      );
    })}

    {/* Next */}
    <button
      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
      disabled={currentPage === totalPages}
      className="
        px-3 py-1.5 rounded-lg text-sm
        border border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-800
        text-gray-700 dark:text-gray-200
        disabled:opacity-50
      "
    >
      Next
    </button>
  </div>
)}

</div>

);


  
}
