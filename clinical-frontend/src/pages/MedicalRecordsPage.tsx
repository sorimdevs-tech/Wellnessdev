import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/api";
import {
  HiDocument,
  HiUpload,
  HiDownload,
  HiTrash,
  HiEye,
  HiX,
  HiCalendar,
  HiOfficeBuilding,
  HiUser,
  HiDocumentText,
  HiPhotograph,
  HiFilter,
} from "react-icons/hi";

interface MedicalFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

interface MedicalRecord {
  _id: string;
  id?: string;
  patient_id?: string;
  patient_name?: string;
  title: string;
  description?: string;
  record_type: string;
  date?: string;
  hospital_name?: string;
  doctor_name?: string;
  files?: MedicalFile[];
  file_path?: string;
  original_filename?: string;
  file_size?: number;
  appointment_id?: string;
  uploaded_by?: string;
  created_at?: string;
  createdAt?: string;
  source?: string;  // 'chat' or 'upload'
  conversation_id?: string;  // If uploaded via chat
}

interface Patient {
  id: string;
  name: string;
}

export default function MedicalRecordsPage() {
  const { user } = useUser();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  const [newRecord, setNewRecord] = useState({
    title: "",
    description: "",
    record_type: "lab_report",
    hospital_name: "",
    doctor_name: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const recordTypes = [
    { value: "lab_report", label: "Lab Report", icon: HiDocumentText },
    { value: "prescription", label: "Prescription", icon: HiDocument },
    { value: "scan", label: "Scan/X-Ray", icon: HiPhotograph },
    { value: "discharge_summary", label: "Discharge Summary", icon: HiDocumentText },
    { value: "other", label: "Other", icon: HiDocument },
  ];

  useEffect(() => {
    fetchRecords();
    if (user?.currentRole === "doctor") {
      fetchPatients();
    }
  }, [user?.currentRole]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMedicalRecords();
      const recordsList = (response as MedicalRecord[]) || [];
      setRecords(recordsList);
      
      // Extract unique patients from records for doctor view
      if (user?.currentRole === "doctor") {
        const patientMap = new Map<string, Patient>();
        recordsList.forEach(r => {
          if (r.patient_id && !patientMap.has(r.patient_id)) {
            patientMap.set(r.patient_id, {
              id: r.patient_id,
              name: r.patient_name || `Patient ${r.patient_id.substring(0, 8)}...`
            });
          }
        });
        setPatients(Array.from(patientMap.values()));
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      setRecords([]); // Don't show dummy data, show empty state
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    // Try to get patients from appointments
    try {
      const appointments = await apiClient.getAppointments();
      if (Array.isArray(appointments)) {
        const patientMap = new Map<string, Patient>();
        appointments.forEach((appt: any) => {
          if (appt.patient_id && !patientMap.has(appt.patient_id)) {
            patientMap.set(appt.patient_id, {
              id: appt.patient_id,
              name: appt.patient_info?.name || appt.patient_name || `Patient ${appt.patient_id.substring(0, 8)}...`
            });
          }
        });
        // Merge with existing patients
        setPatients(prev => {
          const merged = new Map(prev.map(p => [p.id, p]));
          patientMap.forEach((v, k) => merged.set(k, v));
          return Array.from(merged.values());
        });
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const handleUpload = async () => {
    if (!newRecord.title || selectedFiles.length === 0) return;
    
    // For doctors, require patient selection
    if (user?.currentRole === "doctor" && !selectedPatientId) {
      alert("Please select a patient");
      return;
    }
    
    // Determine patient ID - for users it's themselves, for doctors it's the selected patient
    const targetPatientId = user?.currentRole === "doctor" ? selectedPatientId : user?.id;
    
    setUploading(true);
    try {
      // Upload files to backend
      const uploadedRecords: MedicalRecord[] = [];
      
      for (const file of selectedFiles) {
        const result = await apiClient.uploadMedicalFile(
          file,
          targetPatientId || '', // patient_id - either self or selected patient
          newRecord.title,
          newRecord.record_type,
          newRecord.description || undefined
        );
        
        if (result && result.record) {
          uploadedRecords.push({
            ...result.record,
            _id: result.record._id || result.id,
          });
        }
      }
      
      // Refresh records from backend
      await fetchRecords();
      
      setShowUploadModal(false);
      resetForm();
      alert("Files uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading record:", error);
      alert(error.message || "Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setNewRecord({
      title: "",
      description: "",
      record_type: "lab_report",
      hospital_name: "",
      doctor_name: "",
      date: new Date().toISOString().split("T")[0],
    });
    setSelectedFiles([]);
    setSelectedPatientId("");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    
    try {
      await apiClient.deleteMedicalRecord(id);
      setRecords(records.filter((r) => r._id !== id));
      alert("Record deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting record:", error);
      alert(error.message || "Failed to delete record. You may not have permission.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredRecords = records.filter((record) => {
    const matchesType = filterType === "all" || record.record_type === filterType;
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      lab_report: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      prescription: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      scan: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      discharge_summary: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      other: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    };
    return colors[type] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user?.currentRole === "doctor" ? "Patient Medical Records" : "Medical Records"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {user?.currentRole === "doctor" 
              ? "View and manage medical records for your patients"
              : "Manage and view your medical documents"
            }
          </p>
        </div>
        {/* Both users and doctors can upload records */}
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <HiUpload className="w-4 h-4" />
          Upload Record
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-700 dark:text-white placeholder-gray-400"
              placeholder="Search records..."
            />
          </div>
          <div className="flex items-center gap-2">
            <HiFilter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {recordTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Records Grid */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map((record) => (
            <div
              key={record._id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center">
                    <HiDocument className="w-6 h-6 text-white" />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.record_type)}`}>
                    {recordTypes.find((t) => t.value === record.record_type)?.label || "Other"}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">{record.title}</h3>
                {record.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{record.description}</p>
                )}

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <HiCalendar className="w-4 h-4" />
                    <span>{record.createdAt ? formatDate(record.createdAt) : record.date ? formatDate(record.date) : 'N/A'}</span>
                  </div>
                  {record.record_type && (
                    <div className="flex items-center gap-2">
                      <HiDocument className="w-4 h-4" />
                      <span className="capitalize">{record.record_type.replace('_', ' ')}</span>
                    </div>
                  )}
                  {user?.currentRole === "doctor" && (record.patient_name || record.patient_id) && (
                    <div className="flex items-center gap-2">
                      <HiUser className="w-4 h-4" />
                      <span>{record.patient_name || `Patient ID: ${record.patient_id}`}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {record.files && record.files.length > 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {record.files.length} file(s) • {formatFileSize(record.files.reduce((acc, f) => acc + f.size, 0))}
                    </p>
                  ) : record.file_path ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      1 file • {record.file_size ? formatFileSize(record.file_size) : 'Unknown size'}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">No files attached</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRecord(record);
                        setShowViewModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition text-sm font-medium"
                    >
                      <HiEye className="w-4 h-4" />
                      View
                    </button>
                    {/* Users can delete their own records, doctors can delete patient records */}
                    {(user?.currentRole === "doctor" || record.patient_id === user?.id || record.uploaded_by === user?.id) && (
                      <button
                        onClick={() => handleDelete(record._id)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition text-sm font-medium"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
          <HiDocument className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Records Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {user?.currentRole === "doctor" 
              ? "No patient medical records found. Records will appear here when patients upload documents or when you create records for your patients."
              : searchTerm || filterType !== "all" 
                ? "Try adjusting your filters" 
                : "Upload your first medical record to get started"
            }
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <HiUpload className="w-5 h-5" />
            Upload Record
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upload Medical Record</h2>
                <button
                  onClick={() => { setShowUploadModal(false); resetForm(); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <HiX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Patient Selection for Doctors */}
              {user?.currentRole === "doctor" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Patient *</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a patient --</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>{patient.name}</option>
                    ))}
                  </select>
                  {patients.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      No patients found. Patients appear after you have appointments with them.
                    </p>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={newRecord.title}
                  onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Blood Test Report"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Record Type</label>
                <select
                  value={newRecord.record_type}
                  onChange={(e) => setNewRecord({ ...newRecord, record_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {recordTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  value={newRecord.date}
                  onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hospital</label>
                  <input
                    type="text"
                    value={newRecord.hospital_name}
                    onChange={(e) => setNewRecord({ ...newRecord, hospital_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Hospital name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Doctor</label>
                  <input
                    type="text"
                    value={newRecord.doctor_name}
                    onChange={(e) => setNewRecord({ ...newRecord, doctor_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Doctor name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={newRecord.description}
                  onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Brief description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Files *</label>
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  <HiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click to select files or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                  <input
                    id="fileInput"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  />
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                        <button
                          onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <HiX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => { setShowUploadModal(false); resetForm(); }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !newRecord.title || selectedFiles.length === 0 || (user?.currentRole === "doctor" && !selectedPatientId)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-emerald-600 transition disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedRecord.title}</h2>
                <button
                  onClick={() => { setShowViewModal(false); setSelectedRecord(null); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <HiX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(selectedRecord.record_type)}`}>
                  {recordTypes.find((t) => t.value === selectedRecord.record_type)?.label || "Other"}
                </span>
              </div>

              {selectedRecord.description && (
                <p className="text-gray-600 dark:text-gray-400">{selectedRecord.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <HiCalendar className="w-4 h-4" />
                  <span>{selectedRecord.createdAt ? formatDate(selectedRecord.createdAt) : selectedRecord.date ? formatDate(selectedRecord.date) : 'N/A'}</span>
                </div>
                {selectedRecord.patient_id && user?.currentRole === "doctor" && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <HiUser className="w-4 h-4" />
                    <span>Patient ID: {selectedRecord.patient_id}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Files</h4>
                <div className="space-y-2">
                  {selectedRecord.files && selectedRecord.files.length > 0 ? (
                    selectedRecord.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-3">
                          <HiDocument className="w-8 h-8 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={async () => {
                              try {
                                await apiClient.viewMedicalFile(selectedRecord.patient_id || user?.id || '', file.name);
                              } catch (error) {
                                console.error("View error:", error);
                                alert("Failed to view file");
                              }
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition"
                            title="View file"
                          >
                            <HiEye className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                await apiClient.downloadMedicalFile(selectedRecord.patient_id || user?.id || '', file.name);
                              } catch (error) {
                                console.error("Download error:", error);
                                alert("Failed to download file");
                              }
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                            title="Download file"
                          >
                            <HiDownload className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : selectedRecord.file_path ? (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <HiDocument className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedRecord.original_filename || selectedRecord.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{selectedRecord.file_size ? formatFileSize(selectedRecord.file_size) : 'Unknown size'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            try {
                              // Extract filename from file_path
                              const pathParts = selectedRecord.file_path?.split('/') || [];
                              const fileName = pathParts[pathParts.length - 1];
                              await apiClient.viewMedicalFile(selectedRecord.patient_id || user?.id || '', fileName);
                            } catch (error) {
                              console.error("View error:", error);
                              alert("Failed to view file");
                            }
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition"
                          title="View file"
                        >
                          <HiEye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              // Extract filename from file_path
                              const pathParts = selectedRecord.file_path?.split('/') || [];
                              const fileName = pathParts[pathParts.length - 1];
                              await apiClient.downloadMedicalFile(selectedRecord.patient_id || user?.id || '', fileName);
                            } catch (error) {
                              console.error("Download error:", error);
                              alert("Failed to download file");
                            }
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                          title="Download file"
                        >
                          <HiDownload className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No files attached to this record.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setShowViewModal(false); setSelectedRecord(null); }}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Card */}
      {records.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Record Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Total Records</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{records.length}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">Lab Reports</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {records.filter((r) => r.record_type === "lab_report").length}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-1">Scans</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {records.filter((r) => r.record_type === "scan").length}
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">Total Size</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {formatFileSize(records.reduce((acc, r) => acc + (r.file_size || (r.files?.reduce((a, f) => a + f.size, 0) || 0)), 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
