import { useState, useEffect } from "react";
import { useAppointment, Notification } from "../context/AppointmentContext";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/api";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onAction: (action: 'approve' | 'reject', reason?: string) => void;
}

interface DetailedNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
  appointmentId?: string;
  appointment?: any;
}

function AppointmentModal({ isOpen, onClose, appointment, onAction }: AppointmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!isOpen || !appointment) return null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onAction('approve');
      setLoading(false);
      onClose();
    } catch (error) {
      setLoading(false);
      alert("Failed to approve appointment");
    }
  };

  const handleReject = async () => {
    const reason = prompt("Please provide a reason for rejection (optional):");
    setLoading(true);
    try {
      await onAction('reject', reason || undefined);
      setLoading(false);
      onClose();
    } catch (error) {
      setLoading(false);
      alert("Failed to reject appointment");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Appointment Request</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Patient Information */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Patient Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-700 font-medium">Name</p>
              <p className="text-lg font-semibold text-blue-900">{appointment.patient_info?.name || "Unknown Patient"}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Patient ID</p>
              <p className="text-lg font-semibold text-blue-900">{appointment.patient_info?.id || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Email</p>
              <p className="text-base text-blue-800">{appointment.patient_info?.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Mobile</p>
              <p className="text-base text-blue-800">{appointment.patient_info?.mobile || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Appointment Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 font-medium">Date & Time</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(appointment.appointment_date || appointment.date).toLocaleDateString()} at{' '}
                {new Date(appointment.appointment_date || appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Consultation Type</p>
              <p className="text-lg font-semibold text-gray-900">{appointment.consultation_type || "In-Person"}</p>
            </div>
          </div>

          {appointment.notes && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 font-medium">Notes</p>
              <p className="text-base text-gray-800 bg-gray-50 p-3 rounded-lg">{appointment.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
            disabled={loading}
          >
            Close
          </button>
          <button
            onClick={handleReject}
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Processing..." : "❌ Reject"}
          </button>
          <button
            onClick={handleApprove}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Processing..." : "✅ Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailedNotificationView({ 
  isOpen,
  notification, 
  onClose, 
  onMarkRead, 
  onAction,
  currentUserId
}: { 
  isOpen: boolean;
  notification: DetailedNotification; 
  onClose: () => void; 
  onMarkRead: () => void;
  onAction: (action: 'approve' | 'reject', reason?: string) => void;
  currentUserId: string;
}) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !notification) return null;

  // SIMPLE RULE: Only show Approve/Reject buttons when:
  // Notification title is EXACTLY "New Appointment Request"
  // 
  // Do NOT show buttons for "Appointment Requested" (patient's booking confirmation)
  const shouldShowApproveReject = notification.title === "New Appointment Request";

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onAction('approve');
      setLoading(false);
      onClose();
    } catch (error) {
      setLoading(false);
      alert("Failed to approve appointment");
    }
  };

  const handleReject = async () => {
    const reason = prompt("Please provide a reason for rejection (optional):");
    setLoading(true);
    try {
      await onAction('reject', reason || undefined);
      setLoading(false);
      onClose();
    } catch (error) {
      setLoading(false);
      alert("Failed to reject appointment");
    }
  };

  const handleMarkRead = async () => {
    try {
      await onMarkRead();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{notification.title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(notification.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            {!notification.read && (
              <button
                onClick={handleMarkRead}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full hover:bg-blue-200 transition"
              >
                Mark as Read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Notification Content */}
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <h3 className="text-lg font-bold text-gray-900">Notification Details</h3>
          </div>
          <p className="text-gray-800 text-lg leading-relaxed">{notification.message}</p>
          <div className="mt-4 flex gap-2">
            <span className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-full shadow-md">
              {notification.type}
            </span>
            {!notification.read && (
              <span className="px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-full shadow-md animate-bounce">
                Unread
              </span>
            )}
          </div>
        </div>

        {/* Appointment Information (if available) */}
        {notification.appointment && (
          <>
            {/* Patient Information */}
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Patient Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Name</p>
                  <p className="text-lg font-semibold text-blue-900">{notification.appointment.patient_info?.name || "Unknown Patient"}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">Patient ID</p>
                  <p className="text-lg font-semibold text-blue-900">{notification.appointment.patient_info?.id || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">Email</p>
                  <p className="text-base text-blue-800">{notification.appointment.patient_info?.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">Mobile</p>
                  <p className="text-base text-blue-800">{notification.appointment.patient_info?.mobile || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Appointment Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Date & Time</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(notification.appointment.appointment_date || notification.appointment.date).toLocaleDateString()} at{' '}
                    {new Date(notification.appointment.appointment_date || notification.appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Consultation Type</p>
                  <p className="text-lg font-semibold text-gray-900">{notification.appointment.consultation_type || "In-Person"}</p>
                </div>
              </div>

              {notification.appointment.notes && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 font-medium">Notes</p>
                  <p className="text-base text-gray-800 bg-gray-50 p-3 rounded-lg">{notification.appointment.notes}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onClose}
            className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-bold text-lg rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all transform hover:scale-105 shadow-lg"
            disabled={loading}
          >
            Close
          </button>
          {/* Only show Approve/Reject if appointment exists AND this is a receiving doctor notification */}
          {notification.appointment && shouldShowApproveReject && (
            <>
              <button
                onClick={handleReject}
                className="px-8 py-4 bg-red-600 text-white font-bold text-lg rounded-xl hover:bg-red-700 hover:scale-105 transition-all shadow-lg transform hover:shadow-xl"
                disabled={loading}
              >
                {loading ? "Processing..." : "❌ Reject"}
              </button>
              <button
                onClick={handleApprove}
                className="px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-xl hover:bg-green-700 hover:scale-105 transition-all shadow-lg transform hover:shadow-xl"
                disabled={loading}
              >
                {loading ? "Processing..." : "✅ Approve"}
              </button>
            </>
          )}
          {/* Show info message if user booked this appointment (patient notification) */}
          {notification.appointment && !shouldShowApproveReject && (
            <div className="px-6 py-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
              <p className="font-medium">📋 This is your appointment booking</p>
              <p className="text-sm mt-1">Waiting for doctor's approval</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DoctorNotifications() {
  const { getNotifications } = useAppointment();
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailedViewOpen, setDetailedViewOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<DetailedNotification | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'unread'>('new');

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user?.id) {
        setLoading(true);
        try {
          const data = await getNotifications(user.id, "doctor");
          setNotifications(data);
        } catch (error) {
          console.error("Failed to fetch notifications:", error);
          setNotifications([]);
        }
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [user?.id, getNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark notification as read
      await apiClient.markNotificationRead(notification.id);

      // Try to get appointment details
      const appointments: any[] = await apiClient.getAppointments() as any[];
      
      // Find the appointment that matches this notification
      let appointment = null;
      if (notification.appointmentId) {
        appointment = appointments.find((apt: any) => apt.id === notification.appointmentId);
      } else {
        // Fallback: look for pending appointment (simplified approach)
        appointment = appointments.find((apt: any) => apt.status === 'pending');
      }

      // Create detailed notification object
      const detailedNotification: DetailedNotification = {
        id: notification.id,
        title: notification.title || "Notification",
        message: notification.message,
        type: notification.type || "general",
        createdAt: notification.createdAt,
        read: true, // Mark as read since we're viewing it
        appointmentId: notification.appointmentId || undefined,
        appointment: appointment
      };

      setSelectedNotification(detailedNotification);
      setDetailedViewOpen(true);
    } catch (error) {
      console.error("Failed to load notification details:", error);
      alert("Failed to load notification details.");
    }
  };

  const handleAppointmentAction = async (action: 'approve' | 'reject', reason?: string) => {
    if (!selectedNotification?.appointment) return;

    try {
      if (action === 'approve') {
        await apiClient.approveAppointment(selectedNotification.appointment.id);
        alert("Appointment approved successfully!");
      } else {
        await apiClient.rejectAppointment(selectedNotification.appointment.id, reason);
        alert("Appointment rejected successfully!");
      }

      // Refresh notifications
      const data = await getNotifications(user?.id || "", "doctor");
      setNotifications(data);

      // Close modal
      setDetailedViewOpen(false);
      setSelectedNotification(null);
    } catch (error) {
      console.error(`Failed to ${action} appointment:`, error);
      alert(`Failed to ${action} appointment. Please try again.`);
    }
  };

  const handleMarkRead = async () => {
    if (!selectedNotification) return;
    
    try {
      await apiClient.markNotificationRead(selectedNotification.id);
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === selectedNotification.id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      alert("Failed to mark notification as read.");
    }
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'new') {
      // Show all notifications (newest first)
      return true;
    } else if (activeTab === 'unread') {
      // Show only unread notifications
      return !notification.read;
    }
    return true;
  });

  // Sort notifications by creation date (newest first)
  const sortedNotifications = filteredNotifications.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (!user || user.currentRole !== "doctor") return null;

  return (
    <>
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Doctor Notifications</h2>
          <div className="text-sm text-gray-600">
            {sortedNotifications.length} {activeTab === 'unread' ? 'unread' : ''} notification{sortedNotifications.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('new')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'new'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Notifications
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'unread'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Unread Only
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading notifications...</div>
        ) : sortedNotifications.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <div className="font-medium">No {activeTab === 'unread' ? 'unread ' : ''}notifications</div>
            <div className="text-sm text-gray-600 mt-1">
              {activeTab === 'unread' 
                ? "All your notifications have been read!" 
                : "You don't have any notifications yet."}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedNotifications.map((n) => (
              <div
                key={n.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  !n.read ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{n.title}</h3>
                    <p className="text-gray-700 text-sm line-clamp-2">{n.message}</p>
                  </div>
                  {!n.read && (
                    <div className="flex items-center gap-2 ml-4">
                      <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                      <span className="text-xs text-blue-600 font-medium">NEW</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <div className="flex gap-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      {n.type}
                    </span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotificationClick(n);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AppointmentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onAction={handleAppointmentAction}
      />

      <DetailedNotificationView
        isOpen={detailedViewOpen}
        onClose={() => {
          setDetailedViewOpen(false);
          setSelectedNotification(null);
        }}
        notification={selectedNotification!}
        onMarkRead={handleMarkRead}
        onAction={handleAppointmentAction}
        currentUserId={user?.id || ""}
      />
    </>
  );
}
