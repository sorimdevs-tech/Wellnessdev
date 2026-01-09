import { useState, useEffect, useCallback } from "react";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { useAppointment } from "../context/AppointmentContext";
import { apiClient } from "../services/api";

interface UpcomingAppointment {
  id: string;
  doctorName: string;
  patientName?: string;
  date: string;
  time: string;
  consultationType: string;
  hospital?: string;
  specialty?: string;
  minutesUntil: number;
}

interface ReminderNotification {
  id: string;
  appointment: UpcomingAppointment;
  reminderType: "15min" | "10min" | "5min";
  snoozed: boolean;
  shown: boolean;
}

export default function AppointmentReminder() {
  const { user } = useUser();
  const { theme } = useTheme();
  const { cancelAppointment } = useAppointment();
  const isDark = theme === "dark";
  
  const [reminders, setReminders] = useState<ReminderNotification[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingReminder, setRejectingReminder] = useState<ReminderNotification | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [rejecting, setRejecting] = useState(false);
  
  // Track which reminders have been shown to avoid duplicates
  const [shownReminders, setShownReminders] = useState<Set<string>>(new Set());

  // Check for upcoming appointments
  const checkUpcomingAppointments = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const appointments = await apiClient.getAppointments();
      if (!Array.isArray(appointments)) return;
      
      const now = new Date();
      const newReminders: ReminderNotification[] = [];
      
      appointments.forEach((apt: any) => {
        // Only check approved/scheduled appointments
        if (!["approved", "scheduled", "upcoming"].includes(apt.status)) return;
        
        // Parse appointment datetime
        let appointmentDate: Date;
        if (apt.appointment_date) {
          appointmentDate = new Date(apt.appointment_date);
        } else if (apt.date && apt.time) {
          const dateStr = apt.date.includes("T") ? apt.date.split("T")[0] : apt.date;
          appointmentDate = new Date(`${dateStr}T${apt.time}`);
        } else {
          return;
        }
        
        // Calculate minutes until appointment
        const minutesUntil = Math.floor((appointmentDate.getTime() - now.getTime()) / (1000 * 60));
        
        // Check for 15, 10, 5 minute reminders
        const reminderThresholds: Array<{ minutes: number; type: "15min" | "10min" | "5min" }> = [
          { minutes: 15, type: "15min" },
          { minutes: 10, type: "10min" },
          { minutes: 5, type: "5min" },
        ];
        
        reminderThresholds.forEach(({ minutes, type }) => {
          // Show reminder if within 1 minute of threshold (e.g., 14-15 mins for 15min reminder)
          if (minutesUntil <= minutes && minutesUntil > minutes - 2 && minutesUntil > 0) {
            const reminderId = `${apt._id || apt.id}-${type}`;
            
            // Don't show if already shown
            if (shownReminders.has(reminderId)) return;
            
            const upcomingApt: UpcomingAppointment = {
              id: apt._id || apt.id,
              doctorName: apt.doctor_name || apt.doctorName || "Doctor",
              patientName: apt.patient_info?.name || apt.patient_name || "Patient",
              date: appointmentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
              time: apt.time || appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              consultationType: apt.consultation_type || apt.consultationType || "In-Person",
              hospital: apt.hospital_name || apt.hospital,
              specialty: apt.specialty || apt.doctor_specialty,
              minutesUntil,
            };
            
            newReminders.push({
              id: reminderId,
              appointment: upcomingApt,
              reminderType: type,
              snoozed: false,
              shown: true,
            });
          }
        });
      });
      
      if (newReminders.length > 0) {
        // Mark these as shown
        setShownReminders(prev => {
          const updated = new Set(prev);
          newReminders.forEach(r => updated.add(r.id));
          return updated;
        });
        
        // Add new reminders
        setReminders(prev => [...prev, ...newReminders]);
        
        // Play notification sound
        playNotificationSound();
      }
    } catch (error) {
      console.error("Error checking appointments:", error);
    }
  }, [user?.id, shownReminders]);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Browser may block autoplay
      });
    } catch (e) {
      // Audio not available
    }
  };

  // Check appointments every 30 seconds
  useEffect(() => {
    checkUpcomingAppointments();
    const interval = setInterval(checkUpcomingAppointments, 30000);
    return () => clearInterval(interval);
  }, [checkUpcomingAppointments]);

  // Handle snooze - silence this notification
  const handleSnooze = (reminderId: string) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId));
  };

  // Handle close - just close the notification
  const handleClose = (reminderId: string) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId));
  };

  // Handle reject - open modal for rejection reason
  const handleRejectClick = (reminder: ReminderNotification) => {
    setRejectingReminder(reminder);
    setRejectionMessage("");
    setShowRejectModal(true);
  };

  // Confirm rejection
  const handleConfirmReject = async () => {
    if (!rejectingReminder) return;
    
    setRejecting(true);
    try {
      // Call API to reject/cancel the appointment with reason
      const reason = rejectionMessage || "Appointment cancelled at the last minute";
      await apiClient.rejectAppointment(rejectingReminder.appointment.id, reason);
      
      // Remove the reminder
      setReminders(prev => prev.filter(r => r.id !== rejectingReminder.id));
      setShowRejectModal(false);
      setRejectingReminder(null);
      setRejectionMessage("");
    } catch (error) {
      console.error("Failed to reject appointment:", error);
    } finally {
      setRejecting(false);
    }
  };

  // Get reminder badge color
  const getReminderColor = (type: string) => {
    switch (type) {
      case "5min":
        return "bg-red-500";
      case "10min":
        return "bg-orange-500";
      case "15min":
        return "bg-amber-500";
      default:
        return "bg-blue-500";
    }
  };

  // Get reminder text
  const getReminderText = (type: string) => {
    switch (type) {
      case "5min":
        return "Starting in 5 minutes!";
      case "10min":
        return "Starting in 10 minutes";
      case "15min":
        return "Starting in 15 minutes";
      default:
        return "Upcoming";
    }
  };

  if (reminders.length === 0 && !showRejectModal) return null;

  return (
    <>
      {/* Reminder Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-md">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className={`rounded-xl shadow-2xl overflow-hidden animate-slide-in ${
              isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
            }`}
          >
            {/* Header with urgency badge */}
            <div className={`${getReminderColor(reminder.reminderType)} px-4 py-2 flex items-center justify-between`}>
              <div className="flex items-center gap-2 text-white">
                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-sm">Appointment Reminder</span>
              </div>
              <span className="text-white text-xs font-medium px-2 py-0.5 bg-white/20 rounded-full">
                {getReminderText(reminder.reminderType)}
              </span>
            </div>
            
            {/* Appointment Details */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                  reminder.reminderType === "5min" ? "bg-red-500" : reminder.reminderType === "10min" ? "bg-orange-500" : "bg-amber-500"
                }`}>
                  {(user?.currentRole === "doctor" 
                    ? reminder.appointment.patientName 
                    : reminder.appointment.doctorName
                  )?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {user?.currentRole === "doctor" 
                      ? `Patient: ${reminder.appointment.patientName}`
                      : `Dr. ${reminder.appointment.doctorName}`
                    }
                  </h4>
                  {reminder.appointment.specialty && (
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {reminder.appointment.specialty}
                    </p>
                  )}
                  <div className={`mt-2 space-y-1 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {reminder.appointment.date}
                    </p>
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {reminder.appointment.time}
                    </p>
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {reminder.appointment.consultationType}
                    </p>
                    {reminder.appointment.hospital && (
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {reminder.appointment.hospital}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleSnooze(reminder.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isDark 
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  Snooze
                </button>
                <button
                  onClick={() => handleClose(reminder.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isDark 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Close
                </button>
                <button
                  onClick={() => handleRejectClick(reminder)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rejection Modal */}
      {showRejectModal && rejectingReminder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <div className={`rounded-2xl p-6 max-w-md w-full shadow-2xl ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Cancel Appointment?
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Last minute cancellation
                </p>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg mb-4 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
              <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                {user?.currentRole === "doctor" 
                  ? `Patient: ${rejectingReminder.appointment.patientName}`
                  : `Dr. ${rejectingReminder.appointment.doctorName}`
                }
              </p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {rejectingReminder.appointment.date} at {rejectingReminder.appointment.time}
              </p>
            </div>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Reason for cancellation (will be sent to {user?.currentRole === "doctor" ? "patient" : "doctor"})
              </label>
              <textarea
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                placeholder="e.g., Emergency situation, Unable to attend..."
                className={`w-full px-4 py-3 border rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  isDark 
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500" 
                    : "border-gray-300 placeholder-gray-400"
                }`}
                rows={3}
              />
            </div>
            
            <div className={`p-3 rounded-lg mb-4 ${isDark ? "bg-amber-900/30 border border-amber-700" : "bg-amber-50 border border-amber-200"}`}>
              <p className={`text-xs ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                ⚠️ This is a last-minute cancellation. The {user?.currentRole === "doctor" ? "patient" : "doctor"} will be notified immediately with your reason.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingReminder(null);
                  setRejectionMessage("");
                }}
                className={`flex-1 px-4 py-3 border font-semibold rounded-xl transition ${
                  isDark 
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700" 
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Keep Appointment
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={rejecting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Cancelling...
                  </span>
                ) : (
                  "Cancel Appointment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
