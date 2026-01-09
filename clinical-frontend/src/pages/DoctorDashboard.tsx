import { useState, useMemo } from "react";
import { useUser } from "../context/UserContext";
import { useAppointment } from "../context/AppointmentContext";

export default function DoctorDashboard() {
  const { user } = useUser();
  const {
    appointments,
    confirmAppointment,
    cancelAppointment,
  } = useAppointment();
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const doctorId = user?.id || "";

  const doctorAppointments = useMemo(
    () => appointments.filter((apt) => apt.doctorId === doctorId),
    [appointments, doctorId]
  );

  const pendingAppointments = doctorAppointments.filter(
    (apt) => apt.status === "pending"
  );
  const confirmedAppointments = doctorAppointments.filter(
    (apt) => apt.status === "confirmed" || apt.status === "completed"
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{doctorAppointments.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Appointments</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{pendingAppointments.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{confirmedAppointments.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Confirmed</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">{doctorAppointments.filter((apt) => apt.date.includes(new Date().toISOString().split("T")[0])).length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-6">
            {[{ id: "dashboard", label: "Overview" }, { id: "appointments", label: "Appointments", badge: pendingAppointments.length }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${activeTab === tab.id ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {tab.label}
                {"badge" in tab && (tab.badge as number) > 0 && <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-xs font-semibold text-white px-1">{tab.badge}</span>}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Today's Schedule</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Your confirmed appointments</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab("appointments")} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">View All</button>
                </div>
                <div className="p-5">
                  {confirmedAppointments.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No confirmed appointments</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Schedule will appear here once confirmed</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {confirmedAppointments.slice(0, 3).map((apt) => (
                        <div key={apt.id} className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-gray-900 dark:text-white">{apt.userName}</p>
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">{apt.duration}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {apt.date}  {apt.time}
                          </p>
                          {apt.reason && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2"><span className="font-medium">Reason:</span> {apt.reason}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Pending Requests</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Review and confirm new bookings</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-sm font-semibold rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">{pendingAppointments.length}</span>
                </div>
                <div className="p-5">
                  {pendingAppointments.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No pending requests</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All bookings are confirmed!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingAppointments.slice(0, 3).map((apt) => (
                        <div key={apt.id} className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-gray-900 dark:text-white">{apt.userName}</p>
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">{apt.duration}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-3">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {apt.date} at {apt.time}
                          </p>
                          {apt.reason && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3"><span className="font-medium">Reason:</span> {apt.reason}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => confirmAppointment(apt.id)} className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition">Confirm</button>
                            <button onClick={() => cancelAppointment(apt.id)} className="flex-1 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Decline</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Pending requests</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{pendingAppointments.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Confirmed sessions</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{confirmedAppointments.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total appointments</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{doctorAppointments.length}</span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-600 rounded-lg p-5 text-white">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  Pro Tip
                </h3>
                <p className="text-blue-100 text-sm mb-4">Confirm new bookings early so patients get enough time to prepare for their visit.</p>
                <button onClick={() => setActiveTab("appointments")} className="w-full px-4 py-2.5 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition">Go to appointments</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "appointments" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Pending Appointments</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Review and confirm new booking requests</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">{pendingAppointments.length} pending</span>
              </div>
              {pendingAppointments.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No pending appointments.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pendingAppointments.map((apt) => (
                    <div key={apt.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{apt.userName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{apt.date} at {apt.time}  {apt.duration}</p>
                        {apt.reason && <p className="text-sm text-gray-500 dark:text-gray-500 mt-2"><span className="font-medium text-gray-700 dark:text-gray-300">Reason:</span> {apt.reason}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => confirmAppointment(apt.id)} className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition">Confirm</button>
                        <button onClick={() => cancelAppointment(apt.id)} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Confirmed Appointments</h3>
                <span className="px-2.5 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">{confirmedAppointments.length} scheduled</span>
              </div>
              {confirmedAppointments.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No confirmed appointments yet.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {confirmedAppointments.map((apt) => (
                    <div key={apt.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{apt.userName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{apt.date} at {apt.time}  {apt.duration}</p>
                        {apt.reason && <p className="text-sm text-gray-500 dark:text-gray-500 mt-2"><span className="font-medium text-gray-700 dark:text-gray-300">Reason:</span> {apt.reason}</p>}
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"> Confirmed</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
