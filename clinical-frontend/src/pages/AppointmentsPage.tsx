import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { useAppointment } from "../context/AppointmentContext";
import BookingModal from "../components/BookingModal";
import { apiClient } from "../services/api";
import ChatBox from "../components/ChatBox";

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  department?: string;
  qualifications?: string[];
  experience_years?: string;
  hospital: string;
  date: string;
  time: string;
  rawDate?: Date; // For date comparison
  status: "pending" | "approved" | "scheduled" | "upcoming" | "completed" | "cancelled" | "rejected" | "missed" | "rescheduled";
  notes?: string;
  consultationType: "In-Person" | "Video Call" | "Phone";
  patientName?: string;
  patientId?: string;
  doctorId?: string; // For rescheduling
  isReceivingDoctor?: boolean; // True if current doctor is the receiving doctor (not the patient who booked)
  // Doctor info for completed appointments
  doctorProfileImage?: string;
  isVerified?: boolean;
  rating?: number;
  totalReviews?: number;
  // Feedback tracking
  hasFeedback?: boolean;
  feedbackRating?: number;
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { theme } = useTheme();
  const { getNotifications, confirmAppointment, cancelAppointment } = useAppointment();
  const isDark = theme === "dark";
  
  // View mode state - grid, list or calendar
  const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">("calendar");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const isDoctor = user?.userType === "doctor" || user?.currentRole === "doctor";
  
  // Sorting state for list view
  const [sortField, setSortField] = useState<"doctor" | "date" | "type" | "status" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const [activeTab, setActiveTab] = useState<"pending" | "upcoming" | "completed" | "missed" | "rejected" | "book" | "schedule">(
    // Default to "upcoming" tab
    "upcoming"
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<{
    id: string;
    name: string;
    specialty: string;
  } | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingAppointmentId, setRejectingAppointmentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Calendar view state
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(() => new Date());
  const [datePickerYear, setDatePickerYear] = useState(() => new Date().getFullYear());
  const [currentTime, setCurrentTime] = useState(new Date());
  const calendarGridRef = useRef<HTMLDivElement>(null);
  
  // Update current time every minute for the time indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);
  
  // Auto-scroll calendar to current time when view mode changes to calendar
  useEffect(() => {
    if (viewMode === "calendar" && calendarGridRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Only scroll if current hour is within visible range (8 AM - 8 PM)
      if (currentHour >= 8 && currentHour < 20) {
        const hourOffset = currentHour - 8;
        const minuteOffset = now.getMinutes() / 60;
        // Calculate scroll position: each hour slot is 64px, subtract some offset to show time above center
        const scrollPosition = (hourOffset + minuteOffset) * 64 - 100;
        
        // Smooth scroll to current time
        setTimeout(() => {
          calendarGridRef.current?.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [viewMode]);
  
  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackAppointment, setFeedbackAppointment] = useState<Appointment | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  
  // Document viewing state
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedAppointmentDocs, setSelectedAppointmentDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [selectedAppointmentForDocs, setSelectedAppointmentForDocs] = useState<Appointment | null>(null);

  // Fetch documents for an appointment
  const fetchAppointmentDocuments = async (appointment: Appointment) => {
    setDocsLoading(true);
    setSelectedAppointmentForDocs(appointment);
    try {
      const docs = await apiClient.getMedicalRecordsByAppointment(appointment.id);
      setSelectedAppointmentDocs(Array.isArray(docs) ? docs : []);
      setShowDocumentsModal(true);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      setSelectedAppointmentDocs([]);
      setShowDocumentsModal(true);
    } finally {
      setDocsLoading(false);
    }
  };

  // Submit feedback for completed appointment
  const submitFeedback = async () => {
    if (!feedbackAppointment || feedbackRating === 0) return;
    
    setFeedbackSubmitting(true);
    try {
      await apiClient.submitAppointmentFeedback(feedbackAppointment.id, {
        rating: feedbackRating,
        feedback: feedbackText,
        doctorId: feedbackAppointment.doctorId,
        mobile: user?.mobile || user?.phone, // Pass user's mobile number
      });
      
      // Update the appointment in local state to reflect feedback given
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === feedbackAppointment.id 
            ? { ...apt, hasFeedback: true, feedbackRating: feedbackRating } 
            : apt
        )
      );
      
      // Reset and close
      setFeedbackRating(0);
      setFeedbackText("");
      setFeedbackAppointment(null);
      setShowFeedbackModal(false);
      
      // Show success message
      alert("🎉 Thank you for your feedback! A confirmation email has been sent to you.");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // Get file icon based on type
  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📝';
    return '📎';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Set default tab based on user role
  useEffect(() => {
    if (user?.currentRole === "doctor") {
      setActiveTab("pending");
    }
  }, [user?.currentRole]);

  // Dummy data fallback
  const dummyAppointments: Appointment[] = [
    {
      id: "1",
      doctorName: "Dr. Rajesh Kumar",
      specialty: "Cardiology",
      hospital: "Fortis Malar Hospital",
      date: "Dec 20, 2024",
      time: "2:30 PM",
      status: "scheduled",
      consultationType: "In-Person",
      notes: "Regular checkup for heart condition",
    },
    {
      id: "2",
      doctorName: "Dr. Priya Singh",
      specialty: "Orthopedic",
      hospital: "Apollo Hospitals",
      date: "Dec 15, 2024",
      time: "10:00 AM",
      status: "upcoming",
      consultationType: "In-Person",
      notes: "Follow-up consultation",
    },
    {
      id: "3",
      doctorName: "Dr. Arjun Menon",
      specialty: "General Medicine",
      hospital: "SIMS Hospital",
      date: "Dec 10, 2024",
      time: "4:15 PM",
      status: "completed",
      consultationType: "Video Call",
      notes: "General health check",
    },
    {
      id: "4",
      doctorName: "Dr. Vikram Sharma",
      specialty: "Neurology",
      hospital: "Apollo Hospitals",
      date: "Dec 22, 2024",
      time: "11:00 AM",
      status: "scheduled",
      consultationType: "Phone",
      notes: "Consultation for headaches",
    },
    {
      id: "5",
      doctorName: "Dr. Anjali Roy",
      specialty: "Pediatrics",
      hospital: "Apollo Hospitals",
      date: "Dec 18, 2024",
      time: "3:00 PM",
      status: "upcoming",
      consultationType: "In-Person",
      notes: "Child wellness checkup",
    },
    {
      id: "6",
      doctorName: "Dr. Neha Gupta",
      specialty: "Dermatology",
      hospital: "SIMS Hospital",
      date: "Dec 05, 2024",
      time: "5:30 PM",
      status: "completed",
      consultationType: "In-Person",
      notes: "Skin treatment follow-up",
    },
  ];

  // Fetch appointments from API
  const fetchAppointments = async () => {
    setLoading(true);
    
    // Debug: Check user.id value
    console.log("[AppointmentsPage] User context:", { 
      id: user?.id, 
      name: user?.name, 
      currentRole: user?.currentRole,
      userType: user?.userType,
      fromLocalStorage: localStorage.getItem("userId")
    });
    
    if (!user?.id) {
      console.warn("[AppointmentsPage] No user.id found, skipping fetch");
      setAppointments([]);
      setLoading(false);
      return;
    }

    try {
      // Temporarily skip checkMissedAppointments to avoid 500 error blocking UI
      // await apiClient.checkMissedAppointments();
      // Fetch all appointments
      const apiData = await apiClient.getAppointments();

      if (apiData && Array.isArray(apiData)) {
        const formattedData: Appointment[] = apiData.map((a: any) => {
          const appointmentDate = new Date(a.appointment_date || a.date);
          const status = a.status || "scheduled";
          // Determine if current user is the receiving doctor (not the patient who booked)
          // patient_id is the person who booked, doctor_id is the receiving doctor
          // Compare as strings to avoid type mismatches
          const patientIdStr = String(a.patient_id || "");
          // Use user.id or fallback to localStorage directly
          const currentUserId = user?.id || localStorage.getItem("userId") || "";
          const userIdStr = String(currentUserId);
          const isReceivingDoctor = user?.currentRole === "doctor" && patientIdStr !== userIdStr && patientIdStr !== "" && userIdStr !== "";
          
          // Debug log for doctor
          if (user?.currentRole === "doctor") {
            console.log("[isReceivingDoctor Check]", {
              appointmentId: a._id,
              patient_id: patientIdStr,
              user_id: userIdStr,
              user_context_id: user?.id,
              localStorage_id: localStorage.getItem("userId"),
              isReceivingDoctor,
              status: a.status
            });
          }
          return {
            id: a._id || a.id,
            doctorName: a.doctorName || "Unknown Doctor",
            specialty: a.specialty || "General",
            department: a.department || a.specialty || "General",
            qualifications: a.qualifications || [],
            experience_years: a.experience_years || "",
            hospital: a.hospital || "Unknown Hospital",
            date: appointmentDate.toLocaleDateString(),
            time: appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rawDate: appointmentDate,
            status: status,
            notes: a.notes,
            consultationType: a.consultationType || "In-Person",
            patientName: a.patient_info?.name || "Unknown Patient",
            patientId: a.patient_info?.id || a.patient_id || "",
            doctorId: a.doctor_id || "",
            isReceivingDoctor: isReceivingDoctor,
            // Feedback tracking
            hasFeedback: a.has_feedback || false,
            feedbackRating: a.feedback_rating || 0,
          };
        });
        // Debug log: print all appointments and statuses
        console.log("[Appointments Debug] All fetched appointments:", formattedData);
        setAppointments(formattedData);
      } else {
        // Only show dummy data for specific test users
        if (user?.email === "amit@example.com" || user?.email === "rajesh@example.com") {
          setAppointments(dummyAppointments);
        } else {
          setAppointments([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      // Only show dummy data for specific test users
      if (user?.email === "amit@example.com" || user?.email === "rajesh@example.com") {
        setAppointments(dummyAppointments);
      } else {
        setAppointments([]);
      }
    }
    setLoading(false);
  };

  // Fetch appointments from API
  useEffect(() => {
    fetchAppointments();
  }, [user]);

  // Handle sorting
  const handleSort = (field: "doctor" | "date" | "type" | "status") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtered and sorted appointments
  const filteredAppointments = (() => {
    let filtered = filterStatus === "all" 
      ? appointments 
      : appointments.filter(apt => apt.status === filterStatus);
    
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case "doctor":
            const nameA = (isDoctor ? a.patientName : a.doctorName) || "";
            const nameB = (isDoctor ? b.patientName : b.doctorName) || "";
            comparison = nameA.localeCompare(nameB);
            break;
          case "date":
            const dateA = a.rawDate ? a.rawDate.getTime() : new Date(a.date).getTime();
            const dateB = b.rawDate ? b.rawDate.getTime() : new Date(b.date).getTime();
            comparison = dateA - dateB;
            break;
          case "type":
            comparison = (a.consultationType || "").localeCompare(b.consultationType || "");
            break;
          case "status":
            comparison = (a.status || "").localeCompare(b.status || "");
            break;
        }
        
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    
    return filtered;
  })();

  // Status color helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "approved":
        return "bg-green-500";
      case "pending":
        return "bg-amber-500";
      case "completed":
        return "bg-blue-500";
      case "cancelled":
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "confirmed":
      case "approved":
        return isDark ? "bg-green-900/20 border-green-800" : "bg-green-50 border-green-200";
      case "pending":
        return isDark ? "bg-amber-900/20 border-amber-800" : "bg-amber-50 border-amber-200";
      case "completed":
        return isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200";
      case "cancelled":
      case "rejected":
        return isDark ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200";
      default:
        return isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200";
    }
  };

  // Calendar helpers
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  const formatDateToYMD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getAppointmentsForDateAndHour = (date: Date, hour: number) => {
    const dateStr = formatDateToYMD(date);
    // For calendar view, use ALL appointments, not just filtered ones
    return appointments.filter((apt) => {
      if (!apt.rawDate && !apt.date) return false;
      if (!apt.time) return false;
      
      // Use rawDate if available (more reliable), otherwise parse date string
      let aptDateStr = "";
      if (apt.rawDate) {
        const rd = new Date(apt.rawDate);
        const year = rd.getFullYear();
        const month = String(rd.getMonth() + 1).padStart(2, "0");
        const day = String(rd.getDate()).padStart(2, "0");
        aptDateStr = `${year}-${month}-${day}`;
      } else if (apt.date) {
        // Handle different date formats from toLocaleDateString
        if (apt.date.includes('/')) {
          const parts = apt.date.split('/');
          if (parts.length === 3) {
            // Handle M/D/YYYY format (US locale from toLocaleDateString)
            aptDateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        } else if (apt.date.includes('T')) {
          aptDateStr = apt.date.split('T')[0];
        } else if (apt.date.includes('-')) {
          aptDateStr = apt.date;
        }
      }
      
      if (aptDateStr !== dateStr) return false;
      
      // Parse time from rawDate if available
      let aptHour = 0;
      if (apt.rawDate) {
        aptHour = new Date(apt.rawDate).getHours();
      } else if (apt.time.includes(":")) {
        const timeParts = apt.time.split(":");
        aptHour = parseInt(timeParts[0]);
        // Handle 12-hour format with AM/PM
        const timeUpper = apt.time.toUpperCase();
        if (timeUpper.includes("PM") && aptHour !== 12) {
          aptHour += 12;
        } else if (timeUpper.includes("AM") && aptHour === 12) {
          aptHour = 0;
        }
      }
      return aptHour === hour;
    });
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekStart(newStart);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  const formatMonthYear = () => {
    const endOfWeek = new Date(currentWeekStart);
    endOfWeek.setDate(currentWeekStart.getDate() + 6);
    const startMonth = currentWeekStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const endMonth = endOfWeek.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (startMonth === endMonth) return startMonth;
    return `${currentWeekStart.toLocaleDateString("en-US", { month: "short" })} - ${endOfWeek.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleConfirmAppointment = async (id: string) => {
    try {
      await confirmAppointment(id);
      fetchAppointments();
      setSelectedAppointment(null);
    } catch (error) {
      console.error("Failed to confirm:", error);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      await cancelAppointment(id);
      fetchAppointments();
      setSelectedAppointment(null);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  };

  const filterAppointments = (status: "pending" | "upcoming" | "completed" | "missed" | "rejected" | "book") => {
    if (status === "book") return [];
    const now = new Date();
    if (status === "upcoming") {
      // Upcoming: approved or scheduled appointments with future dates (system time based)
      return appointments.filter((apt) => {
        const isUpcomingStatus = apt.status === "approved" || apt.status === "scheduled";
        const isFutureDate = apt.rawDate ? apt.rawDate >= now : true;
        return isUpcomingStatus && isFutureDate;
      });
    }
    if (status === "missed") {
      // Missed: approved/scheduled appointments where date has passed but not completed (system time based)
      return appointments.filter((apt) => {
        const isMissedStatus = apt.status === "approved" || apt.status === "scheduled";
        const isPastDate = apt.rawDate ? apt.rawDate < now : false;
        return isMissedStatus && isPastDate;
      });
    }
    if (status === "rejected") {
      // Rejected appointments
      return appointments.filter((apt) => apt.status === "rejected");
    }
    // For pending and completed, filter directly by status
    return appointments.filter((apt) => apt.status === status);
  };

  // Handle approve/reject for doctors
  const handleApprove = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      await apiClient.approveAppointment(appointmentId);
      // Update local state
      setAppointments(prev => 
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: "approved" } : apt)
      );
      alert("✅ Appointment approved!\nPatient has been notified.");
      // Refresh data
      fetchAppointments();
      // Refresh notifications to show any new notifications
      if (user?.id) {
        await getNotifications(user.id, user.currentRole === "doctor" ? "doctor" : "user");
      }
    } catch (error) {
      console.error("Failed to approve appointment:", error);
      alert("❌ Failed to approve appointment.");
    }
    setActionLoading(null);
  };

  const handleReject = async (appointmentId: string) => {
    setRejectingAppointmentId(appointmentId);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingAppointmentId) return;

    setActionLoading(rejectingAppointmentId);
    try {
      await apiClient.rejectAppointment(rejectingAppointmentId, rejectionReason || undefined);
      // Update local state
      setAppointments(prev => 
        prev.map(apt => apt.id === rejectingAppointmentId ? { ...apt, status: "rejected" } : apt)
      );
      alert("❌ Appointment rejected.\nPatient has been notified.");
      setShowRejectDialog(false);
      setRejectingAppointmentId(null);
      setRejectionReason("");
      // Refresh data
      fetchAppointments();
      // Refresh notifications to show any new notifications
      if (user?.id) {
        await getNotifications(user.id, user.currentRole === "doctor" ? "doctor" : "user");
      }
    } catch (error) {
      console.error("Failed to reject appointment:", error);
      alert("❌ Failed to reject appointment.");
    }
    setActionLoading(null);
  };

  const handleReschedule = async () => {
    if (!rescheduleAppointment || !newRescheduleDate) {
      alert("Please select a new date and time.");
      return;
    }
    
    setActionLoading(rescheduleAppointment.id);
    try {
      await apiClient.rescheduleAppointment(rescheduleAppointment.id, newRescheduleDate);
      // Update local state - mark old appointment as rescheduled
      setAppointments(prev => 
        prev.map(apt => apt.id === rescheduleAppointment.id ? { ...apt, status: "rescheduled" } : apt)
      );
      setShowRescheduleModal(false);
      setRescheduleAppointment(null);
      setNewRescheduleDate("");
      alert("Appointment rescheduled successfully! The new appointment is pending doctor approval.");
      // Refresh appointments to get the new one
      window.location.reload();
    } catch (error) {
      console.error("Failed to reschedule:", error);
      alert("Failed to reschedule appointment. Please try again.");
    }
    setActionLoading(null);
  };

  const handleMarkMissed = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to mark this appointment as missed?")) return;
    
    setActionLoading(appointmentId);
    try {
      await apiClient.markAppointmentMissed(appointmentId);
      // Update local state
      setAppointments(prev => 
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: "missed" } : apt)
      );
      alert("⚠️ Appointment marked as missed.\nPatient has been notified.");
      // Refresh data
      fetchAppointments();
      // Refresh notifications to show any new notifications
      if (user?.id) {
        await getNotifications(user.id, user.currentRole === "doctor" ? "doctor" : "user");
      }
    } catch (error) {
      console.error("Failed to mark as missed:", error);
      alert("❌ Failed to mark appointment as missed.");
    }
    setActionLoading(null);
  };

  const handleAppointmentAction = async (appointmentId: string, action: "complete" | "missed") => {
    const actionText = action === "complete" ? "complete" : "mark as missed";
    if (!confirm(`Are you sure you want to ${actionText} this appointment?`)) return;
    
    setActionLoading(appointmentId);
    try {
      if (action === "complete") {
        await apiClient.completeAppointment(appointmentId);
        setAppointments(prev => 
          prev.map(apt => apt.id === appointmentId ? { ...apt, status: "completed" } : apt)
        );
        alert("🎉 Appointment marked as completed!\nPatient has been notified.");
      } else if (action === "missed") {
        await apiClient.markAppointmentMissed(appointmentId);
        setAppointments(prev => 
          prev.map(apt => apt.id === appointmentId ? { ...apt, status: "missed" } : apt)
        );
        alert("⚠️ Appointment marked as missed.\nPatient has been notified.");
      }
      // Refresh data
      fetchAppointments();
      // Refresh notifications to show any new notifications
      if (user?.id) {
        await getNotifications(user.id, user.currentRole === "doctor" ? "doctor" : "user");
      }
    } catch (error) {
      console.error(`Failed to ${action} appointment:`, error);
      alert(`❌ Failed to ${action} appointment.`);
    }
    setActionLoading(null);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "upcoming":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "approved":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "completed":
        return "bg-green-100 text-green-700 border-green-300";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-300";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-300";
      case "missed":
        return "bg-rose-100 text-rose-700 border-rose-300";
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "rescheduled":
        return "bg-purple-100 text-purple-700 border-purple-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getConsultationIcon = (type: string) => {
    switch (type) {
      case "In-Person":
        return "🏥";
      case "Video Call":
        return "📹";
      case "Phone":
        return "📞";
      default:
        return "📋";
    }
  };

  const renderAppointmentsList = () => {
    const filtered = filterAppointments(activeTab as any);

    if (activeTab === "book") {
      return (
        <div className={`rounded-2xl p-10 text-center ${isDark ? "bg-gray-800" : "bg-white"} border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? "bg-blue-900/30" : "bg-blue-50"}`}>
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Book New Appointment</h3>
          <p className={`text-sm mb-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Find a doctor and schedule your visit</p>
          <button
            onClick={() => navigate("/browse-hospitals")}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Browse Doctors
          </button>
        </div>
      );
    }

    // Schedule tab - Navigate to full schedule management page with calendar/list/grid views
    if (activeTab === "schedule") {
      // Redirect to the appointment management page
      navigate("/appointment-management");
      return null;
    }

    // Empty state for all tabs
    if (filtered.length === 0) {
      const emptyMessages: Record<string, { title: string; subtitle: string }> = {
        pending: { title: "No Pending Appointments", subtitle: "There are no appointments awaiting review at this time." },
        upcoming: { title: "No Scheduled Appointments", subtitle: "You have no upcoming appointments. Schedule one to get started." },
        completed: { title: "No Completed Appointments", subtitle: "Your appointment history will be displayed here." },
        missed: { title: "No Missed Appointments", subtitle: "You have maintained an excellent attendance record." },
        rejected: { title: "No Declined Appointments", subtitle: "There are no declined appointment requests." },
      };
      const msg = emptyMessages[activeTab] || { title: "No appointments", subtitle: "" };

      return (
        <div className={`rounded-lg p-16 text-center ${isDark ? "bg-gray-800" : "bg-white"} border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className={`w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
            <svg className={`w-8 h-8 ${isDark ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{msg.title}</h3>
          <p className={`text-sm mt-2 max-w-sm mx-auto ${isDark ? "text-gray-400" : "text-gray-500"}`}>{msg.subtitle}</p>
        </div>
      );
    }

    // Special rendering for Pending tab (Doctor view - shows BOTH types)
    // 1. Appointments where patients booked with this doctor → Approve/Reject buttons
    // 2. Appointments where this doctor booked with other doctors → Patient waiting view
    if (activeTab === "pending" && user?.userType === "doctor") {
      // Separate appointments into two categories
      const receivingDoctorAppointments = filtered.filter(apt => apt.isReceivingDoctor);
      const myBookingsAsPatient = filtered.filter(apt => !apt.isReceivingDoctor);

      return (
        <div className="space-y-6">
          {/* Section 1: Appointment Requests FROM Patients (Doctor can Approve/Reject) */}
          {receivingDoctorAppointments.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Patient Requests Requiring Action ({receivingDoctorAppointments.length})
              </h3>
              <div className="space-y-3">
                {receivingDoctorAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className={`rounded-lg p-5 ${isDark ? "bg-gray-800" : "bg-white"} border ${isDark ? "border-gray-700 hover:border-gray-600" : "border-gray-200 hover:border-gray-300"} transition-colors`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0 ${isDark ? "bg-orange-900/30 text-orange-400" : "bg-orange-100 text-orange-700"}`}>
                          {appointment.patientName?.charAt(0) || "P"}
                        </div>
                        <div className="min-w-0">
                          <h4 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                            {appointment.patientName || "Patient"}
                          </h4>
                          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {appointment.date} at {appointment.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(appointment.id)}
                          disabled={actionLoading === appointment.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleReject(appointment.id)}
                          disabled={actionLoading === appointment.id}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 border ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: My bookings waiting for approval */}
          {myBookingsAsPatient.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Awaiting Confirmation ({myBookingsAsPatient.length})
              </h3>
              <div className="space-y-3">
                {myBookingsAsPatient.map((appointment) => renderSimpleAppointmentCard(appointment))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Standard list rendering for other tabs
    return (
      <div className="space-y-2">
        {filtered.map((appointment) => renderSimpleAppointmentCard(appointment))}
      </div>
    );
  };

  // Professional appointment card
  const renderSimpleAppointmentCard = (appointment: Appointment) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: isDark ? "bg-amber-900/20" : "bg-amber-50", text: isDark ? "text-amber-400" : "text-amber-700", label: "Pending Review" },
      approved: { bg: isDark ? "bg-emerald-900/20" : "bg-emerald-50", text: isDark ? "text-emerald-400" : "text-emerald-700", label: "Confirmed" },
      scheduled: { bg: isDark ? "bg-blue-900/20" : "bg-blue-50", text: isDark ? "text-blue-400" : "text-blue-700", label: "Scheduled" },
      upcoming: { bg: isDark ? "bg-blue-900/20" : "bg-blue-50", text: isDark ? "text-blue-400" : "text-blue-700", label: "Scheduled" },
      completed: { bg: isDark ? "bg-gray-700" : "bg-gray-100", text: isDark ? "text-gray-300" : "text-gray-700", label: "Completed" },
      cancelled: { bg: isDark ? "bg-gray-700" : "bg-gray-100", text: isDark ? "text-gray-400" : "text-gray-600", label: "Cancelled" },
      rejected: { bg: isDark ? "bg-red-900/20" : "bg-red-50", text: isDark ? "text-red-400" : "text-red-700", label: "Declined" },
      missed: { bg: isDark ? "bg-orange-900/20" : "bg-orange-50", text: isDark ? "text-orange-400" : "text-orange-700", label: "Missed" },
      rescheduled: { bg: isDark ? "bg-purple-900/20" : "bg-purple-50", text: isDark ? "text-purple-400" : "text-purple-700", label: "Rescheduled" },
    };
    const status = statusConfig[appointment.status] || statusConfig.pending;

    // Booking source differentiation for doctors
    // isReceivingDoctor = true means a patient booked with this doctor
    // isReceivingDoctor = false means this doctor booked with another doctor (as patient)
    const isPatientBooked = appointment.isReceivingDoctor; // Patient booked this appointment with the doctor
    const bookingSourceStyle = isDoctor ? {
      border: isPatientBooked 
        ? (isDark ? "border-l-4 border-l-cyan-500" : "border-l-4 border-l-cyan-500")  // Cyan for patient-booked
        : (isDark ? "border-l-4 border-l-violet-500" : "border-l-4 border-l-violet-500"), // Violet for self-booked
      avatarBg: isPatientBooked
        ? (isDark ? "bg-cyan-900/30 text-cyan-400" : "bg-cyan-100 text-cyan-700")
        : (isDark ? "bg-violet-900/30 text-violet-400" : "bg-violet-100 text-violet-700"),
      badge: isPatientBooked
        ? { bg: isDark ? "bg-cyan-900/30" : "bg-cyan-50", text: isDark ? "text-cyan-400" : "text-cyan-700", label: "Patient Booked" }
        : { bg: isDark ? "bg-violet-900/30" : "bg-violet-50", text: isDark ? "text-violet-400" : "text-violet-700", label: "Your Booking" }
    } : {
      border: "",
      avatarBg: isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700",
      badge: null
    };

    return (
      <div
        key={appointment.id}
        className={`rounded-lg p-5 ${isDark ? "bg-gray-800" : "bg-white"} border ${isDark ? "border-gray-700 hover:border-gray-600" : "border-gray-200 hover:border-gray-300"} ${bookingSourceStyle.border} transition-colors`}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Doctor info */}
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0 ${bookingSourceStyle.avatarBg}`}>
              {appointment.doctorName.split(' ').pop()?.charAt(0) || 'D'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {appointment.doctorName}
                </h3>
                <span className={`px-2.5 py-1 rounded text-xs font-medium ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
                {/* Booking source badge - only for doctors */}
                {isDoctor && bookingSourceStyle.badge && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${bookingSourceStyle.badge.bg} ${bookingSourceStyle.badge.text}`}>
                    {isPatientBooked ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    {bookingSourceStyle.badge.label}
                  </span>
                )}
              </div>
              {/* Show patient name for doctors when patient booked */}
              {isDoctor && isPatientBooked && appointment.patientName && (
                <p className={`text-sm mt-0.5 flex items-center gap-1.5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Patient: {appointment.patientName}
                </p>
              )}
              <p className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {appointment.specialty}
              </p>
              <div className={`flex items-center gap-4 mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {appointment.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {appointment.time}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {appointment.consultationType === "Video Call" ? (
                      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    ) : appointment.consultationType === "Phone" ? (
                      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    ) : (
                      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    )}
                  </svg>
                  {appointment.consultationType}
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Actions based on status and role */}
            {appointment.status === "approved" && user?.userType === "doctor" && appointment.isReceivingDoctor && (
              <>
                <button
                  onClick={() => handleAppointmentAction(appointment.id, "complete")}
                  disabled={actionLoading === appointment.id}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  Mark Complete
                </button>
                <button
                  onClick={() => handleAppointmentAction(appointment.id, "missed")}
                  disabled={actionLoading === appointment.id}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 border ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                >
                  Mark Missed
                </button>
              </>
            )}

            {/* Reschedule for patients */}
            {(appointment.status === "approved" || appointment.status === "pending") && !appointment.isReceivingDoctor && (
              <button
                onClick={() => {
                  setRescheduleAppointment(appointment);
                  setShowRescheduleModal(true);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors border ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                Reschedule
              </button>
            )}

            {/* Feedback section for completed appointments */}
            {appointment.status === "completed" && !appointment.isReceivingDoctor && (
              appointment.hasFeedback ? (
                // Show feedback given indicator with rating
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-md">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Feedback Given</span>
                  {appointment.feedbackRating && (
                    <span className="flex items-center gap-0.5 text-amber-500">
                      {"★".repeat(appointment.feedbackRating)}
                    </span>
                  )}
                </div>
              ) : (
                // Show Leave Feedback button
                <button
                  onClick={() => {
                    setFeedbackAppointment(appointment);
                    setShowFeedbackModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Leave Feedback
                </button>
              )
            )}

            {/* View documents for doctors */}
            {user?.userType === "doctor" && appointment.isReceivingDoctor && (
              <button
                onClick={() => fetchAppointmentDocuments(appointment)}
                className={`p-2 rounded-md transition-colors border ${isDark ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"}`}
                title="View Documents"
              >
                <svg className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}

            {/* Chat button */}
            {(appointment.status === "approved" || appointment.status === "completed") && (
              <button
                onClick={() => navigate(`/chat/${appointment.id}`)}
                className={`p-2 rounded-md transition-colors border ${isDark ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"}`}
                title="Message"
              >
                <svg className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-slate-50"}`}>
      {/* Professional Header */}
      <div className={`sticky top-0 z-10 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} border-b shadow-sm`}>
        <div className="p-6 space-y-4">
          {/* Header with Title and Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>Appointment Management</h1>
              <p className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? "s" : ""} found
              </p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDark 
                    ? "border-gray-600 bg-gray-800 text-white" 
                    : "border-gray-300 bg-white text-gray-900"
                }`}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* View Mode Toggle with Icons */}
              <div className={`flex items-center border rounded-lg p-1 ${isDark ? "border-gray-600 bg-gray-800" : "border-gray-300 bg-white"}`}>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded transition ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white"
                      : isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
                  }`}
                  title="Grid View"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded transition ${
                    viewMode === "list"
                      ? "bg-blue-600 text-white"
                      : isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
                  }`}
                  title="List View"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`p-2 rounded transition ${
                    viewMode === "calendar"
                      ? "bg-blue-600 text-white"
                      : isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
                  }`}
                  title="Calendar View"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              
              <button
                onClick={() => navigate("/browse-hospitals")}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Schedule Appointment
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {filteredAppointments.length === 0 ? (
              <div className="col-span-full py-16 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className={`font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>No appointments found</p>
              </div>
            ) : (
              filteredAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className={`rounded-lg border p-4 hover:shadow-md transition cursor-pointer ${getStatusBg(apt.status)}`}
                  onClick={() => setSelectedAppointment(apt)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(apt.status)}`} />
                    <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                      apt.status === "approved" || apt.status === "scheduled"
                        ? isDark ? "bg-green-900/40 text-green-400" : "bg-green-100 text-green-700"
                        : apt.status === "pending"
                        ? isDark ? "bg-amber-900/40 text-amber-400" : "bg-amber-100 text-amber-700"
                        : apt.status === "completed"
                        ? isDark ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-700"
                        : isDark ? "bg-red-900/40 text-red-400" : "bg-red-100 text-red-700"
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      isDoctor 
                        ? (apt.isReceivingDoctor 
                            ? (isDark ? "bg-cyan-900/30 text-cyan-400" : "bg-cyan-100 text-cyan-600")
                            : (isDark ? "bg-violet-900/30 text-violet-400" : "bg-violet-100 text-violet-600"))
                        : (isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600")
                    }`}>
                      {/* Show patient name for receiving doctor, doctor name for own bookings or non-doctors */}
                      {(isDoctor && apt.isReceivingDoctor ? apt.patientName : apt.doctorName)?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                        {/* Doctor sees patient name when receiving, doctor name when they booked */}
                        {isDoctor && apt.isReceivingDoctor ? apt.patientName : apt.doctorName}
                      </h3>
                      {/* Show specialty when viewing doctor (not receiving doctor showing patient) */}
                      {(!isDoctor || !apt.isReceivingDoctor) && apt.specialty && (
                        <p className={`text-xs truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>{apt.specialty}</p>
                      )}
                      {/* Show booking type badge for doctors */}
                      {isDoctor && (
                        <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 ${
                          apt.isReceivingDoctor
                            ? (isDark ? "bg-cyan-900/30 text-cyan-400" : "bg-cyan-100 text-cyan-600")
                            : (isDark ? "bg-violet-900/30 text-violet-400" : "bg-violet-100 text-violet-600")
                        }`}>
                          {apt.isReceivingDoctor ? "Patient Request" : "Your Booking"}
                        </span>
                      )}
                    </div>
                  </div>
                  {apt.hospital && (
                    <div className={`flex items-center gap-2 text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="truncate">{apt.hospital}</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-2 text-sm mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {apt.date}
                  </div>
                  <div className={`flex items-center gap-2 text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {apt.time} • {apt.consultationType}
                  </div>
                  {/* Confirm/Decline only for doctors receiving patient appointments */}
                  {isDoctor && apt.status === "pending" && apt.isReceivingDoctor && (
                    <div className={`flex gap-2 mt-3 pt-3 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApprove(apt.id); }}
                        className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReject(apt.id); }}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded border transition ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {/* Waiting for approval badge for doctor's own bookings */}
                  {isDoctor && apt.status === "pending" && !apt.isReceivingDoctor && (
                    <div className={`mt-3 pt-3 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                      <p className={`text-xs text-center ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                        ⏳ Waiting for doctor approval
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className={`rounded-lg border overflow-hidden mb-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border border-gray-200"}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${isDark ? "bg-gray-900/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <tr>
                    <th 
                      onClick={() => handleSort("doctor")}
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-opacity-80 transition ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      <div className="flex items-center gap-1">
                        {isDoctor ? "Patient" : "Doctor"}
                        <svg className={`w-4 h-4 ${sortField === "doctor" ? "opacity-100" : "opacity-30"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {sortField === "doctor" && sortDirection === "desc" ? (
                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          ) : (
                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          )}
                        </svg>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("date")}
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-opacity-80 transition ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      <div className="flex items-center gap-1">
                        Date & Time
                        <svg className={`w-4 h-4 ${sortField === "date" ? "opacity-100" : "opacity-30"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {sortField === "date" && sortDirection === "desc" ? (
                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          ) : (
                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          )}
                        </svg>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("type")}
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-opacity-80 transition ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      <div className="flex items-center gap-1">
                        Type
                        <svg className={`w-4 h-4 ${sortField === "type" ? "opacity-100" : "opacity-30"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {sortField === "type" && sortDirection === "desc" ? (
                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          ) : (
                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          )}
                        </svg>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("status")}
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-opacity-80 transition ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        <svg className={`w-4 h-4 ${sortField === "status" ? "opacity-100" : "opacity-30"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {sortField === "status" && sortDirection === "desc" ? (
                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          ) : (
                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          )}
                        </svg>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-100"}`}>
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={`px-4 py-12 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        No appointments found
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((apt) => {
                      // Booking source styling for list view
                      const isPatientBookedRow = apt.isReceivingDoctor;
                      const rowBorderClass = isDoctor 
                        ? (isPatientBookedRow ? "border-l-4 border-l-cyan-500" : "border-l-4 border-l-violet-500")
                        : "";
                      const avatarClass = isDoctor
                        ? (isPatientBookedRow 
                            ? (isDark ? "bg-cyan-900/30 text-cyan-400" : "bg-cyan-100 text-cyan-600")
                            : (isDark ? "bg-violet-900/30 text-violet-400" : "bg-violet-100 text-violet-600"))
                        : (isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600");
                      
                      return (
                      <tr key={apt.id} className={`transition cursor-pointer ${rowBorderClass} ${isDark ? "hover:bg-gray-700/50" : "hover:bg-gray-50"}`} onClick={() => setSelectedAppointment(apt)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${avatarClass}`}>
                              {(isDoctor ? apt.patientName : apt.doctorName)?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                  {isDoctor ? apt.patientName : apt.doctorName}
                                </p>
                                {/* Booking source badge for doctors */}
                                {isDoctor && (
                                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                    isPatientBookedRow 
                                      ? (isDark ? "bg-cyan-900/30 text-cyan-400" : "bg-cyan-100 text-cyan-600")
                                      : (isDark ? "bg-violet-900/30 text-violet-400" : "bg-violet-100 text-violet-600")
                                  }`}>
                                    {isPatientBookedRow ? "Patient" : "You"}
                                  </span>
                                )}
                              </div>
                              {!isDoctor && apt.specialty && (
                                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{apt.specialty}</p>
                              )}
                              {apt.hospital && (
                                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{apt.hospital}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{apt.date}</p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{apt.time}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {apt.consultationType === "Video Call" ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                            )}
                            {apt.consultationType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full capitalize ${
                            apt.status === "approved" || apt.status === "scheduled"
                              ? isDark ? "bg-green-900/40 text-green-400" : "bg-green-100 text-green-700"
                              : apt.status === "pending"
                              ? isDark ? "bg-amber-900/40 text-amber-400" : "bg-amber-100 text-amber-700"
                              : apt.status === "completed"
                              ? isDark ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-700"
                              : isDark ? "bg-red-900/40 text-red-400" : "bg-red-100 text-red-700"
                          }`}>
                            {apt.status}
                          </span>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calendar View - MS Teams Style */}
        {viewMode === "calendar" && (
          <div className={`rounded-xl mb-6 ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} shadow-sm overflow-hidden`}>
            {/* Calendar Header - MS Teams Style */}
            <div className={`px-4 py-3 border-b ${isDark ? "border-gray-700" : "border-gray-200"} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                {/* Today Button */}
                <button
                  onClick={() => {
                    const today = new Date();
                    const day = today.getDay();
                    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                    setCurrentWeekStart(new Date(today.setDate(diff)));
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded border ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"} transition flex items-center gap-1.5`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Today
                </button>

                {/* Navigation Arrows */}
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      const newStart = new Date(currentWeekStart);
                      newStart.setDate(currentWeekStart.getDate() - 7);
                      setCurrentWeekStart(newStart);
                    }}
                    className={`p-1.5 rounded transition ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  >
                    <svg className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      const newStart = new Date(currentWeekStart);
                      newStart.setDate(currentWeekStart.getDate() + 7);
                      setCurrentWeekStart(newStart);
                    }}
                    className={`p-1.5 rounded transition ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  >
                    <svg className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Date Range Dropdown - MS Teams Style */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowDatePicker(!showDatePicker);
                      setDatePickerMonth(new Date(currentWeekStart));
                      setDatePickerYear(currentWeekStart.getFullYear());
                    }}
                    className={`px-4 py-1.5 rounded-lg flex items-center gap-2 transition ${
                      isDark 
                        ? "bg-gray-700 hover:bg-gray-600 text-white" 
                        : "bg-blue-50 hover:bg-blue-100 text-blue-700"
                    }`}
                  >
                    <span className="font-medium">
                      {(() => {
                        const endOfWeek = new Date(currentWeekStart);
                        endOfWeek.setDate(currentWeekStart.getDate() + 6);
                        const startDay = currentWeekStart.getDate();
                        const endDay = endOfWeek.getDate();
                        const startMonth = currentWeekStart.toLocaleDateString("en-US", { month: "long" });
                        const endMonth = endOfWeek.toLocaleDateString("en-US", { month: "long" });
                        const year = endOfWeek.getFullYear();
                        if (startMonth === endMonth) {
                          return `${startDay} - ${endDay} ${startMonth}, ${year}`;
                        }
                        return `${startDay} ${startMonth} - ${endDay} ${endMonth}, ${year}`;
                      })()}
                    </span>
                    <svg className={`w-4 h-4 transition ${showDatePicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Date Picker Dropdown */}
                  {showDatePicker && (
                    <div className={`absolute top-full left-0 mt-2 z-50 rounded-xl shadow-2xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} p-4 min-w-[520px]`}>
                      <div className="flex gap-6">
                        {/* Mini Calendar */}
                        <div className="flex-1">
                          {/* Month Navigation */}
                          <div className="flex items-center justify-between mb-3">
                            <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                              {datePickerMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                            </h3>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  const newMonth = new Date(datePickerMonth);
                                  newMonth.setMonth(newMonth.getMonth() - 1);
                                  setDatePickerMonth(newMonth);
                                }}
                                className={`p-1 rounded transition ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                              >
                                <svg className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  const newMonth = new Date(datePickerMonth);
                                  newMonth.setMonth(newMonth.getMonth() + 1);
                                  setDatePickerMonth(newMonth);
                                }}
                                className={`p-1 rounded transition ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                              >
                                <svg className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Day Headers */}
                          <div className="grid grid-cols-7 gap-1 mb-1">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                              <div key={i} className={`text-center text-xs font-medium py-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                {d}
                              </div>
                            ))}
                          </div>

                          {/* Calendar Days */}
                          <div className="grid grid-cols-7 gap-1">
                            {(() => {
                              const firstDay = new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth(), 1);
                              const lastDay = new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1, 0);
                              const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
                              const days = [];
                              
                              // Previous month days
                              for (let i = 0; i < startOffset; i++) {
                                const prevDay = new Date(firstDay);
                                prevDay.setDate(prevDay.getDate() - (startOffset - i));
                                days.push({ date: prevDay, currentMonth: false });
                              }
                              
                              // Current month days
                              for (let i = 1; i <= lastDay.getDate(); i++) {
                                days.push({ date: new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth(), i), currentMonth: true });
                              }
                              
                              // Next month days
                              const remaining = 42 - days.length;
                              for (let i = 1; i <= remaining; i++) {
                                const nextDay = new Date(lastDay);
                                nextDay.setDate(nextDay.getDate() + i);
                                days.push({ date: nextDay, currentMonth: false });
                              }
                              
                              return days.map(({ date, currentMonth }, idx) => {
                                const isToday = date.toDateString() === new Date().toDateString();
                                const isInCurrentWeek = date >= currentWeekStart && date < new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                                
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      const day = date.getDay();
                                      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                                      const weekStart = new Date(date);
                                      weekStart.setDate(diff);
                                      setCurrentWeekStart(weekStart);
                                      setShowDatePicker(false);
                                    }}
                                    className={`w-8 h-8 text-sm rounded-full flex items-center justify-center transition ${
                                      isToday
                                        ? "bg-blue-600 text-white font-bold"
                                        : isInCurrentWeek
                                          ? isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"
                                          : currentMonth
                                            ? isDark ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                                            : isDark ? "text-gray-600 hover:bg-gray-700" : "text-gray-400 hover:bg-gray-100"
                                    }`}
                                  >
                                    {date.getDate()}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Year Selector */}
                        <div className={`w-24 border-l ${isDark ? "border-gray-700" : "border-gray-200"} pl-4`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{datePickerYear}</span>
                            <div className="flex flex-col">
                              <button
                                onClick={() => setDatePickerYear(y => y - 1)}
                                className={`p-0.5 rounded transition ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                              >
                                <svg className={`w-3 h-3 ${isDark ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDatePickerYear(y => y + 1)}
                                className={`p-0.5 rounded transition ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                              >
                                <svg className={`w-3 h-3 ${isDark ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          {/* Month Grid */}
                          <div className="grid grid-cols-1 gap-1">
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
                              const isCurrentMonth = datePickerMonth.getMonth() === idx && datePickerMonth.getFullYear() === datePickerYear;
                              return (
                                <button
                                  key={month}
                                  onClick={() => {
                                    const newMonth = new Date(datePickerYear, idx, 1);
                                    setDatePickerMonth(newMonth);
                                  }}
                                  className={`px-2 py-1 text-xs rounded transition ${
                                    isCurrentMonth
                                      ? isDark ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
                                      : isDark ? "text-gray-400 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
                                  }`}
                                >
                                  {month}
                                </button>
                              );
                            })}
                          </div>
                          
                          {/* Today Button */}
                          <button
                            onClick={() => {
                              const today = new Date();
                              const day = today.getDay();
                              const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                              setCurrentWeekStart(new Date(new Date().setDate(diff)));
                              setShowDatePicker(false);
                            }}
                            className={`w-full mt-3 px-2 py-1.5 text-xs font-medium rounded transition ${
                              isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            Today
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - View indicator */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                <svg className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>Week View</span>
              </div>
            </div>

            {/* Scrollable Calendar Grid Container */}
            <div 
              ref={calendarGridRef}
              className="max-h-[600px] overflow-y-auto overflow-x-hidden"
              style={{ scrollBehavior: 'smooth' }}
            >
            {/* Calendar Grid - MS Teams Layout with Time Column on Left */}
            <div className="flex relative">
              {/* Current Time Indicator Line - MS Teams Style */}
              {(() => {
                const now = currentTime;
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const todayIndex = Array.from({ length: 7 }, (_, i) => {
                  const day = new Date(currentWeekStart);
                  day.setDate(currentWeekStart.getDate() + i);
                  return day.toDateString() === now.toDateString() ? i : -1;
                }).find(i => i !== -1);
                
                // Only show if current hour is within visible range (8 AM - 8 PM) and today is in current week
                if (currentHour >= 8 && currentHour < 20 && todayIndex !== undefined && todayIndex !== -1) {
                  const hourOffset = currentHour - 8;
                  const minuteOffset = currentMinute / 60;
                  const topPosition = 48 + (hourOffset + minuteOffset) * 64; // 48px header + hour slots of 64px each
                  const leftPosition = 64 + (todayIndex * (100 / 7)); // 64px time column + day column position
                  
                  return (
                    <div 
                      className="absolute z-20 flex items-center pointer-events-none"
                      style={{ 
                        top: `${topPosition}px`, 
                        left: '64px',
                        right: '0'
                      }}
                    >
                      {/* Time Label */}
                      <div className="absolute -left-16 w-16 flex items-center justify-end pr-2">
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {/* Red Circle Indicator */}
                      <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shadow-lg z-10" />
                      {/* Red Line */}
                      <div className="flex-1 h-0.5 bg-red-500 shadow-sm" />
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Time Column */}
              <div className={`w-16 flex-shrink-0 border-r ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                {/* Sticky Header Spacer */}
                <div className={`h-12 border-b sticky top-0 z-10 ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`} />
                {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => (
                  <div
                    key={hour}
                    className={`h-16 border-b ${isDark ? "border-gray-700/50" : "border-gray-100"} px-2 py-1`}
                  >
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="flex-1 grid grid-cols-7">
                {/* Sticky Day Headers */}
                {Array.from({ length: 7 }, (_, i) => {
                  const day = new Date(currentWeekStart);
                  day.setDate(currentWeekStart.getDate() + i);
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={i}
                      className={`h-12 border-b border-r sticky top-0 z-10 ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} px-2 py-2 text-center ${
                        isToday ? (isDark ? "bg-blue-900/40" : "bg-blue-50") : ""
                      }`}
                    >
                      <p className={`text-xs uppercase ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p className={`text-sm font-semibold ${
                        isToday
                          ? "text-blue-600 dark:text-blue-400"
                          : isDark ? "text-white" : "text-gray-900"
                      }`}>
                        {day.getDate()}
                      </p>
                    </div>
                  );
                })}

                {/* Time Slots */}
                {Array.from({ length: 12 }, (_, hourIndex) => {
                  const hour = hourIndex + 8;
                  return Array.from({ length: 7 }, (_, dayIndex) => {
                    const day = new Date(currentWeekStart);
                    day.setDate(currentWeekStart.getDate() + dayIndex);
                    
                    // Get appointments for this date and hour
                    const dayAppointments = getAppointmentsForDateAndHour(day, hour);
                    const isTodayCell = isToday(day);
                    
                    return (
                      <div
                        key={`${hour}-${dayIndex}`}
                        className={`h-16 border-b border-r ${isDark ? "border-gray-700/50" : "border-gray-100"} p-0.5 overflow-hidden ${
                          isTodayCell ? (isDark ? "bg-blue-900/10" : "bg-blue-50/50") : ""
                        }`}
                      >
                        {dayAppointments.map((apt) => {
                          // For doctors: differentiate patient-booked vs self-booked
                          const isPatientBookedApt = apt.isReceivingDoctor;
                          // MS Teams style color scheme based on status
                          const statusColors = {
                            approved: { bg: "bg-emerald-500", border: "border-l-4 border-emerald-300", text: "text-white" },
                            scheduled: { bg: "bg-emerald-500", border: "border-l-4 border-emerald-300", text: "text-white" },
                            upcoming: { bg: "bg-blue-500", border: "border-l-4 border-blue-300", text: "text-white" },
                            pending: { bg: "bg-amber-500", border: "border-l-4 border-amber-300", text: "text-white" },
                            completed: { bg: "bg-gray-500", border: "border-l-4 border-gray-400", text: "text-white" },
                            cancelled: { bg: "bg-red-500", border: "border-l-4 border-red-300", text: "text-white" },
                            rejected: { bg: "bg-red-500", border: "border-l-4 border-red-300", text: "text-white" },
                            missed: { bg: "bg-rose-500", border: "border-l-4 border-rose-300", text: "text-white" },
                          };
                          const colors = statusColors[apt.status as keyof typeof statusColors] || statusColors.pending;
                          const displayName = isDoctor ? (apt.patientName || "Patient") : apt.doctorName;
                          const initials = displayName.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
                          
                          return (
                            <div
                              key={apt.id}
                              onClick={() => setSelectedAppointment(apt)}
                              className={`h-full rounded-md cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${colors.bg} ${colors.border} ${colors.text} flex items-center gap-1.5 px-1.5 py-1`}
                              title={`${displayName} - ${apt.time} (${apt.status})`}
                            >
                              {/* Round Profile Avatar - MS Teams Style */}
                              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                                {initials}
                              </div>
                              {/* Name & Time - Truncated */}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="text-[10px] font-semibold truncate leading-tight">
                                  {displayName}
                                </p>
                                <p className="text-[9px] opacity-80 truncate leading-tight">
                                  {apt.time} • {apt.specialty?.split(' ')[0] || apt.consultationType}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })}
              </div>
            </div>
            </div> {/* End of Scrollable Calendar Grid Container */}
            
            {/* Calendar Legend */}
            <div className={`flex flex-wrap items-center justify-center gap-4 p-3 border-t ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
              {isDoctor ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500 border-l-4 border-emerald-300"></div>
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-500 border-l-4 border-amber-300"></div>
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-500 border-l-4 border-gray-400"></div>
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500 border-l-4 border-red-300"></div>
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Cancelled/Rejected</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500 border-l-4 border-emerald-300"></div>
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-500 border-l-4 border-amber-300"></div>
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-500 border-l-4 border-gray-400"></div>
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500 border-l-4 border-red-300"></div>
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Cancelled</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOOKING MODAL */}
      {selectedDoctor && (
        <BookingModal
          isOpen={showBookingModal}
          doctor={selectedDoctor}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDoctor(null);
          }}
          onSuccess={() => {
            // Refresh appointments after booking
            const fetchAppointments = async () => {
              setLoading(true);
              if (!user?.id) {
                setAppointments([]);
                setLoading(false);
                return;
              }

              try {
                const apiData = await apiClient.getAppointments();
                if (apiData && Array.isArray(apiData)) {
                  const formattedData: Appointment[] = apiData.map((a: any) => ({
                    id: a._id || a.id,
                    doctorName: a.doctorName || "Unknown Doctor",
                    specialty: a.specialty || "General",
                    hospital: a.hospital || "Unknown Hospital",
                    date: new Date(a.appointment_date || a.date).toLocaleDateString(),
                    time: new Date(a.appointment_date || a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: a.status || "scheduled",
                    notes: a.notes,
                    consultationType: a.consultationType || "In-Person",
                  }));
                  setAppointments(formattedData);
                } else {
                  setAppointments([]);
                }
              } catch (error) {
                console.error("Failed to refresh appointments:", error);
                setAppointments([]);
              }
              setLoading(false);
            };
            fetchAppointments();
          }}
        />
      )}

      {/* RESCHEDULE MODAL */}
      {showRescheduleModal && rescheduleAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 max-w-md w-full shadow-2xl ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Reschedule Appointment</h3>
            
            <div className={`rounded-xl p-4 mb-6 ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Original appointment with:</p>
              <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rescheduleAppointment.doctorName}</p>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{rescheduleAppointment.specialty}</p>
              <p className="text-sm text-rose-600 mt-2">
                Was scheduled for: {rescheduleAppointment.date} at {rescheduleAppointment.time}
              </p>
            </div>

            <div className="mb-6">
              <label className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Select New Date & Time
              </label>
              <input
                type="datetime-local"
                value={newRescheduleDate}
                onChange={(e) => setNewRescheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setRescheduleAppointment(null);
                  setNewRescheduleDate("");
                }}
                className={`flex-1 px-4 py-3 border font-semibold rounded-xl transition ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={!newRescheduleDate || actionLoading === rescheduleAppointment.id}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === rescheduleAppointment.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Rescheduling...
                  </span>
                ) : (
                  "Confirm Reschedule"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION DIALOG */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 max-w-md w-full shadow-2xl ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <span className="text-2xl">⚠️</span> Reject Appointment
            </h3>
            
            <p className={`mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Please provide a reason for rejection (optional):
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Scheduling conflict, Medical emergency, Unable to conduct appointment..."
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none ${isDark ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500" : "border-gray-300 placeholder-gray-400"}`}
              rows={4}
            />

            <p className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              The patient will receive a notification with your rejection reason.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectingAppointmentId(null);
                  setRejectionReason("");
                }}
                className={`flex-1 px-4 py-3 border font-semibold rounded-xl transition ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
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

      {/* Documents Modal */}
      {showDocumentsModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDocumentsModal(false)}
        >
          <div 
            className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Patient Documents</h2>
                    <p className="text-white/80 text-sm">
                      {selectedAppointmentForDocs?.patientName || "Patient"}'s uploaded files
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDocumentsModal(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {docsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
              ) : selectedAppointmentDocs.length === 0 ? (
                <div className="text-center py-12">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>No Documents</h3>
                  <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    The patient hasn't uploaded any documents for this appointment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"} mb-4`}>
                    {selectedAppointmentDocs.length} document(s) attached to this appointment
                  </p>
                  {selectedAppointmentDocs.map((doc, index) => (
                    <div
                      key={doc.id || index}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
                        isDark 
                          ? "bg-gray-800 border-gray-700 hover:border-purple-500" 
                          : "bg-gray-50 border-gray-200 hover:border-purple-400"
                      }`}
                    >
                      <div className="text-3xl">
                        {getFileIcon(doc.original_filename || doc.file_path)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                          {doc.title || doc.original_filename || "Document"}
                        </p>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {doc.record_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} • {formatFileSize(doc.file_size)}
                        </p>
                        {doc.description && (
                          <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            {doc.description}
                          </p>
                        )}
                      </div>
                      <a
                        href={`http://localhost:8000${doc.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition text-sm"
                        onClick={(e) => {
                          // Add auth token to download request
                          e.preventDefault();
                          const token = localStorage.getItem("authToken");
                          fetch(`http://localhost:8000${doc.file_path}`, {
                            headers: { Authorization: `Bearer ${token}` }
                          })
                          .then(res => res.blob())
                          .then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = doc.original_filename || 'document';
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          })
                          .catch(err => {
                            console.error("Download error:", err);
                            alert("Failed to download file. Please try again.");
                          });
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 pb-6`}>
              <div className={`flex items-center gap-2 text-xs p-3 rounded-xl ${isDark ? "bg-gray-800 text-gray-400" : "bg-gray-50 text-gray-500"}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>These documents were uploaded by the patient during appointment booking.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedAppointment(null)}>
          <div className={`rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`px-5 py-4 border-b ${getStatusBg(selectedAppointment.status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedAppointment.status)}`} />
                  <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Appointment Details</h3>
                </div>
                <button onClick={() => setSelectedAppointment(null)} className={`${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600"}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Doctor/Patient Info */}
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                  {(isDoctor ? selectedAppointment.patientName : selectedAppointment.doctorName)?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                    {isDoctor ? selectedAppointment.patientName : selectedAppointment.doctorName}
                  </p>
                  {!isDoctor && selectedAppointment.specialty && (
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{selectedAppointment.specialty}</p>
                  )}
                  {selectedAppointment.hospital && (
                    <p className={`text-xs flex items-center gap-1 mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {selectedAppointment.hospital}
                    </p>
                  )}
                </div>
                {/* Chat Button */}
                {(selectedAppointment.status === "approved" || selectedAppointment.status === "completed") && (
                  <button
                    onClick={() => navigate(`/chat/${selectedAppointment.id}`)}
                    className={`p-2.5 rounded-lg transition ${isDark ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50" : "bg-blue-100 text-blue-600 hover:bg-blue-200"}`}
                    title="Chat"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-lg p-3 ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <p className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Date</p>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{selectedAppointment.date}</p>
                </div>
                <div className={`rounded-lg p-3 ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <p className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Time</p>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{selectedAppointment.time}</p>
                </div>
                <div className={`rounded-lg p-3 ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <p className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Type</p>
                  <p className={`font-medium flex items-center gap-1.5 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {selectedAppointment.consultationType === "Video Call" ? (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    )}
                    {selectedAppointment.consultationType}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <p className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Status</p>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                    selectedAppointment.status === "approved" || selectedAppointment.status === "scheduled"
                      ? isDark ? "bg-green-900/40 text-green-400" : "bg-green-100 text-green-700"
                      : selectedAppointment.status === "pending"
                      ? isDark ? "bg-amber-900/40 text-amber-400" : "bg-amber-100 text-amber-700"
                      : selectedAppointment.status === "completed"
                      ? isDark ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-700"
                      : isDark ? "bg-red-900/40 text-red-400" : "bg-red-100 text-red-700"
                  }`}>
                    {selectedAppointment.status}
                  </span>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div className={`rounded-lg p-3 ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <p className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Notes</p>
                  <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{selectedAppointment.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
                <div className="flex flex-wrap gap-2">
                  {(selectedAppointment.status === "approved" || selectedAppointment.status === "completed") && (
                    <button
                      onClick={() => navigate(`/chat/${selectedAppointment.id}`)}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Chat
                    </button>
                  )}

                  {/* Reschedule Button - Available for all statuses */}
                  {!isDoctor && (
                    <button
                      onClick={() => {
                        setRescheduleAppointment(selectedAppointment);
                        setShowRescheduleModal(true);
                        setSelectedAppointment(null);
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition flex items-center gap-2 ${
                        isDark 
                          ? "bg-purple-600 hover:bg-purple-700 text-white" 
                          : "bg-purple-500 hover:bg-purple-600 text-white"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Reschedule
                    </button>
                  )}

                  {/* Cancel Button - for pending/approved appointments */}
                  {!isDoctor && (selectedAppointment.status === "pending" || selectedAppointment.status === "approved") && (
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to cancel this appointment?")) {
                          handleCancelAppointment(selectedAppointment.id);
                          setSelectedAppointment(null);
                        }
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition flex items-center gap-2 ${
                        isDark 
                          ? "bg-red-600 hover:bg-red-700 text-white" 
                          : "bg-red-500 hover:bg-red-600 text-white"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {isDoctor && selectedAppointment.status === "pending" && (
                    <>
                      <button
                        onClick={() => { handleApprove(selectedAppointment.id); setSelectedAppointment(null); }}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { handleReject(selectedAppointment.id); setSelectedAppointment(null); }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border transition ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {/* Complete Button - for doctors with approved/scheduled appointments */}
                  {/* Only show if the doctor is RECEIVING the appointment (not if they booked it as a patient) */}
                  {isDoctor && selectedAppointment.isReceivingDoctor && (selectedAppointment.status === "approved" || selectedAppointment.status === "scheduled") && (
                    <button
                      onClick={() => { 
                        handleAppointmentAction(selectedAppointment.id, "complete"); 
                        setSelectedAppointment(null); 
                      }}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Complete
                    </button>
                  )}

                  {/* Feedback section for completed appointments (patients only) */}
                  {!isDoctor && selectedAppointment.status === "completed" && (
                    selectedAppointment.hasFeedback ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Feedback Given</span>
                        {selectedAppointment.feedbackRating && (
                          <span className="flex items-center gap-0.5 text-amber-500">
                            {"★".repeat(selectedAppointment.feedbackRating)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setFeedbackAppointment(selectedAppointment);
                          setShowFeedbackModal(true);
                          setSelectedAppointment(null);
                        }}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Leave Feedback
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && feedbackAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFeedbackModal(false)}></div>
          <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Share Your Feedback</h3>
                  <p className="text-white/80 text-sm mt-1">Help us improve healthcare</p>
                </div>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Doctor Info */}
              <div className={`flex items-center gap-4 p-4 rounded-xl mb-6 ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {feedbackAppointment.doctorName.split(' ').pop()?.charAt(0) || 'D'}
                </div>
                <div>
                  <p className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{feedbackAppointment.doctorName}</p>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{feedbackAppointment.specialty}</p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{feedbackAppointment.hospital}</p>
                </div>
              </div>

              {/* Star Rating */}
              <div className="mb-6">
                <label className={`block text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  How was your experience?
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className={`text-4xl transition transform hover:scale-110 ${
                        star <= feedbackRating ? "text-amber-400" : isDark ? "text-gray-600" : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className={`text-center text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {feedbackRating === 0 && "Tap to rate"}
                  {feedbackRating === 1 && "Poor"}
                  {feedbackRating === 2 && "Fair"}
                  {feedbackRating === 3 && "Good"}
                  {feedbackRating === 4 && "Very Good"}
                  {feedbackRating === 5 && "Excellent"}
                </p>
              </div>

              {/* Feedback Text */}
              <div className="mb-6">
                <label className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Share your story (optional)
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isDark 
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  }`}
                  placeholder="Tell us about your experience with the doctor..."
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={submitFeedback}
                disabled={feedbackRating === 0 || feedbackSubmitting}
                className={`w-full py-3 rounded-xl font-semibold transition ${
                  feedbackRating === 0 || feedbackSubmitting
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                }`}
              >
                {feedbackSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Submit Feedback"
                )}
              </button>

              {/* Privacy Note */}
              <p className={`text-xs text-center mt-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                Your feedback helps other patients find the right doctor
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}