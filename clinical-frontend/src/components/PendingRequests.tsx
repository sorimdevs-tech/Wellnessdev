import { useState } from "react";
import { useAppointment } from "../context/AppointmentContext";
import { useUser } from "../context/UserContext";

export default function PendingRequests() {
  const { appointments, approveAppointment, rejectAppointment, loading, fetchAppointments } = useAppointment();
  const { user } = useUser();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!user || user.userType !== "doctor") return null;

  // Filter pending appointments into two categories:
  // 1. Patient requests - where this doctor is the RECEIVING doctor (patient_id !== current user id)
  // 2. My bookings - where this doctor booked with another doctor (patient_id === current user id)
  const patientRequests = appointments.filter(
    (apt) => apt.status === "pending" && apt.userId !== user.id
  );
  
  const myBookings = appointments.filter(
    (apt) => apt.status === "pending" && apt.userId === user.id
  );

  const handleApprove = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    const success = await approveAppointment(appointmentId);
    if (success) {
      alert("Appointment approved successfully!");
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
    } else {
      alert("Failed to reject appointment. Please try again.");
    }
    setActionLoading(null);
  };

  const totalPending = patientRequests.length + myBookings.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          Pending Appointments
        </h2>
        <button 
          onClick={() => fetchAppointments()}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : totalPending === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">No pending appointments</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Patient Requests (Can Approve/Reject) */}
          {patientRequests.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Patient Requests ({patientRequests.length})
                </span>
                <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  Needs Action
                </span>
              </div>
              <ul className="space-y-4">
                {patientRequests.map((apt) => (
                  <li key={apt.id} className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {(apt.patient_info?.name || apt.userName || "P").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {apt.patient_info?.name || apt.userName || "Patient"}
                            </p>
                            {apt.patient_info?.mobile && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{apt.patient_info.mobile}</p>
                            )}
                          </div>
                        </div>
                        <div className="ml-12 space-y-1">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Date:</span> {apt.date}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Time:</span> {apt.time}
                          </p>
                          {apt.reason && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              <span className="font-medium">Reason:</span> {apt.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full">
                        Pending
                      </span>
                    </div>
                    <div className="flex gap-3 mt-4 ml-12">
                      <button 
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        onClick={() => handleApprove(apt.id)}
                        disabled={actionLoading === apt.id}
                      >
                        {actionLoading === apt.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                          </>
                        )}
                      </button>
                      <button 
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        onClick={() => handleReject(apt.id)}
                        disabled={actionLoading === apt.id}
                      >
                        {actionLoading === apt.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Decline
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 2: My Bookings (Waiting for approval) */}
          {myBookings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  My Appointments ({myBookings.length})
                </span>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  Awaiting Response
                </span>
              </div>
              <ul className="space-y-4">
                {myBookings.map((apt) => (
                  <li key={apt.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                            {(apt.doctorName || "D").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {apt.doctorName || "Doctor"}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">{(apt as any).specialty}</p>
                          </div>
                        </div>
                        <div className="ml-12 space-y-1">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">🏥</span> {(apt as any).hospital}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">📅</span> {apt.date} at {apt.time}
                          </p>
                          {apt.reason && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              <span className="font-medium">📝</span> {apt.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                        Waiting
                      </span>
                    </div>
                    <div className="mt-3 ml-12">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ⏳ Waiting for doctor to review and respond to your request
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
