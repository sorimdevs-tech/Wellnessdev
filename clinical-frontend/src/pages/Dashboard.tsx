import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { useAppointment } from "../context/AppointmentContext";
import { useEffect, useState } from "react";
import { apiClient } from "../services/api";

interface AppointmentStats {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  pending: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  gradient: string;
}

export default function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { getNotifications, approveAppointment, rejectAppointment } = useAppointment();
  const [stats, setStats] = useState<AppointmentStats>({ total: 0, upcoming: 0, completed: 0, cancelled: 0, pending: 0 });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch appointments
      const appointments = await apiClient.getAppointments();
      if (appointments && Array.isArray(appointments)) {
        const total = appointments.length;
        const pending = appointments.filter((apt: any) => apt.status === "pending").length;
        const upcoming = appointments.filter((apt: any) => 
          apt.status === "scheduled" || apt.status === "upcoming" || apt.status === "approved"
        ).length;
        const completed = appointments.filter((apt: any) => apt.status === "completed").length;
        const cancelled = appointments.filter((apt: any) => 
          apt.status === "cancelled" || apt.status === "rejected"
        ).length;
        
        setStats({ total, upcoming, completed, cancelled, pending });
        setRecentAppointments(appointments.slice(0, 5));
        
        // For doctors, filter pending appointments
        if (user.currentRole === "doctor") {
          const pendingApts = appointments.filter((apt: any) => apt.status === "pending");
          setPendingAppointments(pendingApts);
        }
      }

      // Fetch notifications
      const role = user.currentRole === "doctor" ? "doctor" : "user";
      const notifs = await getNotifications(user.id, role);
      setNotifications(notifs.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id, user?.currentRole]);

  const handleApprove = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    const success = await approveAppointment(appointmentId);
    if (success) {
      alert("Appointment approved successfully!");
      fetchDashboardData();
    } else {
      alert("Failed to approve appointment. Please try again.");
    }
    setActionLoading(null);
  };

  const handleReject = async (appointmentId: string) => {
    const reason = prompt("Please provide a reason for rejection (optional):");
    setActionLoading(appointmentId);
    const success = await rejectAppointment(appointmentId, reason || undefined);
    if (success) {
      alert("Appointment rejected.");
      fetchDashboardData();
    } else {
      alert("Failed to reject appointment. Please try again.");
    }
    setActionLoading(null);
  };

  if (!user) return null;

  const quickActions: QuickAction[] = [
    {
      title: "Book Appointment",
      description: "Find and book with top doctors",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      path: "/browse-hospitals",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "My Appointments",
      description: "View and manage your bookings",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      path: "/appointments",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      title: "Medical Records",
      description: "Access your health history",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      path: "/medical-records",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      title: "My Profile",
      description: "Update your information",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      path: "/profile",
      gradient: "from-orange-500 to-amber-500",
    },
  ];

  const statCards = [
    {
      title: "Total Appointments",
      value: stats.total,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: "bg-blue-500",
      bgLight: "bg-blue-50",
    },
    {
      title: "Upcoming",
      value: stats.upcoming,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "bg-emerald-500",
      bgLight: "bg-emerald-50",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "bg-purple-500",
      bgLight: "bg-purple-50",
    },
    {
      title: "Cancelled",
      value: stats.cancelled,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "bg-red-500",
      bgLight: "bg-red-50",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "scheduled":
      case "upcoming":
      case "pending":
        return "bg-blue-100 text-blue-700";
      case "confirmed":
      case "approved":
        return "bg-emerald-100 text-emerald-700";
      case "completed":
        return "bg-purple-100 text-purple-700";
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-300">
      {/* Doctor Mode Reminder Banner */}
      {user?.userType === "doctor" && user?.currentRole === "user" && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-300">You're viewing as a Patient</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">Switch to Doctor mode in the sidebar to see and manage appointment requests.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {loading ? (
                    <span className="inline-block w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.bgLight} dark:bg-gray-700 flex items-center justify-center`}>
                <div className={`${stat.color} bg-clip-text text-transparent`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className="group p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white`}>
                {action.icon}
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mt-3">{action.title}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Appointments */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Recent Appointments</h3>
            <button 
              onClick={() => navigate("/appointments")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              View All →
            </button>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : recentAppointments.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-medium">No appointments yet</p>
              <p className="text-sm mt-1">Book your first appointment to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((apt, idx) => (
                <div
                  key={apt.id || idx}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => navigate("/appointments")}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                    {apt.doctor_name?.charAt(0) || "D"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {apt.doctor_name || "Doctor"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {apt.hospital_name || "Hospital"} • {new Date(apt.appointment_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(apt.status)}`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide\">Notifications</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {notifications.filter((n) => !n.read).length} unread
            </span>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif, idx) => (
                <div
                  key={notif.id || idx}
                  className={`p-3 rounded-xl transition-colors ${
                    !notif.read ? "bg-blue-50 dark:bg-blue-900/30" : "bg-gray-50 dark:bg-gray-700/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      notif.type?.includes("confirmed") ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400" :
                      notif.type?.includes("cancelled") || notif.type?.includes("rejected") ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400" :
                      "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                    }`}>
                      {notif.type?.includes("confirmed") ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : notif.type?.includes("cancelled") || notif.type?.includes("rejected") ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{notif.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
