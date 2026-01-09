import { useAppointment } from "../context/AppointmentContext";
import { useUser } from "../context/UserContext";

export default function TodaysSchedule() {
  const { appointments, loading, fetchAppointments } = useAppointment();
  const { user } = useUser();
  if (!user || user.currentRole !== "doctor") return null;

  const today = new Date().toLocaleDateString();
  // Show confirmed and approved appointments for today
  const schedule = appointments.filter(
    (apt) => (apt.status === "confirmed" || apt.status === "approved") && apt.date === today
  );

  // Also show upcoming approved appointments (next 7 days)
  const upcomingDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toLocaleDateString();
  });

  const upcoming = appointments.filter(
    (apt) => 
      (apt.status === "confirmed" || apt.status === "approved") && 
      upcomingDates.includes(apt.date) &&
      apt.date !== today
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          Today's Schedule
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
      ) : schedule.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">No appointments for today</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your schedule is clear!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {schedule.map((apt) => (
            <li key={apt.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {(apt.patient_info?.name || apt.userName || "P").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {apt.patient_info?.name || apt.userName || "Patient"}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {apt.time} • {apt.duration}
                  </div>
                  {apt.reason && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{apt.reason}</p>
                  )}
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                  {apt.status === "approved" ? "Approved" : "Confirmed"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Upcoming Appointments */}
      {upcoming.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Upcoming This Week</h3>
          <ul className="space-y-2">
            {upcoming.slice(0, 5).map((apt) => (
              <li key={apt.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    {(apt.patient_info?.name || apt.userName || "P").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {apt.patient_info?.name || apt.userName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{apt.date}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">{apt.time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
