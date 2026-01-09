import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { fetchAPI } from '../services/api';
import { 
  HiUser, 
  HiMail, 
  HiPhone, 
  HiLocationMarker, 
  HiPencil, 
  HiCheck, 
  HiX,
  HiCalendar,
  HiIdentification,
  HiBriefcase,
  HiAcademicCap,
  HiOfficeBuilding,
  HiClock,
  HiCamera
} from 'react-icons/hi';

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
  // Doctor specific fields
  specialization?: string;
  qualification?: string;
  experience?: string;
  hospital_id?: string;
  hospital_name?: string;
  consultation_fee?: number;
  available_days?: string[];
  available_time_start?: string;
  available_time_end?: string;
  bio?: string;
  languages?: string[];
  registration_number?: string;
}

const ProfilePage = () => {
  const { user, setUser } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isDoctor = user?.currentRole === 'doctor' || user?.userType === 'doctor';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetchAPI<any>('/users/me');
      
      // Convert snake_case from backend to camelCase for frontend
      const profileData: UserProfile = {
        _id: response._id || response.id,
        name: response.name,
        email: response.email,
        mobile: response.mobile || response.phone,
        address: response.address,
        dateOfBirth: response.date_of_birth || response.dateOfBirth,
        gender: response.gender,
        bloodGroup: response.blood_group || response.bloodGroup,
        emergencyContact: response.emergency_contact || response.emergencyContact,
        userType: response.userType,
        currentRole: response.currentRole,
        // Doctor specific fields
        specialization: response.specialization,
        // Ensure qualification is always a string (convert array to comma-separated)
        qualification: Array.isArray(response.qualification) 
          ? response.qualification.join(', ') 
          : response.qualification,
        experience: response.experience_years?.toString() || response.experience,
        hospital_id: response.hospital_id,
        hospital_name: response.hospital_name,
        consultation_fee: response.consultation_fee,
        available_days: response.available_days,
        available_time_start: response.available_time_start,
        available_time_end: response.available_time_end,
        bio: response.bio,
        languages: response.languages,
        registration_number: response.registration_number,
      };
      
      setProfile(profileData);
      setEditedProfile(profileData);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      // Convert camelCase to snake_case for backend compatibility
      const backendData: Record<string, any> = {};
      if (editedProfile.name) backendData.name = editedProfile.name;
      if (editedProfile.email) backendData.email = editedProfile.email;
      if (editedProfile.mobile) backendData.mobile = editedProfile.mobile;
      if (editedProfile.dateOfBirth) backendData.date_of_birth = editedProfile.dateOfBirth;
      if (editedProfile.gender) backendData.gender = editedProfile.gender;
      if (editedProfile.address) backendData.address = editedProfile.address;
      if (editedProfile.bloodGroup) backendData.blood_group = editedProfile.bloodGroup;
      if (editedProfile.emergencyContact) backendData.emergency_contact = editedProfile.emergencyContact;
      // Doctor-specific fields
      if (editedProfile.specialization) backendData.specialization = editedProfile.specialization;
      if (editedProfile.qualification) backendData.qualification = editedProfile.qualification;
      if (editedProfile.experience) backendData.experience_years = parseInt(editedProfile.experience) || 0;
      if (editedProfile.consultation_fee) backendData.consultation_fee = editedProfile.consultation_fee;
      if (editedProfile.bio) backendData.bio = editedProfile.bio;
      if (editedProfile.registration_number) backendData.registration_number = editedProfile.registration_number;
      
      await fetchAPI('/users/me', {
        method: 'PUT',
        body: JSON.stringify(backendData),
      });
      
      // Update local profile state
      const updatedProfile = { ...profile, ...editedProfile } as UserProfile;
      setProfile(updatedProfile);
      
      // Update UserContext and localStorage so name reflects everywhere
      if (user && editedProfile.name) {
        const updatedUser = { ...user, name: editedProfile.name };
        if (editedProfile.email) updatedUser.email = editedProfile.email;
        if (editedProfile.mobile) updatedUser.mobile = editedProfile.mobile;
        setUser(updatedUser);
        
        // Also update localStorage directly
        localStorage.setItem('userName', editedProfile.name);
        if (editedProfile.email) localStorage.setItem('userEmail', editedProfile.email);
        if (editedProfile.mobile) localStorage.setItem('userMobile', editedProfile.mobile);
      }
      
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile || {});
    setIsEditing(false);
    setError('');
  };

  const handleInputChange = (field: keyof UserProfile, value: string | number | string[]) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Professional Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your account information and preferences
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <HiPencil className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <HiX className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <HiCheck className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-md text-sm mb-6">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm mb-6">
          {error}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header Section with Avatar */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-semibold text-blue-700 dark:text-blue-400">
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              {isEditing && (
                <button className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  <HiCamera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {profile?.name || 'User'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  isDoctor 
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                }`}>
                  {isDoctor ? 'Healthcare Provider' : 'Patient'}
                </span>
                {profile?.specialization && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {profile.specialization}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-5">
            Personal Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <HiUser className="w-4 h-4" />
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">{profile?.name || '—'}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <HiMail className="w-4 h-4" />
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedProfile.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">{profile?.email || '—'}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <HiPhone className="w-4 h-4" />
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedProfile.mobile || editedProfile.phone || ''}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">{profile?.mobile || profile?.phone || '—'}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <HiCalendar className="w-4 h-4" />
                Date of Birth
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedProfile.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">{profile?.dateOfBirth || '—'}</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <HiIdentification className="w-4 h-4" />
                Gender
              </label>
              {isEditing ? (
                <select
                  value={editedProfile.gender || ''}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <p className="text-sm text-gray-900 dark:text-white capitalize">{profile?.gender || '—'}</p>
              )}
            </div>

            {/* Blood Group */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Blood Group
              </label>
              {isEditing ? (
                <select
                  value={editedProfile.bloodGroup || ''}
                  onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">{profile?.bloodGroup || '—'}</p>
              )}
            </div>

            {/* Address - Full Width */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <HiLocationMarker className="w-4 h-4" />
                Address
              </label>
              {isEditing ? (
                <textarea
                  value={editedProfile.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">{profile?.address || '—'}</p>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <HiPhone className="w-4 h-4 text-red-500" />
                Emergency Contact
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedProfile.emergencyContact || ''}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Emergency contact number"
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">{profile?.emergencyContact || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Doctor-Specific Information */}
        {isDoctor && (
          <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-5">
              Professional Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Specialization */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  <HiBriefcase className="w-4 h-4" />
                  Specialization
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.specialization || ''}
                    onChange={(e) => handleInputChange('specialization', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white">{profile?.specialization || '—'}</p>
                )}
              </div>

              {/* Qualification */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  <HiAcademicCap className="w-4 h-4" />
                  Qualification
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.qualification || ''}
                    onChange={(e) => handleInputChange('qualification', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white">{profile?.qualification || '—'}</p>
                )}
              </div>

              {/* Experience */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  <HiClock className="w-4 h-4" />
                  Experience
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.experience || ''}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    placeholder="e.g., 10 years"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white">{profile?.experience || '—'}</p>
                )}
              </div>

              {/* Hospital */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  <HiOfficeBuilding className="w-4 h-4" />
                  Affiliated Hospital
                </label>
                {profile?.hospital_name ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <p className="text-sm text-gray-900 dark:text-white">{profile.hospital_name}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    <p className="text-sm text-amber-600 dark:text-amber-400">Not enrolled at any hospital</p>
                  </div>
                )}
              </div>

              {/* Registration Number */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  <HiIdentification className="w-4 h-4" />
                  Registration Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.registration_number || ''}
                    onChange={(e) => handleInputChange('registration_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white">{profile?.registration_number || '—'}</p>
                )}
              </div>

              {/* Consultation Fee */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Consultation Fee
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedProfile.consultation_fee || ''}
                    onChange={(e) => handleInputChange('consultation_fee', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white">
                    {profile?.consultation_fee ? `₹${profile.consultation_fee}` : '—'}
                  </p>
                )}
              </div>

              {/* Bio - Full Width */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  <HiUser className="w-4 h-4" />
                  Professional Bio
                </label>
                {isEditing ? (
                  <textarea
                    value={editedProfile.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Describe your professional background..."
                  />
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white">{profile?.bio || '—'}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Information Card */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
          Account Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-md border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Account Type</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${profile?.userType === 'doctor' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {profile?.userType === 'doctor' ? 'Healthcare Provider' : profile?.userType || 'Patient'}
              </p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-md border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Current Role</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${profile?.currentRole === 'doctor' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {profile?.currentRole === 'doctor' ? 'Doctor' : profile?.currentRole || 'Patient'}
              </p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-md border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Account Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active</p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-md border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Account ID</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
              {profile?._id ? `WH-${profile._id.slice(-8).toUpperCase()}` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
