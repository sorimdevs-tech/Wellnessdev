import { useState, useRef } from "react";
import { useAppointment } from "../context/AppointmentContext";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/api";

interface BookingModalProps {
  isOpen: boolean;
  doctor: {
    id: string;
    name: string;
    specialty: string;
    hospital?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingModal({
  isOpen,
  doctor,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const { user } = useUser();
  const { bookAppointment } = useAppointment();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    reason: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validFiles = files.filter(file => allowedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024);
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.time || !formData.reason) {
      alert("Please fill in all required fields");
      return;
    }

    // Check if user is authenticated
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You are not logged in. Please log in to book an appointment.");
      return;
    }

    setLoading(true);

    try {
      const patientId = user.id || localStorage.getItem("userId") || "";

      if (!patientId) {
        alert("User ID not found. Please log out and log back in.");
        setLoading(false);
        return;
      }

      const appointmentData = {
        patient_id: patientId,
        doctor_id: doctor.id,
        hospital_id: "default_hospital",
        appointment_date: `${formData.date}T${formData.time}`,
        notes: formData.reason,
      };

      const result = await apiClient.createAppointment(appointmentData) as { id?: string; _id?: string };

      if (result) {
        const appointmentId = result.id || result._id;

        // Upload files if any
        if (selectedFiles.length > 0) {
          for (const file of selectedFiles) {
            try {
              await apiClient.uploadMedicalFile(
                file,
                patientId,
                `Pre-appointment: ${file.name}`,
                "pre_appointment",
                `Uploaded for appointment with ${doctor.name} on ${formData.date}`,
                appointmentId
              );
            } catch (uploadError) {
              console.error("File upload error:", uploadError);
            }
          }
        }

        bookAppointment(
          doctor.id,
          doctor.name,
          doctor.specialty,
          user.id || "",
          user.name,
          formData.date,
          formData.time,
          "30 minutes",
          formData.reason
        );

        setFormData({ date: "", time: "", reason: "" });
        setSelectedFiles([]);
        
        onSuccess();
        onClose();
        alert("🎉 Appointment requested successfully!" + 
          (selectedFiles.length > 0 ? `\n📎 ${selectedFiles.length} file(s) uploaded.` : "") +
          "\n⏳ Waiting for doctor approval.");
      } else {
        alert("Failed to book appointment. Please try again.");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert("Failed to book appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ date: "", time: "", reason: "" });
    setSelectedFiles([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Book Appointment</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Doctor Info */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              {doctor.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{doctor.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{doctor.specialty}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Visit</label>
            <textarea
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Describe your symptoms..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Attach Documents <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                📎 Click to upload (PDF, Images, max 10MB)
              </p>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    <span className="truncate flex-1 text-gray-700 dark:text-gray-300">{file.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm"
            >
              {loading ? "Booking..." : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
