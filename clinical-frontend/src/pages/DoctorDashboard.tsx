import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../services/api";

interface DoctorStats {
  totalPatients: number;
  weeklyAppointments: number;
  completedConsultations: number;
  pendingFollowups: number;
}

interface Earnings {
  today: number;
  monthly: number;
  total: number;
  pendingPayments: number;
}

// Mock data - replace with real API calls when backend endpoints are ready
const mockDoctorData = {
  stats: {
    totalPatients: 247,
    weeklyAppointments: 12,
    completedConsultations: 156,
    pendingFollowups: 3,
  },
  earnings: {
    today: 4500,
    monthly: 125000,
    total: 2450000,
    pendingPayments: 15000,
  },
  schedule: [
    { time: "10:00 AM", patient: "Ravi Kumar", status: "confirmed" },
    { time: "11:30 AM", patient: "Priya S", status: "confirmed" },
    { time: "2:00 PM", patient: "Available", status: "open" },
    { time: "4:00 PM", patient: "Suresh M", status: "pending" },
  ],
  reviews: [
    { patientName: "Anita R", comment: "Doctor explained everything clearly and thoroughly!", rating: 5 },
    { patientName: "Rajesh K", comment: "Excellent consultation, very professional.", rating: 5 },
    { patientName: "Meera S", comment: "Highly recommended! Great experience.", rating: 5 },
  ],
};

export default function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DoctorStats>(mockDoctorData.stats);
  const [earnings, setEarnings] = useState<Earnings>(mockDoctorData.earnings);
  const [schedule, setSchedule] = useState(mockDoctorData.schedule);
  const [recentReviews, setRecentReviews] = useState(mockDoctorData.reviews);
  const [loading, setLoading] = useState(false);
const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  const fetchDoctorDashboardData = async () => {
    if (!user?.id) return;
   
    try {
      setLoading(true);
     
      // TODO: Replace with real API endpoints when backend is ready
      // const doctorStats = await apiClient.getDoctorStats(user.id);
      // const earningsData = await apiClient.getDoctorEarnings(user.id);
      // const scheduleData = await apiClient.getDoctorSchedule(user.id);
      // const reviews = await apiClient.getDoctorReviews(user.id);
     
      // Using mock data for now
      setTimeout(() => {
        setStats(mockDoctorData.stats);
        setEarnings(mockDoctorData.earnings);
        setSchedule(mockDoctorData.schedule);
        setRecentReviews(mockDoctorData.reviews);
        setLoading(false);
      }, 800);
     
    } catch (error) {
      console.error("Failed to fetch doctor dashboard data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.currentRole === "doctor") {
      fetchDoctorDashboardData();
    }
  }, [user?.id, user?.currentRole]);

  if (!user || user.currentRole !== "doctor") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Doctor Dashboard</h2>
          <p className="text-gray-600 mb-6">Switch to Doctor role from sidebar to access your personal dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 space-y-6">
      {/* Profile Snapshot */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-2xl">
              {user.name?.charAt(0) || 'D'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name || 'Dr. John Doe'}</h1>
              <p className="text-blue-600 font-semibold text-lg">Cardiologist</p>
              <p className="text-gray-600">Apollo Hospitals, Chennai</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-500">4.8</div>
              <div className="text-sm text-yellow-600">⭐ 127 reviews</div>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-lg transition-all duration-200"
            >
              Edit Profile
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
          <div>8 yrs exp</div>
          <div>247 Total Patients</div>
          <div>4.8 Avg Rating</div>
          <div>24 Online Consults</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Schedule */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">My Schedule</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all text-sm">
                Edit Availability
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all text-sm">
                Block Time
              </button>
            </div>
          </div>
         
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div>
                  <p className="font-semibold text-gray-900">Mon-Fri • 9:00 AM - 6:00 PM</p>
                  <p className="text-sm text-gray-600">Regular Availability</p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">Available</span>
              </div>
              {schedule.map((slot, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-900">{slot.time}</p>
                    <p className="text-sm text-gray-600">{slot.patient}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    slot.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    slot.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {slot.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Work Stats */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 space-y-6">
  <h2 className="text-xl font-bold text-gray-900">My Work Stats</h2>
  <div className="space-y-4">
    {[
      { label: "Total Patients Treated", value: stats.totalPatients, icon: "👥", color: "text-blue-600" },
      { label: "Appointments This Week", value: stats.weeklyAppointments, icon: "📅", color: "text-emerald-600" },
      { label: "Completed Consultations", value: stats.completedConsultations, icon: "✅", color: "text-purple-600" },
      { label: "Follow-ups Pending", value: stats.pendingFollowups, icon: "🔄", color: "text-orange-600" },
    ].map((stat, idx) => (
      <div
        key={idx}
        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all cursor-pointer group"
        onClick={() => {
          // Dynamic modal data based on stat clicked
          const statData = {
            id: `stat-${idx}`,
            status: idx === 3 ? "pending" : idx === 2 ? "completed" : "scheduled",
            patientName: stat.label,
            date: idx === 1 ? "This Week" : "All Time",
            time: stat.value.toString(),
            consultationType: stat.label.includes("Patients") ? "Unique" :
                           stat.label.includes("Week") ? "Weekly" :
                           stat.label.includes("Consultations") ? "Completed" : "Pending"
          };
          setSelectedAppointment(statData);
        }}
      >
        <div>
          <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {loading ? (
              <span className="inline-block w-16 h-8 bg-gray-200 rounded animate-pulse"></span>
            ) : stat.value}
          </p>
          <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">{stat.label}</p>
        </div>
        <div className={`text-2xl ${stat.color} group-hover:scale-110 transition-transform duration-200`}>
          {stat.icon}
        </div>
      </div>
    ))}
  </div>
</div>
      </div>

      {/* Reviews & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Feedback */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Patient Feedback</h2>
          <div className="flex items-center mb-6">
            <div className="text-3xl mr-3">⭐⭐⭐⭐⭐</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">4.8/5</p>
              <p className="text-sm text-gray-600">127 reviews</p>
            </div>
          </div>
          <div className="space-y-4">
            {recentReviews.map((review, idx) => (
              <div key={idx} className="flex gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {review.patientName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{review.patientName}</p>
                  <div className="flex text-yellow-400 text-lg mb-1">⭐⭐⭐⭐⭐</div>
                  <p className="text-sm text-gray-700 line-clamp-2">{review.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Notifications</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {[
              { type: "Your profile was approved ✅", time: "2 min ago" },
              { type: "Payment of ₹4500 processed 💰", time: "1 hr ago" },
              { type: "New 5⭐ review received ⭐", time: "3 hrs ago" },
              { type: "New appointment request 📅", time: "5 hrs ago" },
            ].map((notif, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:shadow-md transition-all">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-3 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{notif.type}</p>
                  <p className="text-xs text-gray-500">{notif.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Documents & Settings */}
      {/* <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Documents</h3>
            <div className="space-y-2">
              {["Degree Certificate", "Medical License", "ID Proof", "Specialization Cert"].map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <span className="text-sm font-medium">{doc}</span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-semibold px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 transition-colors">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Settings</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/settings/password')}
                className="w-full p-3 text-left bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl hover:shadow-md transition-all border border-indigo-100 hover:border-indigo-200 text-sm font-medium"
              >
                🔐 Change Password
              </button>
              <button
                onClick={() => navigate('/settings/bank')}
                className="w-full p-3 text-left bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl hover:shadow-md transition-all border border-emerald-100 hover:border-emerald-200 text-sm font-medium"
              >
                🏦 Bank Details
              </button>
              <button className="w-full p-3 text-left bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all border border-gray-200 hover:border-gray-300 text-sm font-medium">
                🔔 Notification Preferences
              </button>
            </div>
          </div>
        </div> */}
      {/* </div> */}
    </div>
  );
}

