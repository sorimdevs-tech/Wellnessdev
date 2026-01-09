import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { useAppointment } from "../context/AppointmentContext";
import { apiClient } from "../services/api";
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

  // Check if we're on the chat page - hide footer there
  const isChatPage = location.pathname.startsWith('/chat');

  // Determine if user is a doctor
  const isDoctor = user?.userType === "doctor" || user?.currentRole === "doctor";
  const effectiveRole = isDoctor ? "doctor" : "user";

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
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all group"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600" fill="currentColor" viewBox="0 0 20 20">
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
      `}</style>
    </div>
  );
}
