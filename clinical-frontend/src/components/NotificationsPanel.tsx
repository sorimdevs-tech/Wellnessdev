import { useState, useEffect } from "react";
import { useAppointment, Notification } from "../context/AppointmentContext";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userType: "user" | "doctor";
}

export default function NotificationsPanel({
  isOpen,
  onClose,
  userId,
  userType,
}: NotificationsPanelProps) {
  const navigate = useNavigate();
  const { getNotifications, markNotificationAsRead, clearNotifications, approveAppointment, rejectAppointment } =
    useAppointment();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [appointmentDetails, setAppointmentDetails] = useState<Record<string, any>>({});
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingAppointmentId, setRejectingAppointmentId] = useState<string | null>(null);
  const [rejectingNotificationId, setRejectingNotificationId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const fetchNotifications = async () => {
      if (userId && userType) {
        setLoading(true);
        try {
          const data = await getNotifications(userId, userType);
          setNotifications(data);
          
          // Fetch appointment details for notifications that have appointmentId
          if (userType === "doctor") {
            const appointments = await apiClient.getAppointments() as any[];
            const aptMap: Record<string, any> = {};
            if (Array.isArray(appointments)) {
              appointments.forEach((apt: any) => {
                aptMap[apt.id || apt._id] = apt;
              });
            }
            setAppointmentDetails(aptMap);
          }
        } catch (error) {
          console.error("Failed to fetch notifications:", error);
          setNotifications([]);
        }
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [userId, userType, getNotifications]);

  const refreshNotifications = async () => {
    if (userId && userType) {
      const data = await getNotifications(userId, userType);
      setNotifications(data);
      if (userType === "doctor") {
        const appointments = await apiClient.getAppointments() as any[];
        const aptMap: Record<string, any> = {};
        if (Array.isArray(appointments)) {
          appointments.forEach((apt: any) => {
            aptMap[apt.id || apt._id] = apt;
          });
        }
        setAppointmentDetails(aptMap);
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  const handleClearAll = () => {
    clearNotifications(userId, userType);
  };

  const handleApprove = async (appointmentId: string, notificationId: string) => {
    setActionLoading(appointmentId);
    try {
      const success = await approveAppointment(appointmentId);
      if (success) {
        handleMarkAsRead(notificationId);
        await refreshNotifications();
        alert("✅ Appointment approved successfully!");
      } else {
        alert("Failed to approve appointment. Please make sure you're in Doctor mode.");
      }
    } catch (error) {
      console.error("Failed to approve:", error);
      alert("Failed to approve appointment.");
    }
    setActionLoading(null);
  };

  const handleReject = async (appointmentId: string, notificationId: string) => {
    setRejectingAppointmentId(appointmentId);
    setRejectingNotificationId(notificationId);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingAppointmentId || !rejectingNotificationId) return;

    setActionLoading(rejectingAppointmentId);
    try {
      const success = await rejectAppointment(rejectingAppointmentId, rejectionReason || undefined);
      if (success) {
        handleMarkAsRead(rejectingNotificationId);
        await refreshNotifications();
        alert("✅ Appointment rejected successfully.\nThe patient has been notified with the rejection reason.");
        setShowRejectDialog(false);
        setRejectingAppointmentId(null);
        setRejectingNotificationId(null);
        setRejectionReason("");
      } else {
        alert("❌ Failed to reject appointment. Please make sure you're in Doctor mode.");
      }
    } catch (error) {
      console.error("Failed to reject:", error);
      alert("❌ Failed to reject appointment.");
    }
    setActionLoading(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    
    // If it's an appointment notification and user is a doctor, navigate to dashboard
    if (notification.appointmentId && userType === "doctor") {
      onClose();
      navigate("/?section=pending");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment_booked":
        return "bg-blue-100 text-blue-600";
      case "appointment_confirmed":
        return "bg-green-100 text-green-600";
      case "appointment_cancelled":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const formatTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const extractAppointmentTime = (message: string): string | null => {
    // Extract appointment date/time from message like "December 29, 2025 at 03:33 PM"
    const timeMatch = message.match(/(\w+ \d{1,2}, \d{4}) at (\d{1,2}:\d{2} (?:AM|PM))/);
    if (timeMatch) {
      return `${timeMatch[1]} at ${timeMatch[2]}`;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl flex flex-col z-[9999]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                className="w-12 h-12 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification: Notification) => {
                const appointment = notification.appointmentId 
                  ? appointmentDetails[notification.appointmentId] 
                  : null;
                
                const appointmentIsPending = appointment ? appointment.status === "pending" : true;
                
                // SIMPLE RULE: Only show Approve/Reject buttons when:
                // 1. User is a doctor
                // 2. Notification title is EXACTLY "New Appointment Request"
                // 3. Appointment is pending
                // 
                // Do NOT show buttons for "Appointment Requested" (patient's booking confirmation)
                // ONLY show for "New Appointment Request" (receiving doctor) - NOT for "Appointment Requested" (patient who booked)
                const isPendingAppointment = userType === "doctor" && 
                                             notification.title === "New Appointment Request" &&
                                             appointmentIsPending;
                const isAppointmentNotification = notification.type === "appointment" || notification.appointmentId;

                return (
                  <div
                    key={notification.id}
                    className={`p-4 transition ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                  >
                    <div 
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isPendingAppointment 
                            ? "bg-amber-100 text-amber-600" 
                            : notification.title.includes("Completed")
                            ? "bg-green-100 text-green-600"
                            : notification.title.includes("Missed")
                            ? "bg-red-100 text-red-600"
                            : getNotificationIcon(notification.type)
                        }`}
                      >
                        {notification.title.includes("Completed") ? (
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                            />
                          </svg>
                        ) : notification.title.includes("Missed") ? (
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"
                            />
                          </svg>
                        ) : isAppointmentNotification ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          {notification.title.includes("Completed") && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              ✓ Completed
                            </span>
                          )}
                          {notification.title.includes("Missed") && (
                            <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                              ✗ Missed
                            </span>
                          )}
                          {isPendingAppointment && (
                            <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                              ⏳ Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        
                        {/* Patient Info for doctors */}
                        {isPendingAppointment && appointment?.patient_info && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs font-medium text-blue-800">
                              Patient: {appointment.patient_info.name}
                            </p>
                            <p className="text-xs text-blue-600">
                              {new Date(appointment.appointment_date).toLocaleDateString()} at{" "}
                              {new Date(appointment.appointment_date).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-2">
                          {notification.title.includes("Completed") || 
                           notification.title.includes("Missed") || 
                           notification.title.includes("Rejected")
                            ? extractAppointmentTime(notification.message) || formatTime(notification.createdAt)
                            : formatTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>

                    {/* Approve/Reject Buttons for Doctor - Pending Appointments */}
                    {isPendingAppointment && notification.appointmentId && (
                      <div className="flex gap-2 mt-3 ml-13 pl-13">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(notification.appointmentId!, notification.id);
                          }}
                          disabled={actionLoading === notification.appointmentId}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === notification.appointmentId ? (
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
                            handleReject(notification.appointmentId!, notification.id);
                          }}
                          disabled={actionLoading === notification.appointmentId}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === notification.appointmentId ? (
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

                    {/* View Details link for other notifications */}
                    {isAppointmentNotification && !isPendingAppointment && userType === "doctor" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          navigate("/appointments");
                        }}
                        className="mt-2 ml-13 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Appointments →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleClearAll}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold transition"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* REJECTION DIALOG */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
              <span className="text-2xl">⚠️</span> Reject Appointment
            </h3>
            
            <p className="mb-4 text-gray-600">
              Please provide a reason for rejection (optional):
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Scheduling conflict, Medical emergency, Unable to conduct appointment..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none placeholder-gray-400"
              rows={4}
            />

            <p className="text-xs mt-2 text-gray-500">
              The patient will receive a notification with your rejection reason.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectingAppointmentId(null);
                  setRejectingNotificationId(null);
                  setRejectionReason("");
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading === rejectingAppointmentId}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === rejectingAppointmentId ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Rejecting...
                  </span>
                ) : (
                  "Confirm Rejection"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
