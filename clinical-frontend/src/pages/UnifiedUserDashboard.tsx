import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useAppointment } from "../context/AppointmentContext";
import BookingModal from "../components/BookingModal";

import { apiClient } from "../services/api";

interface Hospital {
  id: number | string;
  name: string;
  status: string;
  distance: number;
  address: string;
  specialties: string[];
  doctors: { name: string; status: string; id?: string }[];
  rating: number;
  reviews: number;
  img?: string;
}

export default function UnifiedUserDashboard() {
  const navigate = useNavigate();
  const { user, switchRole, logout } = useUser();
  const { getNotifications } = useAppointment();
  const [showFilters, setShowFilters] = useState(false);
  const [location, setLocation] = useState("Chennai");
  const [distance, setDistance] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<{
    id: string;
    name: string;
    specialty: string;
  } | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedTab, setSelectedTab] = useState("appointments");

  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      console.log("🔄 DASHBOARD: Fetching notifications for user:", user);
      if (user?.id) {
        console.log("🔄 DASHBOARD: User ID found:", user.id);
        try {
          const notifications = await getNotifications(user.id, "user");
          console.log("🔄 DASHBOARD: Notifications received:", notifications);
          setUserNotifications(notifications);
          setUnreadCount(notifications.filter((n: any) => !n.read).length);
        } catch (error) {
          console.error("🔄 DASHBOARD: Failed to fetch notifications:", error);
        }
      } else {
        console.log("🔄 DASHBOARD: No user ID available yet");
      }
    };
    fetchNotifications();
  }, [user?.id, getNotifications]);

  // Appointment counts state
  const [appointmentCounts, setAppointmentCounts] = useState({
    total: 0,
    upcoming: 0,
  });

  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 20000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  // Sample dummy data (fallback)
  const dummyHospitals: Hospital[] = [
    {
      id: 1,
      name: "Expresscare Medical Clinic",
      status: "Open",
      distance: 2.4,
      address: "Greams Road, Chennai",
      specialties: ["Cardiology", "Orthopedic", "Neuro"],
      doctors: [
        { name: "Erica Lim", status: "Not Serving Patient" },
        { name: "Nick Young", status: "Not Confirmed", id: "892754961" },
        { name: "Kevin Zane", status: "Serving patient" },
        { name: "Alina Choo", status: "Not Confirmed", id: "891911250" },
      ],
      rating: 4.8,
      reviews: 320,
      img: "https://images.unsplash.com/photo-1631217b286f18c106e7dcf3a10c58253e39ec4e0?w=800&h=300&fit=crop",
    },
    {
      id: 2,
      name: "Fortis Malar Hospital",
      status: "Open",
      distance: 4.8,
      address: "Adyar, Chennai",
      specialties: ["Heart Care", "ICU", "General"],
      doctors: [
        { name: "Dr. Rajesh Kumar", status: "Available", id: "doc_001" },
        { name: "Dr. Priya Singh", status: "Available", id: "doc_002" },
      ],
      rating: 4.6,
      reviews: 285,
      img: "https://images.unsplash.com/photo-1576091160647-112616031c74?w=800&h=300&fit=crop",
    },
    {
      id: 3,
      name: "SIMS Hospital",
      status: "Open",
      distance: 6.5,
      address: "Vadapalani, Chennai",
      specialties: ["Emergency", "Dermatology", "Surgery"],
      doctors: [
        { name: "Dr. Amit Patel", status: "Available" },
        { name: "Dr. Neha Gupta", status: "In Emergency" },
      ],
      rating: 4.5,
      reviews: 210,
      img: "https://images.unsplash.com/photo-1576091160671-112d4fbf9a39?w=800&h=300&fit=crop",
    },
    {
      id: 4,
      name: "Apollo Hospitals",
      status: "Open",
      distance: 3.2,
      address: "Thousand Lights, Chennai",
      specialties: ["Neurology", "Pediatrics", "Oncology"],
      doctors: [
        { name: "Dr. Vikram Sharma", status: "Available" },
        { name: "Dr. Anjali Roy", status: "Available" },
      ],
      rating: 4.9,
      reviews: 450,
      img: "https://images.unsplash.com/photo-1626214174585-fe31582dc5d0?w=800&h=300&fit=crop",
    },
  ];

  // Fetch hospitals from API or use dummy data
  useEffect(() => {
    const fetchHospitals = async () => {
      setLoading(true);
      console.log("🔍 DASHBOARD: Fetching hospitals from API...");
      try {
        const apiData = await apiClient.getHospitals();
        console.log("🔍 DASHBOARD: API Response:", apiData);

        if (apiData && Array.isArray(apiData) && apiData.length > 0) {
          // Format API data to match Hospital interface
          const formattedData: Hospital[] = apiData.map((h: any) => ({
            id: h._id || h.id,
            name: h.name,
            status: h.status || "Open",
            distance: h.distance || 0,
            address: h.address || "",
            specialties: h.specialties || [],
            doctors: h.doctors || [],
            rating: h.rating || 4.5,
            reviews: h.reviews || 0,
            img: h.img,
          }));
          console.log("🔍 DASHBOARD: Using API data:", formattedData.length, "hospitals");
          setHospitals(formattedData);
        } else {
          console.log("🔍 DASHBOARD: No API data, using dummy data");
          // Use dummy data as fallback
          setHospitals(dummyHospitals);
        }
      } catch (error) {
        console.error("🔍 DASHBOARD: API Error, using dummy data:", error);
        setHospitals(dummyHospitals);
      }
      setLoading(false);
    };

    fetchHospitals();
  }, []);

  // Fetch appointment counts
  useEffect(() => {
    const fetchAppointmentCounts = async () => {
      if (!user?.id) return;

      try {
        // Use the main appointments endpoint which filters based on user role
        const appointments = await apiClient.getAppointments();
        if (appointments && Array.isArray(appointments)) {
          const total = appointments.length;
          const upcoming = appointments.filter((apt: any) =>
            apt.status === "scheduled" || apt.status === "upcoming"
          ).length;
          setAppointmentCounts({ total, upcoming });
        } else {
          setAppointmentCounts({ total: 0, upcoming: 0 });
        }
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
        setAppointmentCounts({ total: 0, upcoming: 0 });
      }
    };

    fetchAppointmentCounts();
  }, [user?.id]);

  // Filter hospitals based on distance and search
  const filteredHospitals = hospitals.filter(
    (h) => h.distance <= distance && h.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
      {/* NOTIFICATIONS MODAL */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowNotifications(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-6 relative animate-in fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
              onClick={() => setShowNotifications(false)}
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-lg">
                {/* Bell Icon */}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </span>
              <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="ml-auto bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full px-3 py-1 shadow animate-pulse">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {userNotifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400">No notifications yet.</div>
              ) : (
                userNotifications.map((notif, idx) => (
                  <div
                    key={notif.id || idx}
                    className={`flex items-start gap-3 py-4 px-3 rounded-xl transition-all duration-200 ${!notif.read ? "bg-blue-50/60" : "bg-white"}`}
                  >
                    <span className={`mt-1 w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${!notif.read ? "bg-blue-500/90 text-white" : "bg-gray-200 text-gray-400"}`}>
                      {notif.type === "appointment_confirmed" ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : notif.type === "appointment_cancelled" ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : !notif.read ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-gray-900 ${!notif.read ? "" : "text-gray-500"}`}>{notif.title}</p>
                      <p className={`text-sm mt-1 ${!notif.read ? "text-gray-700" : "text-gray-500"}`}>{notif.message}</p>
                      {notif.type === "appointment_confirmed" && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Confirmed
                        </div>
                      )}
                      {notif.type === "appointment_cancelled" && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Cancelled
                        </div>
                      )}
                      {notif.type === "appointment_booked" && !notif.read && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          Pending
                        </div>
                      )}
                      {notif.createdAt && (
                        <p className="text-xs text-gray-400 mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                      )}
                    </div>
                    {!notif.read && (
                      <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0"></span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* ENHANCED GLASSMORPHISM HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-blue-500/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex items-center justify-between h-20">
            {/* ENHANCED LOGO & BRANDING */}
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="relative">
                <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=48&h=48&fit=crop" alt="Wellness Logo" className="w-12 h-12 rounded-2xl shadow-xl shadow-blue-500/20 object-cover group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full border-2 border-white shadow-lg"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-emerald-700 bg-clip-text text-transparent">Wellness Dev</h1>
                <p className="text-xs text-gray-500 font-medium">Healthcare Platform</p>
              </div>
            </div>

            {/* ENHANCED SEARCH BAR */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <div className="relative w-full group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search doctors, hospitals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent rounded-2xl focus:outline-none text-gray-700 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* ENHANCED RIGHT ACTIONS */}
            <div className="flex items-center gap-3">
              {/* Doctor badge - doctors are always in doctor mode */}
              {user?.userType === "doctor" && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/25">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="font-semibold text-sm">Doctor</span>
                </div>
              )}

              {/* ADMIN DASHBOARD BUTTON (Only for clinical admins) */}
              {user?.userType === "clinical_admin" && (
                <button
                  onClick={() => navigate("/admin/dashboard")}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-4 py-2 rounded-xl hover:shadow-lg transition-all duration-300 shadow-lg shadow-purple-500/25"
                >
                  Admin Panel
                </button>
              )}

              {/* ENHANCED NOTIFICATION BUTTON */}
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:bg-white/80 group"
                title="Notifications"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* ENHANCED USER PROFILE DROPDOWN */}
              <div className="relative group">
                <button className="flex items-center gap-3 p-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:bg-white/80">
                  <div className="relative">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  <span className="hidden sm:inline text-sm font-semibold text-gray-700">{user?.name || "User"}</span>
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>

                {/* ENHANCED DROPDOWN MENU */}
                <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-blue-500/10 border border-white/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                  <div className="px-5 py-4 border-b border-gray-100/50">
                    <p className="font-bold text-gray-900 text-sm">{user?.name || "User"}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      {user?.userType === "doctor" ? "Healthcare Provider" : "Patient"}
                    </p>
                  </div>
                  <button onClick={() => navigate("/profile")} className="w-full text-left block px-5 py-3 text-gray-700 hover:bg-blue-50/50 text-sm rounded-lg mx-2 my-1 transition-colors">
                    <svg className="w-4 h-4 inline mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v10a2 2 0 002 2h5m0 0h5a2 2 0 002-2m0 0V6a2 2 0 00-2-2h-5m0 0V5a2 2 0 00-2-2h-.5A2.5 2.5 0 003 7.5V9m0 0h18" />
                    </svg>
                    My Profile
                  </button>
                  <button onClick={() => navigate("/settings")} className="w-full text-left block px-5 py-3 text-gray-700 hover:bg-blue-50/50 text-sm rounded-lg mx-2 my-1 transition-colors">
                    <svg className="w-4 h-4 inline mr-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                    Settings
                  </button>
                  <div className="px-5 py-3 border-t border-gray-100/50 bg-gradient-to-r from-blue-50/50 to-emerald-50/50 rounded-b-2xl">
                    <p className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      SESSION ACTIVE
                    </p>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="w-full text-left px-5 py-3 text-red-600 hover:bg-red-50/50 text-sm rounded-lg mx-2 mb-2 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ENHANCED MOBILE SEARCH */}
          <div className="lg:hidden mt-4 pb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg shadow-blue-500/5">
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search doctors, hospitals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-transparent rounded-2xl focus:outline-none text-gray-700 placeholder-gray-400"
                />
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Toggle Filters"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ENHANCED MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-12">
        {/* USER WELCOME SECTION - AUTO HIDE AFTER 20 SECONDS */}
        {showWelcome && (
          <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-3xl p-8 mb-12 shadow-xl text-white animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shadow-xl border border-white/30">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Welcome back, {user?.name || "User"}!</h2>
                  <p className="text-white/80 mt-2">
                    Stay healthy with our comprehensive healthcare solutions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="text-white/80 hover:text-white transition p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 flex items-center gap-4 text-white/80 text-sm">
              <span>📍 {location}</span>
              <span>📏 Up to {distance} km range</span>
              <div className="ml-auto text-white/60 text-xs">Auto-closing in 20 seconds...</div>
            </div>
          </div>
        )}

        {/* ENHANCED QUICK ACTIONS DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {/* APPOINTMENTS CARD */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <button
              onClick={() => navigate("/appointments")}
              className="relative rounded-3xl p-10 shadow-xl border border-white/50 bg-white/80 backdrop-blur-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer text-left group/card overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-blue-600/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">Appointments</h3>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover/card:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">{appointmentCounts.total}</p>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">View and manage your healthcare appointments</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-full">
                    <span className="font-semibold text-blue-600">{appointmentCounts.upcoming} upcoming</span> • {appointmentCounts.total - appointmentCounts.upcoming} completed
                  </div>
                  <svg className="w-5 h-5 text-blue-600 group-hover/card:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* MEDICAL RECORDS CARD */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <button
              onClick={() => navigate("/medical-records")}
              className={`relative rounded-3xl p-10 shadow-xl border transition-all duration-300 cursor-pointer text-left group/card overflow-hidden ${
                selectedTab === "medical-records"
                  ? "bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 border-emerald-400 shadow-emerald-500/25"
                  : "bg-white/80 backdrop-blur-sm border-white/50 hover:shadow-2xl hover:-translate-y-2"
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-emerald-600/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">Medical Records</h3>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover/card:scale-110 ${
                    selectedTab === "medical-records"
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/25"
                      : "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-600 shadow-emerald-500/10"
                  }`}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">8</p>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">Access your complete medical history securely</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-full">
                    Lab reports • Prescriptions • Documents
                  </div>
                  <svg className="w-5 h-5 text-emerald-600 group-hover/card:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* AI ASSISTANT CARD */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <button
              onClick={() => setSelectedTab("ai-knowledge")}
              className={`relative rounded-3xl p-10 shadow-xl border transition-all duration-300 cursor-pointer text-left group/card overflow-hidden ${
                selectedTab === "ai-knowledge"
                  ? "bg-gradient-to-br from-purple-50/80 to-purple-100/80 border-purple-400 shadow-purple-500/25"
                  : "bg-white/80 backdrop-blur-sm border-white/50 hover:shadow-2xl hover:-translate-y-2"
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-purple-600/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">AI Assistant</h3>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover/card:scale-110 ${
                    selectedTab === "ai-knowledge"
                      ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-purple-500/25"
                      : "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600 shadow-purple-500/10"
                  }`}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <p className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">24</p>
                  <span className="text-lg font-bold text-purple-600">/7</span>
                </div>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">Get instant health insights and personalized advice</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    Powered by AI • Always available
                  </div>
                  <svg className="w-5 h-5 text-purple-600 group-hover/card:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* SPECIALIST DOCTORS CAROUSEL SECTION */}
        <div className="mt-20 mb-20">
          <div className="mb-2">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Top Specialist Doctors</h2>
            <p className="text-gray-600">Connect with our most experienced and highly-rated healthcare professionals</p>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { id: 1, name: "Dr. Rajesh Kumar", specialty: "Cardiology", rating: 4.8, reviews: 320, experience: "15+ Years", img: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&h=600&fit=crop" },
              { id: 2, name: "Dr. Priya Singh", specialty: "Orthopedics", rating: 4.7, reviews: 280, experience: "12+ Years", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=600&fit=crop" },
              { id: 3, name: "Dr. Amit Patel", specialty: "Dermatology", rating: 4.9, reviews: 450, experience: "18+ Years", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=600&fit=crop" },
              { id: 4, name: "Dr. Sarah Johnson", specialty: "Pediatrics", rating: 4.6, reviews: 210, experience: "10+ Years", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&h=600&fit=crop" },
            ].map((doctor) => (
              <div key={doctor.id} className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition group cursor-pointer">
                {/* FULL IMAGE SECTION */}
                <div className="relative h-72 overflow-hidden bg-gradient-to-br from-blue-400 to-emerald-400">
                  <img src={doctor.img} alt={doctor.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  {/* RATING BADGE */}
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-bold text-gray-900">{doctor.rating}</span>
                  </div>

                  {/* SPECIALIST BADGE */}
                  <div className="absolute bottom-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg">
                    {doctor.specialty}
                  </div>
                </div>

                {/* DOCTOR INFO SECTION */}
                <div className="p-7">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{doctor.name}</h3>
                  <p className="text-sm text-gray-600 mb-5">{doctor.experience} Experience</p>

                  {/* REVIEWS */}
                  <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
                    <span className="text-sm text-gray-600">{doctor.reviews} reviews</span>
                    <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">✓ Verified</span>
                  </div>

                  {/* BOOK BUTTON */}
                  <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg text-white font-bold py-3 rounded-xl transition group-hover:shadow-blue-200 shadow-md">
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HEALTH CONCERNS SECTION */}
        <div className="mt-20 mb-20">
          <div className="mb-2">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Health Concerns</h2>
            <p className="text-gray-600">Find specialists for your specific health needs</p>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { id: 1, name: "Gynecology", icon: "👩‍⚕️" },
              { id: 2, name: "Dermatology", icon: "🧴" },
              { id: 3, name: "Cardiology", icon: "❤️" },
              { id: 4, name: "Pediatrics", icon: "👶" },
              { id: 5, name: "Physiotherapy", icon: "🏃" },
              { id: 6, name: "Psychiatry", icon: "🧠" },
            ].map((concern) => (
              <button
                key={concern.id}
                className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition text-center group"
              >
                <div className="text-5xl mb-4 group-hover:scale-125 transition">{concern.icon}</div>
                <p className="font-semibold text-gray-900">{concern.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* CONSULTATION BOOKING SECTION */}
        <div className="mt-20 mb-20">
          <div className="mb-2">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Consultation Modes</h2>
            <p className="text-gray-600">Choose the most convenient way to consult with our doctors</p>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { id: 1, name: "Online Consultation", desc: "Video consultation with doctors", img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=250&fit=crop" },
              { id: 2, name: "Lab Tests", desc: "Comprehensive health checkup", img: "https://images.unsplash.com/photo-1576091160671-112d4fbf9a39?w=400&h=250&fit=crop" },
              { id: 3, name: "In-Clinic Visit", desc: "Direct consultation at hospital", img: "https://images.unsplash.com/photo-1631217b286f18c106e7dcf3a10c58253e39ec4e0?w=400&h=250&fit=crop" },
              { id: 4, name: "Home Service", desc: "Doctor visit at your home", img: "https://images.unsplash.com/photo-1576091160621-112616031c74?w=400&h=250&fit=crop" },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => navigate("/browse-hospitals")}
                className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition text-left group"
              >
                <img src={type.img} alt={type.name} className="w-full h-40 object-cover group-hover:scale-105 transition" />
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-2">{type.name}</h3>
                  <p className="text-sm text-gray-600">{type.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ARTICLES SECTION */}
        <div className="mt-20 mb-20">
          <div className="mb-2">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Health Articles</h2>
            <p className="text-gray-600">Read expert-curated articles on health, wellness, and medical care</p>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { id: 1, title: "Heart Health: Prevention Tips", category: "Cardiology", reads: "2.5K", img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=250&fit=crop" },
              { id: 2, title: "Mental Wellness in Daily Life", category: "Mental Health", reads: "1.8K", img: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=250&fit=crop" },
              { id: 3, title: "Proper Nutrition for Kids", category: "Pediatrics", reads: "3.2K", img: "https://images.unsplash.com/photo-1532619927891-8a961cb9dda5?w=400&h=250&fit=crop" },
            ].map((article) => (
              <div key={article.id} className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition cursor-pointer">
                <img src={article.img} alt={article.title} className="w-full h-48 object-cover" />
                <div className="p-6">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{article.category}</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-4 mb-3">{article.title}</h3>
                  <p className="text-sm text-gray-600">{article.reads} doctors read this</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TESTIMONIALS SECTION */}
        <div className="mt-20 mb-20">
          <div className="mb-2">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Patient Testimonials</h2>
            <p className="text-gray-600">Read success stories from our satisfied patients</p>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { id: 1, name: "Amit Kumar", role: "Software Engineer", text: "Wellness app made it so easy to find a doctor and book appointments. The experience was seamless!", rating: 5 },
              { id: 2, name: "Priya Sharma", role: "Teacher", text: "Great platform with experienced doctors. Highly recommended for anyone looking for quality healthcare.", rating: 5 },
              { id: 3, name: "Rajesh Patel", role: "Business Owner", text: "Saved me so much time. Being able to consult from home during busy schedules is incredible!", rating: 4 },
            ].map((testimonial) => (
              <div key={testimonial.id} className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 hover:shadow-2xl hover:-translate-y-1 transition">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic text-lg">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENTLY VISITED SECTION - MODERN DESIGN */}
        <div className="mt-20 mb-32">
          <div className="mb-2">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Recently Visited Hospitals</h2>
            <p className="text-gray-600">Quick access to your frequently visited healthcare facilities</p>
          </div>

          {/* MODERN GRID LAYOUT - 2 COLUMNS */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredHospitals.slice(0, 2).map((hospital) => (
              <div
                key={hospital.id}
                className="group bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition cursor-pointer"
              >
                {/* HEADER WITH GRADIENT */}
                <div className="bg-gradient-to-r from-blue-600 to-emerald-600 h-40 relative overflow-hidden">
                  <img src={hospital.img || "https://images.unsplash.com/photo-1631217b286f18c106e7dcf3a10c58253e39ec4e0?w=800&h=300&fit=crop"} alt={hospital.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-emerald-600/30"></div>
                </div>

                {/* CONTENT SECTION */}
                <div className="p-8">
                  {/* HOSPITAL NAME AND RATING */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">{hospital.name}</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${i < Math.floor(hospital.rating) ? "text-yellow-400" : "text-gray-300"}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{hospital.rating}</span>
                        <span className="text-xs text-gray-600">({hospital.reviews})</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                      ⭐ Verified
                    </span>
                  </div>

                  {/* ADDRESS AND DISTANCE */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {hospital.address}
                    </p>
                    <p className="text-sm font-semibold text-blue-600">
                      📍 {hospital.distance} km away
                    </p>
                  </div>

                  {/* SPECIALTIES */}
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Specialties</p>
                    <div className="flex flex-wrap gap-2">
                      {hospital.specialties.slice(0, 3).map((specialty, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gradient-to-r from-blue-50 to-emerald-50 text-gray-700 rounded-full text-xs font-semibold border border-blue-200 hover:border-blue-400 transition"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* TOP DOCTOR */}
                  {hospital.doctors.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-2xl p-4 mb-4 border border-blue-100">
                      <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Popular Doctor</p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white flex-shrink-0">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{hospital.doctors[0].name}</p>
                          <p className="text-xs text-gray-600">{hospital.specialties[0]}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate("/browse-hospitals")}
                      className="flex-1 bg-gray-100 text-gray-900 font-semibold py-3 rounded-xl hover:bg-gray-200 transition"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hospital.doctors.length > 0) {
                          setSelectedDoctor({
                            id: hospital.doctors[0].id || "doc_0",
                            name: hospital.doctors[0].name,
                            specialty: hospital.specialties[0],
                          });
                          setShowBookingModal(true);
                        }
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-xl hover:shadow-lg transition group-hover:shadow-blue-200"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER SECTION WITH DOWNLOAD APP */}
        <footer className="mt-20 bg-gray-900 text-white w-screen relative left-1/2 right-1/2 -mx-[50vw]">
          {/* MAIN CONTENT */}
          <div className="px-8 lg:px-16 py-16">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                {/* COMPANY INFO & DOWNLOAD */}
                <div className="lg:col-span-2">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=48&h=48&fit=crop" alt="Wellness Logo" className="w-12 h-12 rounded-lg shadow-lg" />
                      <h1 className="text-2xl font-bold">Wellness Dev</h1>
                    </div>
                    <p className="text-gray-400 mb-6">Your trusted healthcare platform. Access quality healthcare anytime, anywhere.</p>

                    {/* DOWNLOAD BUTTONS */}
                    <div className="space-y-3">
                      <h3 className="font-bold text-lg mb-4">Download Our App</h3>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button className="flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg flex-1 sm:flex-none">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.05 13.5c-.91 0-1.64.75-1.64 1.74s.73 1.74 1.64 1.74c.9 0 1.64-.75 1.64-1.74s-.74-1.74-1.64-1.74m-11.08 0c-.91 0-1.64.75-1.64 1.74s.73 1.74 1.64 1.74c.9 0 1.64-.75 1.64-1.74s-.74-1.74-1.64-1.74M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1" />
                          </svg>
                          <div className="text-left">
                            <div className="text-xs leading-none">App Store</div>
                          </div>
                        </button>

                        <button className="flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg flex-1 sm:flex-none">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 20.5V3.5C3 2.592 3.864 1.75 4.75 1.75h14.5c.886 0 1.75.864 1.75 1.75v17c0 .886-.864 1.75-1.75 1.75H4.75c-.886 0-1.75-.864-1.75-1.75zm10.5-14v8.5H6v-8.5h7.5z" />
                          </svg>
                          <div className="text-left">
                            <div className="text-xs leading-none">Google Play</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* RATINGS */}
                    <div className="mt-6 pt-6 border-t border-gray-700">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          </div>
                          <p className="text-white font-bold">4.9/5 Rating</p>
                          <p className="text-gray-400 text-sm">50K+ Reviews</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QUICK LINKS */}
                <div>
                  <h3 className="font-bold text-lg mb-6">Quick Links</h3>
                  <ul className="space-y-3">
                    <li><a href="#" className="text-gray-400 hover:text-white transition">Home</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition">Appointments</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition">Browse Hospitals</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition">Medical Records</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition">AI Assistant</a></li>
                  </ul>
                </div>

                {/* SUPPORT */}
                <div>
                  <h3 className="font-bold text-lg mb-6">Support</h3>
                  <ul className="space-y-3">
                    <li><a href="#" className="text-gray-400 hover:text-white transition">Contact Us</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition">Privacy Policy</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition">Terms & Conditions</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition">FAQ</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition">Blog</a></li>
                  </ul>
                </div>
              </div>

              {/* FEATURES SECTION */}
              <div className="border-t border-gray-700 pt-12 mb-12">
                <h3 className="font-bold text-lg mb-8">Why Choose Wellness Dev?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="font-bold mb-2">Easy Booking</h4>
                    <p className="text-gray-400 text-sm">Book appointments in seconds</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition">
                    <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="font-bold mb-2">Verified Doctors</h4>
                    <p className="text-gray-400 text-sm">100% verified medical professionals</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="font-bold mb-2">24/7 Support</h4>
                    <p className="text-gray-400 text-sm">Round-the-clock customer support</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition">
                    <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="font-bold mb-2">Secure Data</h4>
                    <p className="text-gray-400 text-sm">Your health data is encrypted</p>
                  </div>
                </div>
              </div>

              {/* BOTTOM FOOTER */}
              <div className="border-t border-gray-700 pt-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="text-gray-400 text-sm">© 2025 Wellness Dev by Sorim AI. All rights reserved.</p>
                  <div className="flex items-center gap-6">
                    <a href="#" className="text-gray-400 hover:text-white transition">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-white transition">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7"/>
                      </svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-white transition">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* BOOKING MODAL */}
      {selectedDoctor && (
        <BookingModal
          isOpen={showBookingModal}
          doctor={selectedDoctor as { id: string; name: string; specialty: string }}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDoctor(null);
          }}
          onSuccess={() => {
            setBookingSuccess(true);
            setTimeout(() => setBookingSuccess(false), 3000);
            // Refresh appointment counts after booking
            const fetchAppointmentCounts = async () => {
              if (!user?.id) return;
              try {
                const appointments = await apiClient.getAppointments();
                if (appointments && Array.isArray(appointments)) {
                  const total = appointments.length;
                  const upcoming = appointments.filter((apt: any) =>
                    apt.status === "scheduled" || apt.status === "upcoming"
                  ).length;
                  setAppointmentCounts({ total, upcoming });
                } else {
                  setAppointmentCounts({ total: 0, upcoming: 0 });
                }
              } catch (error) {
                console.error("Failed to refresh appointment counts:", error);
                setAppointmentCounts({ total: 0, upcoming: 0 });
              }
            };
            fetchAppointmentCounts();
          }}
        />
      )}


      {/* SUCCESS TOAST */}
      {bookingSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-40">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Appointment booked successfully!</span>
        </div>
      )}
    </div>
  );
}
