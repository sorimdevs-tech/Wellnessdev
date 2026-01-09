import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import BookingModal from "../components/BookingModal";
import DoctorEnrollmentModal from "../components/DoctorEnrollmentModal";
import { apiClient, fetchAPI } from "../services/api";

interface Hospital {
  id: number | string;
  name: string;
  status: string;
  distance: number;
  address: string;
  specialties: string[];
  doctors: { name: string; status: string; id?: string; consultation_fee?: number }[];
  rating: number;
  reviews: number;
  img?: string;
  hospital_type?: string;
  minConsultingFee?: number;
}

interface HospitalType {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  icon?: string;
}

interface Specialization {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
}

export default function BrowseHospitalsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [showFilters, setShowFilters] = useState(false);
  const [location, setLocation] = useState("Chennai");
  const [distance, setDistance] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<{ id: string; name: string } | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; name: string; specialty: string } | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<{ hospital_id?: string } | null>(null);
  
  // Filter data from backend
  const [hospitalTypes, setHospitalTypes] = useState<HospitalType[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("distance");
  const [expandedHospital, setExpandedHospital] = useState<string | number | null>(null);

  const dummyHospitals: Hospital[] = [
    {
      id: 1,
      name: "Expresscare Medical Clinic",
      status: "Open",
      distance: 2.4,
      address: "123 MG Road, Adyar, Chennai",
      specialties: ["General Medicine", "Pediatrics"],
      doctors: [{ name: "Dr. Sarah Johnson", status: "Available", consultation_fee: 400 }],
      rating: 4.6,
      reviews: 80,
      hospital_type: "Clinic",
      minConsultingFee: 400,
    },
    {
      id: 2,
      name: "City Care Hospital",
      status: "Open 24/7",
      distance: 3.1,
      address: "456 Anna Nagar, Chennai",
      specialties: ["Cardiology", "Orthopedics", "Neurology"],
      doctors: [
        { name: "Dr. Ramesh Kumar", status: "Available", consultation_fee: 600 },
        { name: "Dr. Priya Sharma", status: "Busy", consultation_fee: 500 },
      ],
      rating: 4.8,
      reviews: 150,
      hospital_type: "Hospital",
      minConsultingFee: 500,
    },
  ];

  const fetchDoctorProfile = async () => {
    if (user?.userType === "doctor") {
      try {
        const profile = await apiClient.getMyDoctorProfile();
        setDoctorProfile(profile as { hospital_id?: string });
      } catch (error) {
        console.log("Doctor profile not found");
      }
    }
  };

  // Fetch filter metadata from backend
  const fetchFilterData = async () => {
    try {
      const [typesData, specsData] = await Promise.all([
        fetchAPI<HospitalType[]>("/hospitals/meta/types"),
        fetchAPI<Specialization[]>("/hospitals/meta/specializations")
      ]);
      
      if (typesData) setHospitalTypes(typesData);
      if (specsData) setSpecializations(specsData);
    } catch (error) {
      console.log("Could not fetch filter data:", error);
      // Fallback to default values if backend doesn't have data
      setHospitalTypes([
        { id: "1", name: "Multi-specialty" },
        { id: "2", name: "Clinic" },
        { id: "3", name: "Diagnostic Center" },
        { id: "4", name: "Hospital" }
      ]);
      setSpecializations([
        { id: "1", name: "General Medicine" },
        { id: "2", name: "Cardiology" },
        { id: "3", name: "Orthopedics" },
        { id: "4", name: "Pediatrics" },
        { id: "5", name: "Dermatology" }
      ]);
    }
  };

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await apiClient.getHospitals();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawData = response as any[];
        if (rawData && rawData.length > 0) {
          // Map API response to frontend Hospital interface
          const hospitalsData: Hospital[] = rawData.map((h) => ({
            id: h._id || h.id,
            name: h.name || "Unknown Hospital",
            status: h.status || "Open",
            distance: h.distance ?? Math.floor(Math.random() * 10) + 1, // Default random 1-10 km if not provided
            address: h.address || h.location || `${h.city || "Chennai"}`,
            specialties: h.specialties || [],
            doctors: (h.doctors || []).map((d: { name?: string; status?: string; _id?: string; id?: string; consultation_fee?: number }) => ({
              name: d.name || "Doctor",
              status: d.status || "Available",
              id: d._id || d.id,
              consultation_fee: d.consultation_fee || 500,
            })),
            minConsultingFee: (h.doctors && h.doctors.length > 0) 
              ? Math.min(...h.doctors.map((d: { consultation_fee?: number }) => d.consultation_fee || 500))
              : 500,
            rating: h.rating || 4.0,
            reviews: h.reviews || Math.floor(Math.random() * 100) + 10,
            img: h.img || h.image,
            hospital_type: h.hospital_type || h.type || "Hospital",
          }));
          setHospitals(hospitalsData);
        } else {
          setHospitals(dummyHospitals);
        }
      } catch (error) {
        console.error("Failed to load hospitals:", error);
        setHospitals(dummyHospitals);
      }
      setLoading(false);
    };

    fetchHospitals();
    fetchDoctorProfile();
    fetchFilterData();
  }, []);

  const filteredHospitals = hospitals
    .filter((h) => {
      const matchesDistance = h.distance <= distance;
      const matchesSearch = !searchTerm || h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.doctors?.some(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        h.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = selectedType === "all" || 
        (h.hospital_type && h.hospital_type.toLowerCase() === selectedType.toLowerCase());
      const matchesRating = h.rating >= minRating;
      const matchesSpecialty = selectedSpecialty === "all" || 
        h.specialties?.some(s => s.toLowerCase().includes(selectedSpecialty.toLowerCase()));
      
      return matchesDistance && matchesSearch && matchesType && matchesRating && matchesSpecialty;
    })
    .sort((a, b) => {
      // First priority: enrolled hospital for doctors
      const aIsEnrolled = doctorProfile?.hospital_id === String(a.id);
      const bIsEnrolled = doctorProfile?.hospital_id === String(b.id);
      if (aIsEnrolled && !bIsEnrolled) return -1;
      if (!aIsEnrolled && bIsEnrolled) return 1;
      
      // Second priority: user selected sort
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "fee":
          // Sort by minimum consulting fee (lowest first)
          return (a.minConsultingFee || 500) - (b.minConsultingFee || 500);
        case "distance":
        default:
          return a.distance - b.distance;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Find Healthcare Providers</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Discover hospitals and doctors near you</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar - 30% */}
          <div className="flex-1 md:flex-[0.34] flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2.5">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm"
              placeholder="Search hospitals, doctors..."
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex-1 md:flex-[0.3] relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 pr-10 text-sm text-gray-700 dark:text-gray-300 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="distance">Sort by: Distance</option>
              <option value="rating">Sort by: Rating</option>
              <option value="fee">Sort by: Consulting Fee</option>
            </select>
            <svg className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Filter Icon Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-lg border transition relative ${
              showFilters 
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' 
                : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="Filters"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {/* Active filter indicator badge */}
            {(selectedType !== 'all' || selectedSpecialty !== 'all' || minRating > 0 || distance !== 50) && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                {[selectedType !== 'all', selectedSpecialty !== 'all', minRating > 0, distance !== 50].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Expandable Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </div>

              {/* Distance */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Distance: {distance} km</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="w-full accent-blue-600 mt-2"
                />
              </div>

              {/* Specialty */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Specialty</label>
                <select 
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Specialties</option>
                  {specializations.map((spec) => (
                    <option key={spec.id || spec._id} value={spec.name}>{spec.name}</option>
                  ))}
                </select>
              </div>

              {/* Hospital Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Hospital Type</label>
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  {hospitalTypes.map((type) => (
                    <option key={type.id || type._id} value={type.name}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Min Rating</label>
                <select 
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>All Ratings</option>
                  <option value={3.5}>3.5+ ⭐</option>
                  <option value={4.0}>4.0+ ⭐</option>
                  <option value={4.5}>4.5+ ⭐</option>
                </select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-blue-600">{filteredHospitals.length}</span> results found
              </p>
              <button
                onClick={() => { setLocation("Chennai"); setDistance(50); setSelectedType("all"); setMinRating(0); setSelectedSpecialty("all"); setSearchTerm(""); }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-blue-600">{filteredHospitals.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Hospitals</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-emerald-600">
              {filteredHospitals.reduce((acc, h) => acc + h.doctors.length, 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Doctors</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-purple-600">
              {new Set(filteredHospitals.flatMap(h => h.specialties)).size}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Specialties</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-amber-600">
              {(filteredHospitals.reduce((acc, h) => acc + h.rating, 0) / (filteredHospitals.length || 1)).toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</p>
          </div>
        </div>

        {/* Hospital Cards */}
        <div className="space-y-4">
          {filteredHospitals.length > 0 ? (
            filteredHospitals.map((hospital) => {
              const isEnrolledHospital = doctorProfile?.hospital_id === String(hospital.id);
              const availableDoctors = hospital.doctors.filter((doc: any) => doc.id !== user?.id);
              const topDoctor = availableDoctors.length > 0 ? availableDoctors[0] : null;
              const isExpanded = expandedHospital === hospital.id;
              
              return (
                <div
                  key={hospital.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition border ${
                    isEnrolledHospital ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row gap-5">
                      {/* Left Side - Hospital Info */}
                      <div className="lg:w-[45%] flex gap-4">
                        {/* Hospital Image/Icon */}
                        <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-900/30 dark:to-emerald-900/30 flex items-center justify-center flex-shrink-0">
                          {hospital.img ? (
                            <img src={hospital.img} alt={hospital.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          )}
                        </div>

                        {/* Hospital Details */}
                        <div className="flex-1 min-w-0">
                          {isEnrolledHospital && (
                            <span className="inline-block bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded mb-1">
                              ✓ My Hospital
                            </span>
                          )}
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{hospital.name}</h3>
                          <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1 mt-0.5">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {hospital.address} • <span className="text-blue-600 font-medium">{hospital.distance} km</span>
                          </p>
                          
                          {/* Rating under hospital */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                              <span className="text-amber-500">★</span>
                              <span className="font-bold text-gray-900 dark:text-white text-sm">{hospital.rating}</span>
                              <span className="text-gray-400 text-xs">({hospital.reviews} reviews)</span>
                            </div>
                          </div>

                          {/* Specialties */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {hospital.specialties.slice(0, 3).map((specialty, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                                {specialty}
                              </span>
                            ))}
                            {hospital.specialties.length > 3 && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded text-xs">
                                +{hospital.specialties.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side - Featured Doctor Card */}
                      {topDoctor ? (
                        <div className="lg:w-[55%] bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                          <div className="flex justify-between">
                            {/* Left - Doctor Info */}
                            <div className="flex gap-3 flex-1">
                              {/* Doctor Avatar */}
                              <div className="flex-shrink-0">
                                <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                                  <span className="text-white text-2xl font-bold">
                                    {topDoctor.name.split(' ').pop()?.charAt(0) || 'D'}
                                  </span>
                                </div>
                              </div>

                              {/* Doctor Details */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-bold text-gray-900 dark:text-white">{topDoctor.name}</h4>
                                  <span className="text-amber-500">🔥</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  MBBS, MD - {hospital.specialties[0]}
                                </p>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  {hospital.specialties[0]} Specialist
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  8+ Years Experience
                                </p>
                                {/* Verification Badge */}
                                <div className="flex items-center gap-1 mt-1">
                                  <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Verified</span>
                                </div>
                              </div>
                            </div>

                            {/* Right - Rating, Status & Book Button */}
                            <div className="flex flex-col items-end justify-between pl-3 border-l border-gray-200 dark:border-gray-600">
                              {/* Rating */}
                              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                                <span className="text-amber-400">★</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">4.8</span>
                              </div>
                              
                              {/* Status Badge */}
                              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                topDoctor.status === 'Available' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                                {topDoctor.status}
                              </span>

                              {/* Book Button */}
                              <button
                                onClick={() => {
                                  setSelectedDoctor({
                                    id: topDoctor.id || "doc_0",
                                    name: topDoctor.name,
                                    specialty: hospital.specialties[0],
                                  });
                                  setShowBookingModal(true);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                              >
                                Book Appointment
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="lg:w-[55%] bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6 flex items-center justify-center">
                          <p className="text-gray-400 text-sm">No doctors available</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {hospital.doctors.slice(0, 3).map((doc, idx) => (
                            <div key={idx} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs font-bold">
                              {doc.name.split(' ').pop()?.charAt(0) || 'D'}
                            </div>
                          ))}
                          {hospital.doctors.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-bold">
                              +{hospital.doctors.length - 3}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setExpandedHospital(isExpanded ? null : hospital.id)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          {hospital.doctors.length} doctor{hospital.doctors.length !== 1 ? 's' : ''}
                          <svg className={`w-4 h-4 transition ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex gap-2">
                        {user?.userType === "doctor" && (
                          <button
                            onClick={() => {
                              if (isEnrolledHospital) {
                                navigate("/doctor/dashboard");
                              } else {
                                setSelectedHospital({ id: String(hospital.id), name: hospital.name });
                                setShowEnrollmentModal(true);
                              }
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                              isEnrolledHospital 
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                          >
                            {isEnrolledHospital ? "Manage" : "Enroll"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Doctors List */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">All Doctors at {hospital.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {hospital.doctors.map((doc, idx) => {
                            const isCurrentUser = doc.id === user?.id;
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-3 p-3 rounded-xl border ${
                                  isCurrentUser 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                                }`}
                              >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                  {doc.name.split(' ').pop()?.charAt(0) || 'D'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                    {doc.name}
                                    {isCurrentUser && <span className="text-blue-600 text-xs ml-1">(You)</span>}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{hospital.specialties[idx % hospital.specialties.length] || hospital.specialties[0]}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${doc.status === 'Available' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                      {doc.status}
                                    </span>
                                  </div>
                                </div>
                                {!isCurrentUser && (
                                  <button
                                    onClick={() => {
                                      setSelectedDoctor({
                                        id: doc.id || `doc_${idx}`,
                                        name: doc.name,
                                        specialty: hospital.specialties[idx % hospital.specialties.length] || hospital.specialties[0],
                                      });
                                      setShowBookingModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition flex-shrink-0"
                                  >
                                    Book
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
                })
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No hospitals found</h3>
                  <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or search term</p>
                  <button
                    onClick={() => { setLocation("Chennai"); setDistance(50); setSelectedType("all"); setMinRating(0); setSelectedSpecialty("all"); setSearchTerm(""); }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
      </div>

      {/* Booking Modal */}
      {selectedDoctor !== null && (
        <BookingModal
          isOpen={showBookingModal}
          doctor={selectedDoctor}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDoctor(null);
          }}
          onSuccess={() => {
            setBookingSuccess(true);
            setTimeout(() => setBookingSuccess(false), 3000);
          }}
        />
      )}

      {/* Enrollment Modal */}
      {selectedHospital !== null && (
        <DoctorEnrollmentModal
          isOpen={showEnrollmentModal}
          hospital={selectedHospital}
          onClose={() => {
            setShowEnrollmentModal(false);
            setSelectedHospital(null);
          }}
          onSuccess={() => {
            setShowEnrollmentModal(false);
            setSelectedHospital(null);
            fetchDoctorProfile();
          }}
        />
      )}

      {/* Success Toast */}
      {bookingSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-40">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Appointment booked successfully!</span>
        </div>
      )}
    </div>
  );
}
