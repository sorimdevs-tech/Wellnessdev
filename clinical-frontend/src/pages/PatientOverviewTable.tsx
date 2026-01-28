import { useState, useEffect, useMemo } from "react";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/api";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useNavigate } from "react-router-dom";
 
// ------------------- TYPES -------------------
type DateFilter = "30" | "60" | "90" | "180" | "365" | "all";
type StatusFilter = "all" | "inprogress" | "completed";
 
interface UserProfile {
  _id: string;
  name: string;
  email: string;
  mobile?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  userType: string;
  currentRole?: string;
}
 
interface PatientRecord {
  id: string;
  patientId: string;
  profile: UserProfile;
  // doctorName: string;
  specialty?: string;
  department: string;
  consultationType: string;
  hospital: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentDay: string;
  status: string;
  notes?: string;
  hasFeedback: boolean;
  feedbackRating: number;
  isReceivingDoctor: boolean;
}
 
// ------------------- PATIENT MODAL -------------------
// ✅ ALL INTERFACES DECLARED HERE - No import issues!
interface MedicalRecord {
  id?: string;
  _id?: string;
  title?: string;
  original_filename?: string;
  file_name?: string;
  file_size?: number;
  record_type?: string;
  description?: string;
  appointment_id?: string;
  created_at?: string;
}
 
interface PatientProfile {
  name: string;
  dateOfBirth?: string;
  gender?: string;
  mobile?: string;
  email?: string;
}
 
interface PatientRecord {
  id: string;
  patientId: string;
  appointmentDate: string;
  appointmentDay: string;
  appointmentTime: string;
  status: string;
  notes?: string;
}
 
const PatientModal = ({
  isOpen,
  onClose,
  patient,
}: {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord | null;
}) => {
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showDocumentsSection, setShowDocumentsSection] = useState(false);
 
  useEffect(() => {
    if (!patient?.id) return;
 
    const fetchMedicalRecords = async () => {
      try {
        setDocsLoading(true);
       
        // ✅ FIXED: Type-safe API response handling
        const recordsRes: any = await apiClient.getMedicalRecordsByAppointment(patient.id);
       
        // ✅ FIXED: Proper type-safe extraction
        let records: MedicalRecord[] = [];
       
        if (Array.isArray(recordsRes)) {
          records = recordsRes;
        } else if (recordsRes?.data && Array.isArray(recordsRes.data)) {
          records = recordsRes.data;
        } else if (recordsRes?.records && Array.isArray(recordsRes.records)) {
          records = recordsRes.records;
        }
       
        setMedicalRecords(records);
      } catch (err) {
        console.error("Failed to fetch medical records:", err);
        setMedicalRecords([]);
      } finally {
        setDocsLoading(false);
      }
    };
 
    fetchMedicalRecords();
  }, [patient?.id]);
 
  if (!isOpen || !patient) return null;
 
  const profile = patient.profile;
  const dob = profile.dateOfBirth ? new Date(profile.dateOfBirth) : null;
 
  const calculateAge = (date: Date): number => {
    const diff = Date.now() - date.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };
 
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown size";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };
 
  const getFileIcon = (name?: string, recordType?: string): string => {
    if (!name) return "📄";
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith(".pdf")) return "📕";
    if (lowerName.match(/\.(jpg|jpeg|png|webp)$/)) return "🖼️";
    if (lowerName.match(/\.(doc|docx)$/)) return "📘";
    if (recordType === "lab_report") return "🧪";
    if (recordType === "prescription") return "💊";
    if (recordType === "pre_appointment") return "📎";
    return "📄";
  };
 
  const handleDownloadMedicalFile = async (record: MedicalRecord): Promise<void> => {
    try {
      const fileName = record.original_filename || record.file_name || record.title || "document";
      await apiClient.downloadMedicalFile(patient.id, fileName);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download file. Please try again.");
    }
  };
 
  const handleViewMedicalFile = async (record: MedicalRecord): Promise<void> => {
    try {
      const fileName = record.original_filename || record.file_name || record.title || "document";
      await apiClient.viewMedicalFile(patient.id, fileName);
    } catch (err) {
      console.error("View error:", err);
      alert("Failed to view file. Please try again.");
    }
  };
 
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl relative overflow-hidden border border-gray-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-400 to-indigo-400 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Patient Profile</h1>
              <p className="mt-1">Patient ID: {patient.patientId}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-2xl flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
 
        <div className="p-8 grid lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN - Profile */}
          <div>
            <div className="text-center mb-8">
              <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-4xl font-bold shadow-2xl mb-4">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{profile.name}</h2>
              {profile.gender && (
                <span className="inline-flex px-4 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-2xl">
                  {profile.gender}
                </span>
              )}
            </div>
 
            <div className="space-y-3">
              {profile.dateOfBirth && (
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-sm text-gray-500">DOB</p>
                  <p className="font-semibold">{dob?.toLocaleDateString("en-IN")}</p>
                </div>
              )}
              {dob && (
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="font-semibold">{calculateAge(dob)} years</p>
                </div>
              )}
              {profile.mobile && (
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-sm text-gray-500">Mobile</p>
                  <p className="font-semibold">{profile.mobile}</p>
                </div>
              )}
              {profile.email && (
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold text-sm break-all">{profile.email}</p>
                </div>
              )}
            </div>
          </div>
 
          {/* MIDDLE COLUMN - Appointment Details */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Appointment Details</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm font-semibold text-blue-800">Date</p>
                <p className="text-lg font-bold">
                  {new Date(patient.appointmentDate).toLocaleDateString("en-IN")}
                </p>
                <p className="text-sm text-gray-600">
                  {patient.appointmentDay}, {patient.appointmentTime}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm font-semibold text-gray-700 mb-2">Status</p>
                <span className="inline-block px-6 py-3 text-sm font-bold rounded-2xl bg-green-100 text-green-800">
                  {patient.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
 
          {/* RIGHT COLUMN - Notes & Medical Records */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Patient Notes</h3>
            <textarea
              value={patient.notes || ""}
              readOnly
              className="w-full h-40 p-4 bg-white border rounded-2xl text-sm resize-none focus:outline-none"
            />
 
            {/* MEDICAL RECORDS BUTTON */}
            <div className="mt-4">
              <button
                onClick={() => setShowDocumentsSection(!showDocumentsSection)}
                disabled={docsLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {showDocumentsSection ? "Hide" : "View"} Medical Records
                {docsLoading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin ml-1" />
                )}
              </button>
            </div>
 
            {/* MEDICAL RECORDS SECTION */}
            {showDocumentsSection && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  🏥 Medical Records ({medicalRecords.length})
                </h4>
 
                {docsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <span className="ml-3 text-sm text-gray-500">Loading medical records...</span>
                  </div>
                ) : medicalRecords.length === 0 ? (
                  <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl text-center border-2 border-dashed border-gray-200">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h5 className="text-lg font-semibold text-gray-900 mb-1">No Medical Records</h5>
                    <p className="text-sm text-gray-500">No documents uploaded for this appointment.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {medicalRecords.map((record, index) => (
                      <div
                        key={record.id || record._id || index}
                        className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-2xl flex-shrink-0">
                            {getFileIcon(record.original_filename, record.record_type)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate group-hover:text-indigo-700">
                              {record.title || record.original_filename || "Medical Document"}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {record.record_type?.replace('_', ' ')} • {formatFileSize(record.file_size)}
                            </p>
                            {record.description && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {record.description}
                              </p>
                            )}
                          </div>
                        </div>
 
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <button
                            onClick={() => handleViewMedicalFile(record)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-1 shadow-sm hover:shadow-md"
                            title="View in new tab"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            View
                          </button>
                          <button
                            onClick={() => handleDownloadMedicalFile(record)}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition flex items-center gap-1 shadow-sm hover:shadow-md"
                            title="Download"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
 
 
// ------------------- CUSTOM HOOK -------------------
const usePatientData = (userId: string) => {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const appointments = await apiClient.getAppointments();
       
        const mappedRecords: PatientRecord[] = Array.isArray(appointments)
         ? appointments.map((apt: any) => {
            const appointmentDate = new Date(apt.appointment_date || apt.date || Date.now());
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = dayNames[appointmentDate.getDay()];
           
            return {
              id: apt._id || apt.id,
              patientId: apt.patient_info?.id || apt.patient_id || apt.user_id || "",
              profile: {
                _id: apt.patient_info?.id || apt.patient_id || "",
                name: apt.patient_info?.name || apt.patient_name || apt.user_name || "Patient",
                email: apt.patient_email || apt.user_email || "",
                mobile: apt.patient_info?.mobile || apt.patient_mobile,
                phone: apt.patient_info?.phone,
                address: apt.patient_info?.address,
                dateOfBirth: apt.patient_info?.dateOfBirth,
                gender: apt.patient_info?.gender,
                bloodGroup: apt.patient_info?.bloodGroup,
                emergencyContact: apt.patient_info?.emergencyContact,
                userType: "patient",
                currentRole: apt.patient_info?.currentRole,
              },
              // doctorName: apt.doctorName || apt.doctor_name || "Unknown Doctor",
              // specialty: apt.specialty || apt.doctor_specialty || "",
              department: apt.department || apt.specialty || "General",
              consultationType: apt.consultationType || "In-Person",
              hospital: apt.hospital || "Unknown Hospital",
              appointmentDate: apt.appointment_date || apt.date || "",
              appointmentTime: appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
              appointmentDay: dayName,
              status: apt.status || "inprogress",
              notes: apt.notes || apt.reason || "",
              hasFeedback: apt.has_feedback || false,
              feedbackRating: apt.feedback_rating || 0,
              isReceivingDoctor: apt.doctor_id === userId,
            };
          })
         : [];
 
        const userRecords = mappedRecords.filter(r => r.isReceivingDoctor && userId);
 
        setRecords(
          userRecords.sort(
            (a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
          )
        );
      } catch (err) {
        console.error("Failed to fetch patient data:", err);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
 
    if (userId) fetchData();
  }, [userId]);
 
  return { records, loading };
};
 
// ------------------- STATUS COLOR HELPER -------------------
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    confirmed: "bg-green-100 text-green-800 border-2 border-green-200",
    approved: "bg-green-100 text-green-800 border-2 border-green-200",
    completed: "bg-green-100 text-green-800 border-2 border-green-200",
    scheduled: "bg-blue-100 text-blue-800 border-2 border-blue-200",
    inprogress: "bg-yellow-100 text-yellow-800 border-2 border-yellow-200",
    cancelled: "bg-red-100 text-red-800 border-2 border-red-200",
    rejected: "bg-red-100 text-red-800 border-2 border-red-200",
  };
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800 border-2 border-gray-200";
};
 
// ------------------- MAIN COMPONENT -------------------
export default function PatientOverviewTable() {
  const { user } = useUser();
  const userId = user?.id || "";
 
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("30");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
 
  const { records, loading } = usePatientData(userId);
const [rowSelection, setRowSelection] = useState({});
 
  // Table columns - NOTES column first after basic columns
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<PatientRecord>();
   
    return [
       columnHelper.accessor('profile.name', {
  id: 'name',
  header: 'Patient',
  size: 220,
 
  cell: ({ row }) => (
    <div className="flex items-center gap-1">
     
      {/* Name + Email */}
      <div className="leading-tight">
        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
          {row.original.profile.name}
        </div>
        {row.original.profile.email && (
          <div className="text-xs text-gray-500 truncate max-w-xs">
            {row.original.profile.email}
          </div>
        )}
      </div>
 
      {/* Small neat human icon AFTER name */}
      <div className="w-5 h-5 flex items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 14c4 0 7 2 7 4v1H5v-1c0-2 3-4 7-4zm0-2a4 4 0 100-8 4 4 0 000 8z"
          />
        </svg>
      </div>
 
    </div>
  ),
}),
 
      // Date & Time
      columnHelper.accessor('appointmentDate', {
        id: 'date',
        header: 'Date & Day',
        size: 160,
        cell: ({ row }) => (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {new Date(row.original.appointmentDate).toLocaleDateString('en-IN')}
            </div>
            <div className="text-xs text-gray-500">
              {row.original.appointmentDay} • {row.original.appointmentTime}
            </div>
          </div>
        ),
      }),
      // // Doctor & Specialty
      // columnHelper.accessor('doctorName', {
      //   id: 'doctor',
      //   header: 'Doctor',
      //   size: 160,
      //   cell: ({ row }) => (
      //     <div>
      //       <div className="text-sm font-medium text-gray-900">
      //         {row.original.doctorName}
      //       </div>
      //       <div className="text-xs text-gray-500">
      //         {row.original.specialty || "General"}
      //       </div>
      //     </div>
      //   ),
      // }),
     // ✅ FIXED NOTES COLUMN - No more TypeScript error
columnHelper.accessor('notes', {
  id: 'notes',
  header: 'Notes',
  size: 220,
  cell: ({ getValue }) => {
    const notes = getValue() as string | undefined;
    if (!notes || notes.length === 0) return "No notes";
   
    return notes.length > 50
      ? `${notes.substring(0, 50)}...`
      : notes;
  },
}),
 
      // Status - IMPROVED styling
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        size: 140,
        cell: ({ getValue }) => {
          const status = getValue() as string;
          return (
            <span className={`inline-flex px-4 py-2 text-xs font-bold rounded-2xl shadow-md border-2 ${getStatusColor(status)}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          );
        },
      }),
    ];
  }, []);
 
  // Filtered data
  const tableData = useMemo(() => {
    let filtered = records;
 
    // Status filter
if (statusFilter !== "all") {
  if (statusFilter === "inprogress") {
    filtered = filtered.filter(r =>
      ["inprogress", "pending"].includes(r.status.toLowerCase())
    );
  } else if (statusFilter === "completed") {
    filtered = filtered.filter(r =>
      ["confirmed", "completed", "approved"].includes(r.status.toLowerCase())
    );
  }
}
 
    // Date filter
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(r => new Date(r.appointmentDate) >= cutoff);
    }
 
    // Search filter (includes notes)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(r =>
        r.profile.name.toLowerCase().includes(term) ||
        // r.doctorName.toLowerCase().includes(term) ||
        (r.specialty || "").toLowerCase().includes(term) ||
        r.profile.email.toLowerCase().includes(term) ||
        (r.profile.mobile || "").toLowerCase().includes(term) ||
        (r.notes || "").toLowerCase().includes(term)
      );
    }
 
    return filtered;
  }, [records, searchTerm, dateFilter, statusFilter]);
 
  // Table instance
  const table = useReactTable({
  data: tableData,
  columns,
 
  state: {
    rowSelection,
  },
 
  enableRowSelection: true,
  onRowSelectionChange: setRowSelection,
 
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
 
  initialState: {
    pagination: {
      pageSize: 10,
    },
  },
});
 
  const handleViewPatient = (patient: PatientRecord) => {
    setSelectedPatient(patient);
  };
 
  const handleCloseModal = () => {
    setSelectedPatient(null);
  };
 
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="text-lg text-gray-600 font-medium">Loading patient records...</p>
        </div>
      </div>
    );
  }
 
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 max-w-10xl mx-auto">
        {/* Header */}
        <div className="mb-8">
 
        {/* Stats + Compact Search + Filters */}
<div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
 
  {/* Stats Cards */}
  <div className="flex items-center gap-4 flex-wrap">
  <div className={`text-center p-3 border rounded-xl min-w-[72px] cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
    statusFilter === "all" ? "bg-blue-100 border-blue-300 shadow-lg ring-2 ring-blue-200" : "bg-blue-50 border border-blue-100 hover:bg-blue-100"
  }`} onClick={() => setStatusFilter("all")}>
    <div className="text-xl font-bold text-blue-600">{tableData.length}</div>
    <div className="text-xs font-medium text-blue-800">Total</div>
  </div>
 
  <div className={`text-center p-3 border rounded-xl min-w-[72px] cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
    statusFilter === "inprogress" ? "bg-yellow-100 border-yellow-300 shadow-lg ring-2 ring-yellow-200" : "bg-yellow-50 border border-yellow-100 hover:bg-yellow-100"
  }`} onClick={() => setStatusFilter("inprogress")}>
    <div className="text-xl font-bold text-yellow-600">
      {/* ✅ FIXED: Include both "pending" AND "inprogress" */}
      {records.filter(r =>
        r.status.toLowerCase() === "inprogress" ||
        r.status.toLowerCase() === "pending"
      ).length}
    </div>
    <div className="text-xs font-medium text-yellow-800">In Progress</div>
  </div>
 
  <div className={`text-center p-3 border rounded-xl min-w-[72px] cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
    statusFilter === "completed" ? "bg-green-100 border-green-300 shadow-lg ring-2 ring-green-200" : "bg-green-50 border border-green-100 hover:bg-green-100"
  }`} onClick={() => setStatusFilter("completed")}>
    <div className="text-xl font-bold text-green-600">
      {records.filter(r => ['confirmed', 'completed', 'approved'].includes(r.status.toLowerCase())).length}
    </div>
    <div className="text-xs font-medium text-green-800">Completed</div>
  </div>
</div>
 
  {/* Right Side Controls */}
  <div className="flex items-center gap-4 flex-wrap">
 
    {/* Compact Search */}
    <div className="w-64">
      <div className="relative">
        <input
          type="text"
          placeholder="Search patients, notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm transition-all duration-200"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
 
    {/* Filters & Clear */}
    <div className="flex items-center gap-4">
      <select
        value={dateFilter}
        onChange={(e) => setDateFilter(e.target.value as DateFilter)}
        className="px-5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm"
      >
        <option value="30">30 Days</option>
        <option value="60">60 Days</option>
        <option value="90">90 Days</option>
        <option value="180">6 Month</option>
        <option value="365">1 Year</option>
        <option value="all">All</option>
      </select>
 
      {(searchTerm || dateFilter !== '30' || statusFilter !== 'all') && (
        <button
          onClick={() => {
            setSearchTerm("");
            setDateFilter("30" as DateFilter);
            setStatusFilter("all");
          }}
          className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg font-medium transition-all duration-200 shadow-sm whitespace-nowrap"
        >
          Clear
        </button>
      )}
    </div>
  </div>
</div>
        </div>
 
 
     
{/* Table */}
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <div className="overflow-x-auto">
  <table className="w-full border-collapse">
  <thead className="bg-gray-50">
    {table.getHeaderGroups().map(headerGroup => (
      <tr key={headerGroup.id}>
 
        {/* Row Number Header */}
        <th className="w-10 px-1 py-2 text-xs font-semibold text-gray-400 border-b border-gray-200 text-left">
          S.NO
        </th>
 
        {/* Select All Checkbox */}
        <th className="w-12 px-1 py-2 border-b border-gray-200 text-center">
          {/* <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="w-4 h-4 cursor-pointer"
          /> */}
        </th>
 
        {headerGroup.headers.map(header => (
          <th
            key={header.id}
            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
            className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 select-none"
            style={{ width: `${header.getSize()}px` }}
          >
            <div className="flex items-center gap-1">
              {flexRender(header.column.columnDef.header, header.getContext())}
 
              {{
                asc: <span className="text-gray-400 text-[10px]">▲</span>,
                desc: <span className="text-gray-400 text-[10px]">▼</span>,
              }[header.column.getIsSorted() as string] ?? (
                <span className="text-gray-300 text-[10px]">⇅</span>
              )}
            </div>
          </th>
        ))}
      </tr>
    ))}
  </thead>
 
  <tbody className="divide-y divide-gray-100">
    {table.getRowModel().rows.map((row, index) => (
      <tr
        key={row.id}
        className={`transition-colors ${
          row.getIsSelected() ? "bg-blue-50" : "hover:bg-gray-50"
        }`}
        onClick={() => handleViewPatient(row.original)}
      >
        {/* Row Number */}
        <td className="px-2 py-3 text-sm text-gray-400">
          {index + 1}
        </td>
 
        {/* Row Checkbox */}
        <td
          className="px-2 py-3 text-center"
          onClick={e => e.stopPropagation()}
        >
          {/* <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 cursor-pointer"
          /> */}
        </td>
 
        {row.getVisibleCells().map(cell => (
          <td
            key={cell.id}
            className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap"
            style={{ width: `${cell.column.getSize()}px` }}
          >
            {/* PATIENT COLUMN OVERRIDE */}
            {cell.column.id === "patientName" ? (
              <div className="flex items-center gap-1">
                {/* <span className="font-medium text-gray-900"></span> */}
                <div className="w-5 h-5 flex items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 14c4 0 7 2 7 4v1H5v-1c0-2 3-4 7-4zm0-2a4 4 0 100-8 4 4 0 000 8z"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </td>
        ))}
      </tr>
    ))}
  </tbody>
</table>
 
 
  </div>
 
 
  {/* Pagination Footer */}
  <div className="px-6 py-4 bg-white border-t border-gray-200">
    <div className="flex items-center justify-between">
 
      {/* Showing entries text */}
      <div className="text-sm text-gray-500">
        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
      </div>
 
      <div className="flex items-center gap-3">
 
        {/* Previous Button */}
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ‹
        </button>
 
        {/* Next Button */}
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ›
        </button>
 
        {/* Page Size Select */}
        <select
          value={table.getState().pagination.pageSize}
          onChange={e => table.setPageSize(Number(e.target.value))}
          className="ml-2 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
</div>
 
 
        {/* Empty State */}
        {table.getRowModel().rows.length === 0 && !loading && (
          <div className="text-center py-20 px-8 bg-white rounded-2xl border border-gray-200 shadow-sm mt-8">
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center shadow-lg">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No patient records found</h3>
            <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">Try adjusting your filters or check back later.</p>
          </div>
        )}
 
        {/* Patient Modal */}
        <PatientModal
          isOpen={!!selectedPatient}
          onClose={handleCloseModal}
          patient={selectedPatient}
        />
      </div>
    </div>
  );
}
 