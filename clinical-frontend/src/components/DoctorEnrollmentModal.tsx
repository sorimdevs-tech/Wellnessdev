import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { apiClient, fetchAPI } from "../services/api";

interface DoctorEnrollmentModalProps {
  isOpen: boolean;
  hospital: {
    id: string;
    name: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface EnrollmentStatus {
  enrolled: boolean;
  current_hospital: {
    id: string;
    name: string;
  } | null;
  verified: boolean;
  is_active: boolean;
  doctor_id?: string;
}

export default function DoctorEnrollmentModal({
  isOpen,
  hospital,
  onClose,
  onSuccess,
}: DoctorEnrollmentModalProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | null>(null);
  const [showSwitchConfirmation, setShowSwitchConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    specialization: "",
    experience_years: "",
    qualifications: "",
    license_number: "",
    consultation_fee: "",
    available_days: [] as string[],
    available_time_start: "",
    available_time_end: "",
    // Additional comprehensive fields
    education: "",
    awards: [] as string[],
    publications: [] as string[],
    languages: [] as string[],
    emergency_contact: "",
    work_history: [] as any[],
    certifications: [] as string[],
    professional_memberships: [] as string[],
    research_interests: [] as string[],
    consultation_types: [] as string[],
    preferred_payment_methods: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill license_number from user's registration number when modal opens
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      if (isOpen && user) {
        try {
          // Try to get the registration number from localStorage first (set during registration)
          const storedRegNumber = localStorage.getItem('regNumber');
          if (storedRegNumber) {
            setFormData(prev => ({ ...prev, license_number: storedRegNumber }));
            return;
          }
          
          // If not in localStorage, try to fetch from doctor profile
          const doctorProfile = await fetchAPI<any>("/doctors/my-profile");
          if (doctorProfile?.registration_number || doctorProfile?.license_number) {
            setFormData(prev => ({ 
              ...prev, 
              license_number: doctorProfile.registration_number || doctorProfile.license_number 
            }));
          }
        } catch (error) {
          console.log("Could not fetch doctor profile for auto-fill:", error);
        }
      }
    };
    
    fetchDoctorProfile();
  }, [isOpen, user]);

  // Check enrollment status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkEnrollmentStatus();
    }
  }, [isOpen]);

  const checkEnrollmentStatus = async () => {
    setCheckingStatus(true);
    try {
      const status = await fetchAPI<EnrollmentStatus>("/doctors/enrollment-status");
      setEnrollmentStatus(status);
      
      // If already enrolled at a different hospital, show switch confirmation
      if (status?.enrolled && status?.current_hospital?.id !== hospital.id) {
        setShowSwitchConfirmation(true);
      } else {
        setShowSwitchConfirmation(false);
      }
    } catch (error) {
      console.error("Error checking enrollment status:", error);
      setEnrollmentStatus(null);
      setShowSwitchConfirmation(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  if (!isOpen || !user) return null;

  // Show switch confirmation modal if doctor is already enrolled elsewhere
  if (showSwitchConfirmation && enrollmentStatus?.current_hospital) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Hospital Switch Required</h3>
            <p className="text-gray-600 mb-4">
              You are currently enrolled at <strong className="text-blue-600">{enrollmentStatus.current_hospital.name}</strong>
              {enrollmentStatus.verified && <span className="text-green-600"> (Verified)</span>}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-amber-800 text-sm font-medium mb-2">⚠️ Switching hospitals will:</p>
              <ul className="text-amber-700 text-sm space-y-1">
                <li>• Unenroll you from <strong>{enrollmentStatus.current_hospital.name}</strong></li>
                <li>• Remove your verified status (if any)</li>
                <li>• Require new admin verification at <strong>{hospital.name}</strong></li>
                <li>• Notify both you and clinical admins about this change</li>
              </ul>
            </div>
            <p className="text-gray-700 font-medium mb-6">
              Do you want to switch to <strong className="text-emerald-600">{hospital.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowSwitchConfirmation(false)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition font-medium"
              >
                Yes, Switch Hospital
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking status
  if (checkingStatus) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Checking enrollment status...</p>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.specialization.trim()) {
      newErrors.specialization = "Specialization is required";
    }

    if (!formData.experience_years || parseInt(formData.experience_years) < 0) {
      newErrors.experience_years = "Valid experience years is required";
    }

    if (!formData.qualifications.trim()) {
      newErrors.qualifications = "Qualifications are required";
    }

    if (!formData.license_number.trim()) {
      newErrors.license_number = "Medical license number is required";
    }

    if (!formData.consultation_fee || parseInt(formData.consultation_fee) < 0) {
      newErrors.consultation_fee = "Valid consultation fee is required";
    }

    if (formData.available_days.length === 0) {
      newErrors.available_days = "At least one available day is required";
    }

    if (!formData.available_time_start) {
      newErrors.available_time_start = "Start time is required";
    }

    if (!formData.available_time_end) {
      newErrors.available_time_end = "End time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Validate hospital ID
    if (!hospital?.id) {
      alert("Error: Hospital ID is missing. Please select a valid hospital.");
      return;
    }

    setLoading(true);

    try {
      // Update doctor profile with comprehensive information
      const updateData: any = {
        name: user.name, // Include user's name
        specialization: formData.specialization,
        experience_years: parseInt(formData.experience_years),
        qualifications: formData.qualifications
          ? formData.qualifications.split(/[,\n]/).map(q => q.trim()).filter(q => q.length > 0)
          : [], // Convert to array and split by comma/newline
        hospital_id: hospital.id,
        license_number: formData.license_number,
        consultation_fee: parseInt(formData.consultation_fee),
        available_days: formData.available_days,
        available_time_start: formData.available_time_start,
        available_time_end: formData.available_time_end,
      };

      console.log("🏥 Hospital ID:", hospital.id);
      console.log("📝 Sending doctor enrollment data:", JSON.stringify(updateData, null, 2));

      // Add optional comprehensive fields if they have values
      if (formData.education.trim()) updateData.education = formData.education;
      if (formData.awards.length > 0) updateData.awards = formData.awards;
      if (formData.publications.length > 0) updateData.publications = formData.publications;
      if (formData.languages.length > 0) updateData.languages = formData.languages;
      if (formData.emergency_contact.trim()) updateData.emergency_contact = formData.emergency_contact;
      if (formData.work_history.length > 0) updateData.work_history = formData.work_history;
      if (formData.certifications.length > 0) updateData.certifications = formData.certifications;
      if (formData.professional_memberships.length > 0) updateData.professional_memberships = formData.professional_memberships;
      if (formData.research_interests.length > 0) updateData.research_interests = formData.research_interests;
      if (formData.consultation_types.length > 0) updateData.consultation_types = formData.consultation_types;
      if (formData.preferred_payment_methods.length > 0) updateData.preferred_payment_methods = formData.preferred_payment_methods;

      const response = await apiClient.updateMyDoctorProfile(updateData);

      if (response) {
        // Check if this was a hospital switch
        const wasSwitching = enrollmentStatus?.enrolled && enrollmentStatus?.current_hospital?.id !== hospital.id;
        
        if (wasSwitching) {
          alert(`🔄 Hospital Switch Successful!\n\n✅ You have been unenrolled from ${enrollmentStatus?.current_hospital?.name}\n✅ You are now enrolled at ${hospital.name}\n\n⏳ Your profile is pending verification by our Clinical Admin team.\n\n📧 Notifications have been sent to:\n• You (unenrollment confirmation)\n• Clinical Admin team (for new verification)\n\n💡 Check your notifications for updates!`);
        } else {
          alert(`🎉 Successfully enrolled at ${hospital.name}!\n\n⏳ Your profile is now pending verification by our Clinical Admin team.\n\n✅ Once verified:\n• You'll receive a notification\n• Patients will be able to find and book appointments with you\n• You'll get the "Verified Doctor" badge\n\n💡 Check your notifications for updates!`);
        }
        onSuccess();
        onClose();
      } else {
        alert("Failed to enroll. Please try again.");
      }
    } catch (error: any) {
      console.error("Enrollment error:", error);
      alert(error.message || "Failed to enroll. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day]
    }));
  };

  const daysOfWeek = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Enroll as Doctor</h2>
              <p className="text-gray-600 mt-1">Join {hospital.name} as a healthcare provider</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Professional Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Professional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization *
                </label>
                <select
                  value={formData.specialization}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select specialization</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Emergency Medicine">Emergency Medicine</option>
                  <option value="Psychiatry">Psychiatry</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Surgery">Surgery</option>
                </select>
                {errors.specialization && (
                  <p className="text-red-500 text-xs mt-1">{errors.specialization}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience *
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experience_years}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience_years: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 5"
                />
                {errors.experience_years && (
                  <p className="text-red-500 text-xs mt-1">{errors.experience_years}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical License Number *
                  {localStorage.getItem('regNumber') && (
                    <span className="ml-2 text-xs text-emerald-600 font-normal">(Auto-filled from registration)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      localStorage.getItem('regNumber') 
                        ? 'border-emerald-300 bg-emerald-50/50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="e.g., MCI123456"
                  />
                  {localStorage.getItem('regNumber') && (
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                {errors.license_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.license_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consultation Fee (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.consultation_fee}
                  onChange={(e) => setFormData(prev => ({ ...prev, consultation_fee: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 500"
                />
                {errors.consultation_fee && (
                  <p className="text-red-500 text-xs mt-1">{errors.consultation_fee}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qualifications *
              </label>
              <textarea
                value={formData.qualifications}
                onChange={(e) => setFormData(prev => ({ ...prev, qualifications: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter qualifications (separate with commas or newlines):&#10;e.g., MBBS&#10;MD (Cardiology)&#10;DM (Interventional Cardiology)"
              />
              {errors.qualifications && (
                <p className="text-red-500 text-xs mt-1">{errors.qualifications}</p>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Education
              </label>
              <textarea
                value={formData.education}
                onChange={(e) => setFormData(prev => ({ ...prev, education: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., MBBS from AIIMS Delhi, MD from PGI Chandigarh"
              />
            </div>
          </div>

          {/* Work History */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Work History</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Previous Hospitals/Organizations
              </label>
              <textarea
                value={formData.work_history.map(h => `${h.hospital || ''} (${h.position || ''}) ${h.duration || ''}`).join('\n')}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').filter(line => line.trim());
                  const workHistory = lines.map(line => {
                    // Simple parsing: "Hospital Name (Position) Duration"
                    const match = line.match(/^(.+?)\s*\((.+?)\)\s*(.+)$/);
                    if (match) {
                      return {
                        hospital: match[1].trim(),
                        position: match[2].trim(),
                        duration: match[3].trim()
                      };
                    }
                    return { hospital: line.trim(), position: '', duration: '' };
                  });
                  setFormData(prev => ({ ...prev, work_history: workHistory }));
                }}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., AIIMS Delhi (Senior Resident) 2018-2020&#10;Max Hospital (Consultant) 2020-Present"
              />
            </div>
          </div>

          {/* Certifications and Awards */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications & Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certifications
                </label>
                <textarea
                  value={formData.certifications.join('\n')}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    certifications: e.target.value.split('\n').filter(cert => cert.trim())
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., ACLS Certified&#10;BLS Certified&#10;PALS Certified"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Awards & Honors
                </label>
                <textarea
                  value={formData.awards.join('\n')}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    awards: e.target.value.split('\n').filter(award => award.trim())
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Best Doctor Award 2022&#10;Research Excellence Award 2021"
                />
              </div>
            </div>
          </div>

          {/* Languages and Publications */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages & Publications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Languages Spoken
                </label>
                <input
                  type="text"
                  value={formData.languages.join(', ')}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    languages: e.target.value.split(',').map(lang => lang.trim()).filter(lang => lang)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., English, Hindi, Punjabi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., John Doe - +91 9876543210"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Publications & Research
              </label>
              <textarea
                value={formData.publications.join('\n')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  publications: e.target.value.split('\n').filter(pub => pub.trim())
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 'Cardiac Interventions' - Journal of Cardiology 2022&#10;'Heart Disease Prevention' - Medical Journal 2021"
              />
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability Schedule</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Days *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {daysOfWeek.map((day) => (
                  <label key={day} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.available_days.includes(day)}
                      onChange={() => handleDayToggle(day)}
                      className="mr-2"
                    />
                    <span className="text-sm">{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
              {errors.available_days && (
                <p className="text-red-500 text-xs mt-1">{errors.available_days}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.available_time_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, available_time_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.available_time_start && (
                  <p className="text-red-500 text-xs mt-1">{errors.available_time_start}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  value={formData.available_time_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, available_time_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.available_time_end && (
                  <p className="text-red-500 text-xs mt-1">{errors.available_time_end}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? "Enrolling..." : "Enroll at Hospital"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
