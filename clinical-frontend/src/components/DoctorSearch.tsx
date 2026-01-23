import { useEffect, useState } from "react";
import { apiClient, fhirApi } from "../services/api";

interface DoctorSearchProps {
  onSelectDoctor: (doctor: any) => void;
}
interface FhirBundle {
  entry?: {
    resource: any;
  }[];
}

// afzal
export default function DoctorSearch({ onSelectDoctor }: DoctorSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [fhirResults, setFhirResults] = useState<any[]>([]);
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);

  useEffect(() => {
  if (!searchQuery.trim()) {
    setDbResults([]);
    setFhirResults([]);
    return;
  }

  const fetchDoctors = async () => {
    /* ---------- DB SEARCH ---------- */
    try {
      const dbRes = await apiClient.getDoctors() as any[];
      const filtered = dbRes?.filter((doc: any) => 
        doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.email?.toLowerCase().includes(searchQuery.toLowerCase())
      ) || [];
      setDbResults(filtered);
    } catch {
      setDbResults([]);
    }

    /* ---------- FHIR SEARCH ---------- */
    try {
      const fhirRes = await fhirApi.getPractitioners() as any;
      const practitioners = fhirRes?.entry || [];

      const filtered = practitioners.filter((p: any) => {
        const name = p.resource?.name
          ?.map((n: any) =>
            n.text
              ? n.text
              : [...(n.given || []), n.family].join(" ")
          )
          .join(" ")
          .toLowerCase();

        return name?.includes(searchQuery.toLowerCase());
      });

      setFhirResults(filtered.map((p: any) => p.resource));
    } catch {
      setFhirResults([]);
    }
  };

  fetchDoctors();
}, [searchQuery]);

  return (
    <div className="relative w-80">
  {/* Search Icon */}
  <svg
    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-4.35-4.35M16 10a6 6 0 11-12 0 6 6 0 0112 0z"
    />
  </svg>

  <input
    type="text"
    placeholder="Search doctor here..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="pl-10 pr-4 py-2 w-full rounded-xl bg-gray-100 dark:bg-gray-800 outline-none text-sm text-gray-700 dark:text-gray-200"
  />

  {/* 🔽 SEARCH RESULTS PANEL */}
  {(dbResults.length > 0 || fhirResults.length > 0) && (
    <div className="absolute top-full mt-3 w-full z-50">
      {/* Container with enhanced shadow and backdrop */}
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-[530px] search-results-panel">
        {/* Header with search summary */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  Search Results
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {dbResults.length + fhirResults.length} healthcare professionals found
                </p>
              </div>
            </div>
            <button
              onClick={() => setSearchQuery("")}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="max-h-96 overflow-y-auto">
          {/* ===== DATABASE DOCTORS SECTION ===== */}
          {dbResults.length > 0 && (
            <div className="p-6">
              {/* Section header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Wellness Doctors
                  </h4>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                    {dbResults.length}
                  </span>
                </div>
                {dbResults.length > 4 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    +{dbResults.length - 4} more
                  </span>
                )}
              </div>

              {/* Doctor cards grid */}
              <div className="grid grid-cols-1 gap-3">
                {dbResults.slice(0, 4).map((doc: any) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoctor({ ...doc, source: "db" });
                      setSearchQuery("");
                    }}
                    className="group relative p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      {/* Profile image */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-sm">
                          {doc.profile_image ? (
                            <img
                              src={doc.profile_image}
                              alt={doc.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm">{doc.name?.charAt(0)?.toUpperCase() || 'D'}</span>
                          )}
                        </div>
                        {/* Online status indicator */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      </div>

                      {/* Doctor info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-semibold text-gray-900 dark:text-white truncate">
                            {doc.name}
                          </h5>
                          {doc.verified && (
                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
                          {doc.email}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-md">
                            {doc.specialization}
                          </span>

                          {doc.consultation_fee && (
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              ₹{doc.consultation_fee}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Info button to command tooltip */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTooltip(activeTooltip === doc.id ? null : doc.id);
                        }}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center justify-center transition-colors opacity-60 hover:opacity-100"
                        title="Show doctor details"
                      >
                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Enhanced tooltip */}
                    <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap min-w-max">
                      <div className="space-y-2">
                        <div className="font-semibold border-b border-gray-700 pb-1">{doc.name}</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Email:</span>
                            <span className="text-white">{doc.email}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Specialty:</span>
                            <span className="text-blue-300">{doc.specialization}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Experience:</span>
                            <span className="text-green-300">{doc.experience_years || 'N/A'} years</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Fee:</span>
                            <span className="text-yellow-300">₹{doc.consultation_fee || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      {/* Tooltip arrow */}
                      <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== FHIR DOCTORS SECTION ===== */}
          {fhirResults.length > 0 && (
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              {/* Section header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    FHIR Healthcare
                  </h4>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                    {fhirResults.length}
                  </span>
                </div>
                {fhirResults.length > 4 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    +{fhirResults.length - 4} more
                  </span>
                )}
              </div>

              {/* FHIR doctor cards grid */}
              <div className="grid grid-cols-1 gap-3">
                {fhirResults.slice(0, 4).map((doc: any) => {
                  const name =
                    doc.name?.map((n: any) =>
                      n.text
                        ? n.text
                        : [...(n.given || []), n.family].join(" ")
                    ).join(", ") || "Unknown";

                  const email = doc.telecom?.find((t: any) => t.system === "email")?.value || "Not available";
                  const phone = doc.telecom?.find((t: any) => t.system === "phone")?.value || "Not available";
                  const experience = doc.qualification?.length ? `${doc.qualification.length}+ years` : "Not available";

                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoctor({ ...doc, source: "fhir" });
                        setSearchQuery("");
                      }}
                      className="group relative p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-green-300 dark:hover:border-green-600 cursor-pointer transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        {/* FHIR icon */}
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white shadow-sm">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L19 6.6C18.8 6 18.5 5.4 18.1 4.9L19 3L17 1L15.4 1.9C14.9 1.5 14.3 1.2 13.7 1L13.4 3H11.6L11.3 1C10.7 1.2 10.1 1.5 9.6 1.9L8 1L6 3L6.9 4.9C6.5 5.4 6.2 6 6 6.6L4 7V9L6 9.4C6.2 10 6.5 10.6 6.9 11.1L6 13L8 15L9.6 14.1C10.1 14.5 10.7 14.8 11.3 15L11.6 13H13.4L13.7 15C14.3 14.8 14.9 14.5 15.4 14.1L17 15L19 13L18.1 11.1C18.5 10.6 18.8 10 19 9.4L21 9ZM12 8C13.66 8 15 9.34 15 11C15 12.66 13.66 14 12 14C10.34 14 9 12.66 9 11C9 9.34 10.34 8 12 8Z"/>
                            </svg>
                          </div>
                          {/* FHIR indicator */}
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white">F</span>
                          </div>
                        </div>

                        {/* Doctor info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-semibold text-gray-900 dark:text-white truncate">
                              {name}
                            </h5>
                            <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-md">
                              FHIR
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
                            ID: {doc.id}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md">
                              {doc.gender || "Not specified"}
                            </span>

                            {experience !== "Not available" && (
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                {experience}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hover arrow */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>

                      {/* Enhanced FHIR tooltip */}
                      <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap min-w-max">
                        <div className="space-y-2">
                          <div className="font-semibold border-b border-gray-700 pb-1">{name}</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-300">Gender:</span>
                              <span className="text-white">{doc.gender || "Not specified"}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-300">Experience:</span>
                              <span className="text-blue-300">{experience}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-300">Email:</span>
                              <span className="text-green-300">{email}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-300">Phone:</span>
                              <span className="text-yellow-300">{phone}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-300">Resource ID:</span>
                              <span className="text-purple-300 font-mono">{doc.id}</span>
                            </div>
                          </div>
                        </div>
                        {/* Tooltip arrow */}
                        <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )}
</div>
  );
}
