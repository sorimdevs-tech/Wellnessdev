import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/api";

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  userId: string;
  userName: string;
  date: string;
  time: string;
  duration: string;
  reason?: string;
  status: "pending" | "confirmed" | "approved" | "completed" | "cancelled" | "rejected";
  createdAt: string;
  patient_info?: {
    id: string;
    name: string;
    email?: string;
    mobile?: string;
  };
}

export interface Notification {
  id: string;
  type: "appointment_booked" | "appointment_confirmed" | "appointment_cancelled" | "appointment" | "general" | string;
  title: string;
  message: string;
  recipientId: string;
  recipientType: "user" | "doctor";
  appointmentId?: string;
  read: boolean;
  createdAt: string;
}

interface AppointmentContextType {
  appointments: Appointment[];
  notifications: Notification[];
  loading: boolean;
  fetchAppointments: () => Promise<void>;
  bookAppointment: (
    doctorId: string,
    doctorName: string,
    doctorSpecialty: string,
    userId: string,
    userName: string,
    date: string,
    time: string,
    duration: string,
    reason: string
  ) => void;
  confirmAppointment: (appointmentId: string) => void;
  approveAppointment: (appointmentId: string) => Promise<boolean>;
  rejectAppointment: (appointmentId: string, reason?: string) => Promise<boolean>;
  cancelAppointment: (appointmentId: string) => void;
  getNotifications: (userId: string, userType: "user" | "doctor") => Promise<Notification[]>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  clearNotifications: (userId: string, userType: "user" | "doctor") => void;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(
  undefined
);

export function AppointmentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.getAppointments();
      if (response && Array.isArray(response)) {
        // Map API response to frontend Appointment interface
        const mappedAppointments: Appointment[] = response.map((apt: any) => ({
          id: apt._id || apt.id,
          doctorId: apt.doctor_id || apt.doctorId,
          doctorName: apt.doctor_name || apt.doctorName || "Doctor",
          doctorSpecialty: apt.doctor_specialty || apt.doctorSpecialty || "General",
          userId: apt.patient_id || apt.userId,
          userName: apt.patient_info?.name || apt.userName || "Patient",
          date: apt.appointment_date ? new Date(apt.appointment_date).toLocaleDateString() : apt.date,
          time: apt.appointment_date ? new Date(apt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : apt.time,
          duration: apt.duration || "30 mins",
          reason: apt.notes || apt.reason || "",
          status: apt.status || "pending",
          createdAt: apt.createdAt || new Date().toISOString(),
          patient_info: apt.patient_info,
        }));
        setAppointments(mappedAppointments);
        console.log("📅 Fetched appointments from API:", mappedAppointments.length);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      // Fallback to localStorage
      const savedAppointments = localStorage.getItem("appointments");
      if (savedAppointments) {
        try {
          setAppointments(JSON.parse(savedAppointments));
        } catch (e) {
          console.error("Failed to load appointments from localStorage:", e);
        }
      }
    }
    setLoading(false);
  }, []);

  // Load from localStorage on mount and fetch from API
  useEffect(() => {
    const savedNotifications = localStorage.getItem("notifications");

    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (e) {
        console.error("Failed to load notifications:", e);
      }
    }

    // Fetch appointments from API
    fetchAppointments();
  }, [fetchAppointments]);

  // Save appointments to localStorage
  useEffect(() => {
    localStorage.setItem("appointments", JSON.stringify(appointments));
  }, [appointments]);

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  const bookAppointment = (
    doctorId: string,
    doctorName: string,
    doctorSpecialty: string,
    userId: string,
    userName: string,
    date: string,
    time: string,
    duration: string,
    reason: string
  ) => {
    const appointmentId = `apt_${Date.now()}`;
    const newAppointment: Appointment = {
      id: appointmentId,
      doctorId,
      doctorName,
      doctorSpecialty,
      userId,
      userName,
      date,
      time,
      duration,
      reason,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setAppointments((prev) => [...prev, newAppointment]);

    // Create notification for doctor
    const doctorNotification: Notification = {
      id: `notif_${Date.now()}_doctor`,
      type: "appointment_booked",
      title: "New Appointment Request",
      message: `${userName} has requested an appointment on ${date} at ${time} for ${reason}`,
      recipientId: doctorId,
      recipientType: "doctor",
      appointmentId,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Create notification for user
    const userNotification: Notification = {
      id: `notif_${Date.now()}_user`,
      type: "appointment_booked",
      title: "Appointment Requested",
      message: `Your appointment with Dr. ${doctorName} has been requested for ${date} at ${time}. Awaiting confirmation.`,
      recipientId: userId,
      recipientType: "user",
      appointmentId,
      read: false,
      createdAt: new Date().toISOString(),
    };

    console.log("📋 BOOKING APPOINTMENT:", {
      appointmentId,
      doctorId,
      userId,
      doctorNotification,
      userNotification,
    });

    setNotifications((prev) => [doctorNotification, userNotification, ...prev]);
  };

  const confirmAppointment = (appointmentId: string) => {
    // Find appointment first before updating state
    const appointmentToConfirm = appointments.find((apt) => apt.id === appointmentId);
    if (!appointmentToConfirm) return;

    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId ? { ...apt, status: "confirmed" } : apt
      )
    );

    // Notification for user
    const userNotification: Notification = {
      id: `notif_${Date.now()}_confirmed_user`,
      type: "appointment_confirmed",
      title: "Appointment Confirmed",
      message: `Your appointment with Dr. ${appointmentToConfirm.doctorName} on ${appointmentToConfirm.date} at ${appointmentToConfirm.time} has been confirmed!`,
      recipientId: appointmentToConfirm.userId,
      recipientType: "user",
      appointmentId,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => [userNotification, ...prev]);
  };

  // Approve appointment via API
  const approveAppointment = async (appointmentId: string): Promise<boolean> => {
    try {
      await apiClient.approveAppointment(appointmentId);
      // Update local state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: "approved" } : apt
        )
      );
      // Refresh appointments to get latest data
      await fetchAppointments();
      return true;
    } catch (error) {
      console.error("Failed to approve appointment:", error);
      return false;
    }
  };

  // Reject appointment via API
  const rejectAppointment = async (appointmentId: string, reason?: string): Promise<boolean> => {
    try {
      await apiClient.rejectAppointment(appointmentId, reason);
      // Update local state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: "rejected" } : apt
        )
      );
      // Refresh appointments to get latest data
      await fetchAppointments();
      return true;
    } catch (error) {
      console.error("Failed to reject appointment:", error);
      return false;
    }
  };

  const cancelAppointment = (appointmentId: string) => {
    // Find appointment first before updating state
    const appointmentToCancel = appointments.find((apt) => apt.id === appointmentId);
    if (!appointmentToCancel) return;

    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId ? { ...apt, status: "cancelled" } : apt
      )
    );

    // Notification for user
    const userNotification: Notification = {
      id: `notif_${Date.now()}_cancelled_user`,
      type: "appointment_cancelled",
      title: "Appointment Cancelled",
      message: `Your appointment with Dr. ${appointmentToCancel.doctorName} on ${appointmentToCancel.date} at ${appointmentToCancel.time} has been cancelled.`,
      recipientId: appointmentToCancel.userId,
      recipientType: "user",
      appointmentId,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => [userNotification, ...prev]);
  };

  const getNotifications = async (
    userId: string,
    userType: "user" | "doctor"
  ): Promise<Notification[]> => {
    try {
      const apiNotifications = await apiClient.getNotifications();
      if (apiNotifications && Array.isArray(apiNotifications)) {
        // Convert API response to our Notification interface
        const formattedNotifications: Notification[] = apiNotifications.map((notif: any) => ({
          id: notif.id || notif._id,
          type: notif.type || "general",
          title: notif.title || "Notification",
          message: notif.message || "",
          recipientId: notif.user_id || userId,
          recipientType: notif.user_type || userType,
          appointmentId: notif.appointmentId,
          read: notif.read || false,
          createdAt: notif.createdAt || new Date().toISOString(),
        }));

        console.log("🔔 GET NOTIFICATIONS (API):", {
          userId,
          userType,
          apiNotificationsCount: apiNotifications.length,
          formattedCount: formattedNotifications.length,
        });

        return formattedNotifications;
      }
    } catch (error) {
      console.error("Failed to fetch notifications from API:", error);
    }

    // Fallback to localStorage if API fails
    const filtered = notifications.filter(
      (notif) => notif.recipientId === userId && notif.recipientType === userType
    );
    console.log("🔔 GET NOTIFICATIONS (Fallback):", {
      userId,
      userType,
      totalNotifications: notifications.length,
      filteredCount: filtered.length,
    });
    return filtered;
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      // Call backend API to mark notification as read
      await apiClient.markNotificationRead(notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      // Still update local state even if API fails
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    }
  };

  const clearNotifications = (userId: string, userType: "user" | "doctor") => {
    setNotifications((prev) =>
      prev.filter(
        (notif) =>
          !(
            notif.recipientId === userId &&
            notif.recipientType === userType
          )
      )
    );
  };

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        notifications,
        loading,
        fetchAppointments,
        bookAppointment,
        confirmAppointment,
        approveAppointment,
        rejectAppointment,
        cancelAppointment,
        getNotifications,
        markNotificationAsRead,
        clearNotifications,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointment() {
  const context = useContext(AppointmentContext);
  if (context === undefined) {
    throw new Error(
      "useAppointment must be used within AppointmentProvider"
    );
  }
  return context;
}
