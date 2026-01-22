import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { useAppointment } from "../context/AppointmentContext";
import { apiClient, fhirApi } from "../services/api";
import Sidebar from "./Sidebar";
 
interface LayoutProps {
  children: React.ReactNode;
}
 
export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const { getNotifications, approveAppointment, rejectAppointment, markNotificationAsRead } = useAppointment();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [appointmentDetails, setAppointmentDetails] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
const [dbResults, setDbResults] = useState<any[]>([]);
const [fhirResults, setFhirResults] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

 
  // Check if we're on the chat page - hide footer there
  const isChatPage = location.pathname.startsWith('/chat');
 
  // Determine if user is a doctor
  const isDoctor = user?.userType === "doctor" || user?.currentRole === "doctor";
  const effectiveRole = isDoctor ? "doctor" : "user";
 
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

 
 
 
 
  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (user?.id) {
        try {
          const notifs = await getNotifications(user.id, effectiveRole as "user" | "doctor");
          setNotifications(notifs);
          setUnreadCount(notifs.filter((n: any) => !n.read).length);
         
          // For doctors, also fetch appointment details for approve/reject
          if (isDoctor) {
            const appointments = await apiClient.getAppointments() as any[];
            const aptMap: Record<string, any> = {};
            if (Array.isArray(appointments)) {
              appointments.forEach((apt: any) => {
                if (apt.id) aptMap[apt.id] = apt;
                if (apt._id) aptMap[apt._id] = apt;
              });
            }
            setAppointmentDetails(aptMap);
          }
        } catch (error) {
          console.error("Failed to fetch notifications:", error);
        }
      }
    };
    fetchNotifications();
   
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id, user?.currentRole, effectiveRole, isDoctor, getNotifications]);
 
  const refreshNotifications = async () => {
    if (user?.id) {
      try {
        const notifs = await getNotifications(user.id, effectiveRole as "user" | "doctor");
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n: any) => !n.read).length);
        if (isDoctor) {
          const appointments = await apiClient.getAppointments() as any[];
          const aptMap: Record<string, any> = {};
          if (Array.isArray(appointments)) {
            appointments.forEach((apt: any) => {
              if (apt.id) aptMap[apt.id] = apt;
              if (apt._id) aptMap[apt._id] = apt;
            });
          }
          setAppointmentDetails(aptMap);
        }
      } catch (error) {
        console.error("Failed to refresh notifications:", error);
      }
    }
  };
 
  const handleApprove = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      const success = await approveAppointment(appointmentId);
      if (success) {
        await refreshNotifications();
        alert("✅ Appointment approved successfully!");
      } else {
        alert("Failed to approve appointment.");
      }
    } catch (error) {
      console.error("Failed to approve:", error);
      alert("Failed to approve appointment.");
    }
    setActionLoading(null);
  };
 
  const handleReject = async (appointmentId: string) => {
    const reason = prompt("Please provide a reason for rejection (optional):");
    setActionLoading(appointmentId);
    try {
      const success = await rejectAppointment(appointmentId, reason || undefined);
      if (success) {
        await refreshNotifications();
        alert("Appointment rejected.");
      } else {
        alert("Failed to reject appointment.");
      }
    } catch (error) {
      console.error("Failed to reject:", error);
      alert("Failed to reject appointment.");
    }
    setActionLoading(null);
  };
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar />
 
      {/* Main Content Area - Always use ml-64 for expanded sidebar */}
      <div className="ml-64 transition-all duration-300">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            {/* Page Title / Breadcrumb */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Welcome back, {user?.name?.split(" ")[0] || "User"} 👋
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              
            </div>
 
            {/* Right Actions */}
            <div className="flex items-center gap-3">
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
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden w-[530px] search-results-panel">
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
        <div className="max-h-96 overflow-y-hidden">
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




 
  {/* Theme Toggle */}
  <button
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all group"
    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
  >
    {theme === "dark" ? (
      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1z
          m4 8a4 4 0 11-8 0 4 4 0 018 0z"
          clipRule="evenodd"
        />
      </svg>
    ) : (
      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    )}
  </button>
 
 
              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all group"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
 
              {/* Settings Icon */}
              <button
                onClick={() => navigate("/settings")}
                className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900 rounded-xl transition-all group"
                title="Settings"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
 
              {/* Chat Icon */}
              <button
                onClick={() => navigate("/chat")}
                className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-green-100 dark:hover:bg-green-900 rounded-xl transition-all group"
                title="Chat"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
 
              {/* Profile Icon */}
              <button
                onClick={() => navigate("/profile")}
                className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white font-semibold cursor-pointer transition-colors"
                title="Profile"
              >
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </button>
            </div>
          </div>
        </header>
 
        {/* Page Content */}
        <main className="p-4">
          {children}
        </main>
 
        {/* Footer - Hidden on chat pages */}
        {!isChatPage && (
          <footer className="bg-gray-900 text-white mt-auto">
            <div className="px-6 py-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <span className="font-semibold">Wellness Healthcare</span>
                </div>
                <p className="text-gray-400 text-sm">
                  © {new Date().getFullYear()} Wellness Dev. All rights reserved.
                </p>
                <div className="flex gap-4">
                  <a href="#" className="text-gray-400 hover:text-white transition">Privacy</a>
                  <a href="#" className="text-gray-400 hover:text-white transition">Terms</a>
                  <a href="#" className="text-gray-400 hover:text-white transition">Support</a>
                </div>
              </div>
            </div>
          </footer>
        )}
      </div>
{selectedDoctor && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    onClick={() => setSelectedDoctor(null)}
  >
    <div
      className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-xl shadow-xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Profile Image */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
              {selectedDoctor.source === "db" ? (
                selectedDoctor.profile_image ? (
                  <img
                    src={selectedDoctor.profile_image}
                    alt={selectedDoctor.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  selectedDoctor.name?.charAt(0)?.toUpperCase() || 'D'
                )
              ) : (
                // FHIR doctor avatar
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L19 6.6C18.8 6 18.5 5.4 18.1 4.9L19 3L17 1L15.4 1.9C14.9 1.5 14.3 1.2 13.7 1L13.4 3H11.6L11.3 1C10.7 1.2 10.1 1.5 9.6 1.9L8 1L6 3L6.9 4.9C6.5 5.4 6.2 6 6 6.6L4 7V9L6 9.4C6.2 10 6.5 10.6 6.9 11.1L6 13L8 15L9.6 14.1C10.1 14.5 10.7 14.8 11.3 15L11.6 13H13.4L13.7 15C14.3 14.8 14.9 14.5 15.4 14.1L17 15L19 13L18.1 11.1C18.5 10.6 18.8 10 19 9.4L21 9ZM12 8C13.66 8 15 9.34 15 11C15 12.66 13.66 14 12 14C10.34 14 9 12.66 9 11C9 9.34 10.34 8 12 8Z"/>
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {selectedDoctor.source === "db"
                  ? selectedDoctor.name
                  : (selectedDoctor.name?.map((n: any) =>
                      n.text
                        ? n.text
                        : [...(n.given || []), n.family].filter(Boolean).join(" ")
                    ).join(", ") || "Unknown")
                }
              </h2>
              <p className="text-blue-100">
                {selectedDoctor.source === "db"
                  ? selectedDoctor.specialization
                  : "Healthcare Professional"
                }
              </p>
              {selectedDoctor.source === "db" && (
                <p className="text-sm text-blue-200 mt-1">
                  {selectedDoctor.email}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setSelectedDoctor(null)}
            className="text-white hover:bg-white/20 rounded-full p-2"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-96 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
              Basic Information
            </h3>

            {selectedDoctor.source === "db" ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</p>
                  <p className="text-gray-900 dark:text-white">{selectedDoctor.name}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-gray-900 dark:text-white">{selectedDoctor.email || "Not provided"}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Specialization</p>
                  <p className="text-gray-900 dark:text-white">{selectedDoctor.specialization || "Not specified"}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Experience</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedDoctor.experience_years
                      ? `${selectedDoctor.experience_years} years`
                      : "Not specified"
                    }
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Consultation Fee</p>
                  <p className="text-gray-900 dark:text-white">
                    ₹{selectedDoctor.consultation_fee || "Not specified"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedDoctor.name?.map((n: any) =>
                      n.text
                        ? n.text
                        : [...(n.given || []), n.family].filter(Boolean).join(" ")
                    ).join(", ") || "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</p>
                  <p className="text-gray-900 dark:text-white capitalize">
                    {selectedDoctor.gender || "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Experience</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedDoctor.qualification?.length
                      ? `${selectedDoctor.qualification.length}+ years`
                      : "Not available"}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Contact & Professional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
              Contact & Professional
            </h3>

            {selectedDoctor.source === "db" ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Qualifications</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedDoctor.qualifications?.join(", ") || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedDoctor.department || selectedDoctor.specialization || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">License Number</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedDoctor.license_number || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Verification Status</p>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedDoctor.verified
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}>
                    {selectedDoctor.verified ? "✓ Verified" : "✗ Unverified"}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedDoctor.telecom?.find((t: any) => t.system === "email")?.value ||
                      "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedDoctor.telecom?.find((t: any) => t.system === "phone")?.value ||
                      "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Identifier</p>
                  <p className="text-gray-900 dark:text-white font-mono text-sm">
                    {selectedDoctor.id || "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Source</p>
                  <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    FHIR Resource
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Qualifications & Certifications (for DB doctors) */}
        {selectedDoctor.source === "db" && selectedDoctor.qualifications && selectedDoctor.qualifications.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2 mb-3">
              Qualifications & Certifications
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedDoctor.qualifications.map((qual: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm font-medium rounded-full"
                >
                  {qual}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* FHIR Extensions (for FHIR doctors) */}
        {selectedDoctor.source === "fhir" && selectedDoctor.extension && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2 mb-3">
              Additional Information
            </h3>
            <div className="space-y-2">
              {selectedDoctor.extension.map((ext: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{ext.url.split('/').pop()}</span>
                  <span className="text-gray-900 dark:text-white">{JSON.stringify(ext.valueString || ext.valueCode || 'N/A')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {selectedDoctor.source === "db" && (
          <button
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            onClick={() => {
              // Navigate to booking or hospital page
              setSelectedDoctor(null);
            }}
          >
            Book Appointment
          </button>
        )}
        <button
          onClick={() => setSelectedDoctor(null)}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}



 
      {/* Notifications Modal */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{unreadCount} unread</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
 
            <div className="overflow-y-auto h-[calc(100vh-100px)]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="font-medium">No notifications yet</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Show role indicator for doctors */}
                  {isDoctor && (
                    <div className="p-4 bg-emerald-50 border-b border-emerald-200">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <span className="font-medium text-emerald-700">Doctor Mode</span>
                      </div>
                      <p className="text-xs text-emerald-600 mt-1">You can approve/reject appointment requests</p>
                    </div>
                  )}
                  {notifications.map((notif, idx) => {
                    // Determine if this notification needs approve/reject buttons
                    // ONLY show for "New Appointment Request" (receiving doctor) - NOT for "Appointment Requested" (patient who booked)
                    const appointment = notif.appointmentId ? appointmentDetails[notif.appointmentId] : null;
                    const appointmentIsPending = appointment ? appointment.status === "pending" : true;
                    const showApproveReject = isDoctor &&
                                              notif.title === "New Appointment Request" &&
                                              appointmentIsPending;
 
                    // Handle notification click - mark as read
                    const handleNotificationClick = async () => {
                      if (!notif.read && notif.id) {
                        await markNotificationAsRead(notif.id);
                        // Update local state
                        setNotifications(prev =>
                          prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
                        );
                        setUnreadCount(prev => Math.max(0, prev - 1));
                      }
                    };
 
                    return (
                    <div
                      key={notif.id || idx}
                      onClick={handleNotificationClick}
                      className={`p-4 hover:bg-gray-50 transition cursor-pointer ${
                        !notif.read ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          showApproveReject ? "bg-amber-100 text-amber-600" :
                          notif.type === "appointment" ? "bg-blue-100 text-blue-600" :
                          notif.type === "appointment_confirmed" ? "bg-green-100 text-green-600" :
                          notif.type === "appointment_cancelled" || notif.type === "appointment_rejected" ? "bg-red-100 text-red-600" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {notif.type === "appointment_confirmed" ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : notif.type === "appointment_cancelled" || notif.type === "appointment_rejected" ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-gray-900 ${!notif.read ? "" : "text-gray-600"}`}>
                            {notif.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notif.message}</p>
                         
                          {/* Show pending badge for appointment requests */}
                          {showApproveReject && (
                            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                              Pending Approval
                            </div>
                          )}
                         
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
                         
                          {/* Approve/Reject Buttons */}
                          {showApproveReject && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (notif.appointmentId) {
                                    handleApprove(notif.appointmentId);
                                  } else {
                                    alert("Cannot approve: Appointment ID not found");
                                  }
                                }}
                                disabled={actionLoading === notif.appointmentId || !notif.appointmentId}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
                              >
                                {actionLoading === notif.appointmentId ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                  </svg>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Approve
                                  </>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (notif.appointmentId) {
                                    handleReject(notif.appointmentId);
                                  } else {
                                    alert("Cannot reject: Appointment ID not found");
                                  }
                                }}
                                disabled={actionLoading === notif.appointmentId || !notif.appointmentId}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
                              >
                                {actionLoading === notif.appointmentId ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                  </svg>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Reject
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
 
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        .search-results-panel {        }
      `}</style>
    </div>
  );
}