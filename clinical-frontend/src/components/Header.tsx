import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "../context/UserContext";
import { useAppointment } from "../context/AppointmentContext";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";

import ThemeToggle from "./ThemeToggle";

export default function Header() {
    const { user, logout, switchRole } = useUser();
    const { getNotifications, approveAppointment, rejectAppointment, markNotificationAsRead } = useAppointment();
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [userNotifications, setUserNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [appointmentDetails, setAppointmentDetails] = useState<Record<string, any>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get the effective role for fetching notifications
    // A user is considered "doctor" if their userType is doctor OR currentRole is doctor
    const isDoctor = user?.userType === "doctor" || user?.currentRole === "doctor";
    const effectiveRole = isDoctor ? "doctor" : (user?.currentRole || user?.userType || "user");
    
    // Debug: Log role changes
    useEffect(() => {
        console.log("🔔 Header Role Check:", {
            userType: user?.userType,
            currentRole: user?.currentRole,
            isDoctor,
            effectiveRole
        });
    }, [effectiveRole, user?.currentRole, user?.userType, isDoctor]);

    // Memoized fetch function for notifications
    const fetchNotifications = useCallback(async () => {
        if (user?.id) {
            console.log("🔔 Fetching notifications for role:", effectiveRole);
            try {
                const notifications = await getNotifications(user.id, effectiveRole as "user" | "doctor");
                console.log("🔔 Got notifications:", notifications.length, "items");
                notifications.forEach((n: any) => console.log("  - Notification:", n.title, "appointmentId:", n.appointmentId));
                setUserNotifications(notifications);
                setUnreadCount(notifications.filter((n: any) => !n.read).length);
                
                // For doctors, also fetch appointment details
                if (effectiveRole === "doctor") {
                    const appointments = await apiClient.getAppointments() as any[];
                    const aptMap: Record<string, any> = {};
                    if (Array.isArray(appointments)) {
                        appointments.forEach((apt: any) => {
                            // Map by multiple ID formats to ensure matching
                            if (apt.id) aptMap[apt.id] = apt;
                            if (apt._id) aptMap[apt._id] = apt;
                        });
                    }
                    setAppointmentDetails(aptMap);
                    console.log("Appointment details loaded:", aptMap);
                }
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        }
    }, [user?.id, effectiveRole, getNotifications]);

    // Initial fetch + Auto-refresh notifications every 30 seconds
    useEffect(() => {
        fetchNotifications();
        
        // Set up polling interval (30 seconds)
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Also refresh when notification panel is opened
    useEffect(() => {
        if (showNotifications) {
            fetchNotifications();
        }
    }, [showNotifications, fetchNotifications]);

    const refreshNotifications = async () => {
        if (user?.id) {
            try {
                const notifications = await getNotifications(user.id, effectiveRole as "user" | "doctor");
                setUserNotifications(notifications);
                setUnreadCount(notifications.filter((n: any) => !n.read).length);
                if (effectiveRole === "doctor") {
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

    const handleNotificationClick = async (notif: any) => {
        // Mark as read when clicked
        if (!notif.read && notif.id) {
            try {
                await markNotificationAsRead(notif.id);
                // Update local state to reflect read status
                setUserNotifications(prev => 
                    prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
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
                alert("Failed to approve. Make sure you're in Doctor mode.");
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
                alert("Failed to reject. Make sure you're in Doctor mode.");
            }
        } catch (error) {
            console.error("Failed to reject:", error);
            alert("Failed to reject appointment.");
        }
        setActionLoading(null);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }

        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen]);

    return (
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
                <div className="flex items-center justify-between h-20">
                    {/* Logo & Branding */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
                        <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=48&h=48&fit=crop" alt="Wellness Logo" className="w-12 h-12 rounded-xl shadow-lg object-cover" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Wellness Dev</h1>
                            <p className="text-xs text-gray-500">Healthcare Platform</p>
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3">
                        <ThemeToggle />

                        {/* ENHANCED NOTIFICATION BUTTON */}
                        <button
                            onClick={() => setShowNotifications(true)}
                            className="relative p-3 bg-gray-100 hover:bg-gray-200 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group"
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

                        {/* Doctor-specific menu/actions */}
                        {user?.currentRole === "doctor" && (
                            <>
                                <button
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition mr-2"
                                    onClick={() => navigate("/dashboard#pending-requests")}
                                >
                                    Pending Requests
                                </button>
                                <button
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition mr-2"
                                    onClick={() => navigate("/dashboard#todays-schedule")}
                                >
                                    Today's Schedule
                                </button>
                                <button
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition mr-2"
                                    onClick={() => navigate("/dashboard#availability")}
                                >
                                    My Availability
                                </button>
                                <button
                                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition mr-2"
                                    onClick={() => navigate("/dashboard#my-cases")}
                                >
                                    My Cases
                                </button>
                            </>
                        )}

                        {/* Profile Icon Button */}
                        <button 
                            onClick={() => navigate("/profile")}
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-blue-100 transition-colors"
                            title="Profile"
                        >
                            <svg className="w-6 h-6 text-gray-600 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                <circle cx="12" cy="7" r="4" strokeWidth={2} />
                            </svg>
                        </button>

                        {/* Chat Icon Button */}
                        <button 
                            onClick={() => navigate("/chat")}
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-green-100 transition-colors"
                            title="Chat"
                        >
                            <svg className="w-6 h-6 text-gray-600 hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </button>

                        {/* Settings Icon Button */}
                        <button 
                            onClick={() => navigate("/settings")}
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-purple-100 transition-colors"
                            title="Settings"
                        >
                            <svg className="w-6 h-6 text-gray-600 hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            </svg>
                        </button>

                        {/* User Profile Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                    </svg>
                                </div>
                                <span className="hidden sm:inline text-sm font-medium text-gray-700">{user?.name || "User"}</span>
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                    <div className="px-4 py-3 border-b border-gray-200">
                                        <p className="font-semibold text-gray-900 text-sm">{user?.name || "User"}</p>
                                        <p className="text-xs text-gray-500">{user?.userType === "doctor" ? "Healthcare Provider" : "Patient"}</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('Header: My Profile clicked');
                                            setIsDropdownOpen(false);
                                            navigate("/profile");
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-2"
                                    >

                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v10a2 2 0 002 2h5m0 0h5a2 2 0 002-2m0 0V6a2 2 0 00-2-2h-5m0 0V5a2 2 0 00-2-2h-.5A2.5 2.5 0 003 7.5V9m0 0h18" />
                                        </svg>
                                        My Profile
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('Header: Settings clicked');
                                            setIsDropdownOpen(false);
                                            navigate("/settings");
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-2"
                                    >

                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        </svg>
                                        Settings
                                    </button>
                                    <div className="px-4 py-3 border-t border-gray-200 bg-blue-50">
                                        <p className="text-xs font-semibold text-blue-600 mb-2">🔐 SESSION</p>
                                        <p className="text-xs text-gray-600">Status: <span className="font-bold text-green-600">Active</span></p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            logout();
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 text-sm flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
                            {/* Refresh button */}
                            <button
                                onClick={fetchNotifications}
                                className="ml-2 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Refresh notifications"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                            {unreadCount > 0 && (
                                <span className="ml-auto bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full px-3 py-1 shadow animate-pulse">
                                    {unreadCount} unread
                                </span>
                            )}
                        </div>
                        {/* Debug: Show current role */}
                        <div className={`mb-4 p-3 rounded-lg text-sm ${isDoctor ? "bg-emerald-100 border border-emerald-300" : "bg-amber-100 border border-amber-300"}`}>
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${isDoctor ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                                <span className="font-medium">
                                    Mode: <span className={isDoctor ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                                        {isDoctor ? "DOCTOR" : "USER"}
                                    </span>
                                </span>
                            </div>
                            {isDoctor ? (
                                <p className="text-xs text-emerald-600 mt-1">✓ You can approve/reject appointment requests</p>
                            ) : (
                                <p className="text-xs text-amber-600 mt-1">⚠ Login as a doctor to approve/reject appointments</p>
                            )}
                        </div>
                        <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                            {userNotifications.length === 0 ? (
                                <div className="py-12 text-center text-gray-400">No notifications yet.</div>
                            ) : (
                                userNotifications.map((notif, idx) => {
                                    const appointment = notif.appointmentId ? appointmentDetails[notif.appointmentId] : null;
                                    const appointmentIsPending = appointment ? appointment.status === "pending" : true;
                                    
                                    // SIMPLE RULE: Only show Approve/Reject buttons when:
                                    // 1. Doctor mode is ON
                                    // 2. Notification title is EXACTLY "New Appointment Request"
                                    // 3. Appointment is pending
                                    // 
                                    // Do NOT show buttons for "Appointment Requested" (patient's booking confirmation)
                                    const showApproveReject = isDoctor && 
                                                              notif.title === "New Appointment Request" &&
                                                              appointmentIsPending;
                                    
                                    // Debug log
                                    console.log(`📬 Notification[${idx}]:`, {
                                        title: notif.title,
                                        isDoctor,
                                        appointmentIsPending,
                                        showApproveReject
                                    });
                                    
                                    return (
                                        <div
                                            key={notif.id || idx}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={`py-4 px-3 rounded-xl transition-all duration-200 cursor-pointer hover:bg-gray-50 ${!notif.read ? "bg-blue-50/60" : "bg-white"}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className={`mt-1 w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${
                                                    showApproveReject ? "bg-amber-500 text-white" : 
                                                    !notif.read ? "bg-blue-500/90 text-white" : "bg-gray-200 text-gray-400"
                                                }`}>
                                                    {notif.title?.toLowerCase().includes("appointment") ? (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                        </svg>
                                                    )}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`font-bold ${!notif.read ? "text-gray-900" : "text-gray-500"}`}>{notif.title}</p>
                                                        {!notif.read && (
                                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                                        )}
                                                    </div>
                                                    <p className={`text-sm mt-1 ${!notif.read ? "text-gray-700" : "text-gray-500"}`}>{notif.message}</p>
                                                    
                                                    {/* Show pending badge for doctor appointment requests */}
                                                    {showApproveReject && (
                                                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                            </svg>
                                                            Pending Approval
                                                        </div>
                                                    )}
                                                    
                                                    {notif.createdAt && (
                                                        <p className="text-xs text-gray-400 mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Approve/Reject Buttons for Doctor */}
                                            {showApproveReject && (
                                                <div className="flex gap-2 mt-3 ml-11">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (notif.appointmentId) {
                                                                handleApprove(notif.appointmentId);
                                                            } else {
                                                                alert("Cannot approve: Appointment ID not found in notification");
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
                                                                alert("Cannot reject: Appointment ID not found in notification");
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
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
