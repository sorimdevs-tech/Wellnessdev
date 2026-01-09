import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { apiClient, fetchAPI } from "../services/api";

// ============== INTERFACES ==============
interface AdminStats {
  total_users: number;
  total_doctors: number;
  total_hospitals: number;
  pending_verifications: number;
  total_appointments: number;
}

interface ExtendedStats extends AdminStats {
  total_documents: number;
  pending_documents: number;
  total_portfolios: number;
  pending_portfolios: number;
  active_relationships: number;
}

interface Verification {
  id: string;
  _id?: string;
  entity_type: string;
  entity_id: string;
  status: string;
  verification_notes?: string;
  documents_required?: string[];
  documents_submitted?: string[];
  createdAt: string;
}

interface User {
  id: string;
  _id?: string;
  name: string;
  email?: string;
  mobile: string;
  userType: string;
  verified?: boolean;
  createdAt?: string;
}

interface Doctor {
  id: string;
  _id?: string;
  name: string;
  email?: string;
  mobile?: string;
  specialization?: string;
  qualification?: string;
  qualifications?: string | string[];
  experience?: number;
  experience_years?: number;
  verified?: boolean;
  hospital_ids?: string[];
  hospital_id?: string;
  license_number?: string;
  createdAt?: string;
}

interface Hospital {
  id: string;
  _id?: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  specializations?: string[];
  verified?: boolean;
  createdAt?: string;
}

interface UserDocument {
  id: string;
  _id?: string;
  user_id: string;
  user_name?: string;
  document_type: string;
  document_name: string;
  file_path?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

interface DoctorPortfolio {
  id: string;
  _id?: string;
  doctor_id: string;
  doctor_name?: string;
  item_type: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
}

interface DoctorPatientRelationship {
  id: string;
  _id?: string;
  doctor_id: string;
  patient_id: string;
  doctor_name?: string;
  patient_name?: string;
  hospital_name?: string;
  status: string;
  start_date: string;
  primary_care: boolean;
}

interface HospitalType {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  createdAt?: string;
}

interface Specialization {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  is_active: boolean;
  createdAt?: string;
}

// Interface for pending doctor verification with full details
interface PendingDoctorVerification {
  verification: Verification;
  doctor: Doctor | null;
  user: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    userType: string;
    createdAt: string;
  } | null;
  hospital: {
    id: string;
    name: string;
    city: string;
    address: string;
  } | null;
}

type TabType = "overview" | "users" | "doctors" | "hospitals" | "verifications" | "doctor-verifications" | "documents" | "portfolios" | "relationships" | "hospital-types" | "specializations";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { theme } = useTheme();
  
  // State
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [pendingDoctorVerifications, setPendingDoctorVerifications] = useState<PendingDoctorVerification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [portfolios, setPortfolios] = useState<DoctorPortfolio[]>([]);
  const [relationships, setRelationships] = useState<DoctorPatientRelationship[]>([]);
  const [hospitalTypes, setHospitalTypes] = useState<HospitalType[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // State for verification comments modal
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationComments, setVerificationComments] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<PendingDoctorVerification | null>(null);
  const [verificationAction, setVerificationAction] = useState<"approve" | "reject">("approve");
  
  // New form states for hospital types and specializations
  const [newHospitalType, setNewHospitalType] = useState({ name: "", description: "", icon: "" });
  const [editingHospitalType, setEditingHospitalType] = useState<HospitalType | null>(null);
  const [newSpecialization, setNewSpecialization] = useState({ name: "", description: "", icon: "", category: "" });
  const [editingSpecialization, setEditingSpecialization] = useState<Specialization | null>(null);

  const isDark = theme === "dark";

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== "clinical_admin") {
      navigate("/dashboard");
      return;
    }
  }, [user, navigate]);

  // Fetch admin data
  useEffect(() => {
    const fetchAllData = async () => {
      if (user?.userType !== "clinical_admin") return;
      
      setLoading(true);
      try {
        // Fetch extended stats - fall back to basic stats if extended not available
        let extStats = await fetchAPI<ExtendedStats>("/admin/extended-stats");
        if (!extStats) {
          const basicStats = await apiClient.getAdminStats() as AdminStats | null;
          if (basicStats) {
            extStats = {
              ...basicStats,
              total_documents: 0,
              pending_documents: 0,
              total_portfolios: 0,
              pending_portfolios: 0,
              active_relationships: 0,
            };
          }
        }
        if (extStats) setStats(extStats);
        
        // Fetch verifications
        const verifs = await apiClient.getVerifications("pending") as Verification[];
        setVerifications(verifs || []);
        
        // Fetch users
        const usersData = await fetchAPI<User[]>("/admin/users");
        setUsers(usersData || []);
        
        // Fetch doctors
        const doctorsData = await fetchAPI<Doctor[]>("/admin/doctors");
        setDoctors(doctorsData || []);
        
        // Fetch hospitals
        const hospitalsData = await fetchAPI<Hospital[]>("/admin/hospitals");
        setHospitals(hospitalsData || []);
        
        // Fetch pending doctor verifications with full details
        const pendingDoctorData = await fetchAPI<PendingDoctorVerification[]>("/admin/pending-doctor-verifications");
        setPendingDoctorVerifications(pendingDoctorData || []);
        
        // Fetch documents
        const docsData = await fetchAPI<UserDocument[]>("/admin/documents");
        setDocuments(docsData || []);
        
        // Fetch portfolios
        const portfoliosData = await fetchAPI<DoctorPortfolio[]>("/admin/portfolios");
        setPortfolios(portfoliosData || []);
        
        // Fetch relationships
        const relsData = await fetchAPI<DoctorPatientRelationship[]>("/admin/relationships");
        setRelationships(relsData || []);
        
        // Fetch hospital types
        const typesData = await fetchAPI<HospitalType[]>("/admin/hospital-types");
        setHospitalTypes(typesData || []);
        
        // Fetch specializations
        const specsData = await fetchAPI<Specialization[]>("/admin/specializations");
        setSpecializations(specsData || []);
        
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  // Action handlers
  const handleApproveVerification = async (verificationId: string) => {
    try {
      await apiClient.approveVerification(verificationId);
      const verifs = await apiClient.getVerifications("pending") as Verification[];
      setVerifications(verifs || []);
      refreshStats();
    } catch (error) {
      console.error("Failed to approve:", error);
      alert("Failed to approve verification");
    }
  };

  const handleRejectVerification = async (verificationId: string) => {
    const reason = prompt("Please provide rejection reason:");
    if (!reason) return;
    try {
      await apiClient.rejectVerification(verificationId, reason);
      const verifs = await apiClient.getVerifications("pending") as Verification[];
      setVerifications(verifs || []);
    } catch (error) {
      console.error("Failed to reject:", error);
      alert("Failed to reject verification");
    }
  };

  // Open verification modal with comments
  const openVerificationModal = (item: PendingDoctorVerification, action: "approve" | "reject") => {
    setSelectedVerification(item);
    setVerificationAction(action);
    setVerificationComments("");
    setShowVerificationModal(true);
  };

  // Handle doctor verification with comments
  const handleDoctorVerificationWithComments = async () => {
    if (!selectedVerification) return;
    
    const verificationId = selectedVerification.verification._id || selectedVerification.verification.id;
    
    try {
      if (verificationAction === "approve") {
        const commentsParam = verificationComments ? `?comments=${encodeURIComponent(verificationComments)}` : "";
        await fetchAPI(`/admin/verifications/${verificationId}/approve${commentsParam}`, { method: "POST" });
        alert("✅ Doctor verified successfully! A notification has been sent to the doctor.");
      } else {
        if (!verificationComments.trim()) {
          alert("Please provide a rejection reason");
          return;
        }
        await fetchAPI(`/admin/verifications/${verificationId}/reject?notes=${encodeURIComponent(verificationComments)}`, { method: "POST" });
        alert("❌ Doctor verification rejected. A notification has been sent to the doctor.");
      }
      
      // Refresh data
      const pendingDoctorData = await fetchAPI<PendingDoctorVerification[]>("/admin/pending-doctor-verifications");
      setPendingDoctorVerifications(pendingDoctorData || []);
      const verifs = await apiClient.getVerifications("pending") as Verification[];
      setVerifications(verifs || []);
      refreshStats();
      
      // Close modal
      setShowVerificationModal(false);
      setSelectedVerification(null);
      setVerificationComments("");
    } catch (error) {
      console.error("Failed to process verification:", error);
      alert("Failed to process verification");
    }
  };

  const handleVerifyDocument = async (documentId: string) => {
    try {
      await fetchAPI(`/admin/documents/${documentId}/verify`, { method: "POST" });
      const docsData = await fetchAPI<UserDocument[]>("/admin/documents");
      setDocuments(docsData || []);
      refreshStats();
      alert("Document verified successfully!");
    } catch (error) {
      console.error("Failed to verify document:", error);
      alert("Failed to verify document");
    }
  };

  const handleRejectDocument = async (documentId: string) => {
    const reason = prompt("Please provide rejection reason:");
    if (!reason) return;
    try {
      await fetchAPI(`/admin/documents/${documentId}/reject?notes=${encodeURIComponent(reason)}`, { method: "POST" });
      const docsData = await fetchAPI<UserDocument[]>("/admin/documents");
      setDocuments(docsData || []);
      alert("Document rejected!");
    } catch (error) {
      console.error("Failed to reject document:", error);
      alert("Failed to reject document");
    }
  };

  const handleVerifyPortfolio = async (portfolioId: string) => {
    try {
      await fetchAPI(`/admin/portfolios/${portfolioId}/verify`, { method: "POST" });
      const portfoliosData = await fetchAPI<DoctorPortfolio[]>("/admin/portfolios");
      setPortfolios(portfoliosData || []);
      refreshStats();
      alert("Portfolio item verified successfully!");
    } catch (error) {
      console.error("Failed to verify portfolio:", error);
      alert("Failed to verify portfolio");
    }
  };

  const handleRejectPortfolio = async (portfolioId: string) => {
    const reason = prompt("Please provide rejection reason:");
    if (!reason) return;
    try {
      await fetchAPI(`/admin/portfolios/${portfolioId}/reject?notes=${encodeURIComponent(reason)}`, { method: "POST" });
      const portfoliosData = await fetchAPI<DoctorPortfolio[]>("/admin/portfolios");
      setPortfolios(portfoliosData || []);
      alert("Portfolio item rejected!");
    } catch (error) {
      console.error("Failed to reject portfolio:", error);
      alert("Failed to reject portfolio");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await fetchAPI(`/admin/users/${userId}`, { method: "DELETE" });
      const usersData = await fetchAPI<User[]>("/admin/users");
      setUsers(usersData || []);
      refreshStats();
      alert("User deleted successfully!");
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user");
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm("Are you sure you want to delete this doctor?")) return;
    try {
      await fetchAPI(`/admin/doctors/${doctorId}`, { method: "DELETE" });
      const doctorsData = await fetchAPI<Doctor[]>("/admin/doctors");
      setDoctors(doctorsData || []);
      refreshStats();
      alert("Doctor deleted successfully!");
    } catch (error) {
      console.error("Failed to delete doctor:", error);
      alert("Failed to delete doctor");
    }
  };

  const handleDeleteHospital = async (hospitalId: string) => {
    if (!confirm("Are you sure you want to delete this hospital?")) return;
    try {
      await fetchAPI(`/admin/hospitals/${hospitalId}`, { method: "DELETE" });
      const hospitalsData = await fetchAPI<Hospital[]>("/admin/hospitals");
      setHospitals(hospitalsData || []);
      refreshStats();
      alert("Hospital deleted successfully!");
    } catch (error) {
      console.error("Failed to delete hospital:", error);
      alert("Failed to delete hospital");
    }
  };

  const handleDeleteRelationship = async (relationshipId: string) => {
    if (!confirm("Are you sure you want to delete this relationship?")) return;
    try {
      await fetchAPI(`/admin/relationships/${relationshipId}`, { method: "DELETE" });
      const relsData = await fetchAPI<DoctorPatientRelationship[]>("/admin/relationships");
      setRelationships(relsData || []);
      refreshStats();
      alert("Relationship deleted successfully!");
    } catch (error) {
      console.error("Failed to delete relationship:", error);
      alert("Failed to delete relationship");
    }
  };

  // =============== HOSPITAL TYPE HANDLERS ===============
  const handleCreateHospitalType = async () => {
    if (!newHospitalType.name.trim()) {
      alert("Hospital type name is required");
      return;
    }
    try {
      await fetchAPI("/admin/hospital-types", {
        method: "POST",
        body: JSON.stringify({
          name: newHospitalType.name.trim(),
          description: newHospitalType.description.trim() || undefined,
          icon: newHospitalType.icon.trim() || undefined,
          is_active: true,
        }),
      });
      const typesData = await fetchAPI<HospitalType[]>("/admin/hospital-types");
      setHospitalTypes(typesData || []);
      setNewHospitalType({ name: "", description: "", icon: "" });
      alert("Hospital type created successfully!");
    } catch (error) {
      console.error("Failed to create hospital type:", error);
      alert("Failed to create hospital type");
    }
  };

  const handleUpdateHospitalType = async () => {
    if (!editingHospitalType) return;
    try {
      await fetchAPI(`/admin/hospital-types/${editingHospitalType._id || editingHospitalType.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingHospitalType.name,
          description: editingHospitalType.description,
          icon: editingHospitalType.icon,
          is_active: editingHospitalType.is_active,
        }),
      });
      const typesData = await fetchAPI<HospitalType[]>("/admin/hospital-types");
      setHospitalTypes(typesData || []);
      setEditingHospitalType(null);
      alert("Hospital type updated successfully!");
    } catch (error) {
      console.error("Failed to update hospital type:", error);
      alert("Failed to update hospital type");
    }
  };

  const handleDeleteHospitalType = async (typeId: string) => {
    if (!confirm("Are you sure you want to delete this hospital type?")) return;
    try {
      await fetchAPI(`/admin/hospital-types/${typeId}`, { method: "DELETE" });
      const typesData = await fetchAPI<HospitalType[]>("/admin/hospital-types");
      setHospitalTypes(typesData || []);
      alert("Hospital type deleted successfully!");
    } catch (error) {
      console.error("Failed to delete hospital type:", error);
      alert("Failed to delete hospital type");
    }
  };

  // =============== SPECIALIZATION HANDLERS ===============
  const handleCreateSpecialization = async () => {
    if (!newSpecialization.name.trim()) {
      alert("Specialization name is required");
      return;
    }
    try {
      await fetchAPI("/admin/specializations", {
        method: "POST",
        body: JSON.stringify({
          name: newSpecialization.name.trim(),
          description: newSpecialization.description.trim() || undefined,
          icon: newSpecialization.icon.trim() || undefined,
          category: newSpecialization.category.trim() || undefined,
          is_active: true,
        }),
      });
      const specsData = await fetchAPI<Specialization[]>("/admin/specializations");
      setSpecializations(specsData || []);
      setNewSpecialization({ name: "", description: "", icon: "", category: "" });
      alert("Specialization created successfully!");
    } catch (error) {
      console.error("Failed to create specialization:", error);
      alert("Failed to create specialization");
    }
  };

  const handleUpdateSpecialization = async () => {
    if (!editingSpecialization) return;
    try {
      await fetchAPI(`/admin/specializations/${editingSpecialization._id || editingSpecialization.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingSpecialization.name,
          description: editingSpecialization.description,
          icon: editingSpecialization.icon,
          category: editingSpecialization.category,
          is_active: editingSpecialization.is_active,
        }),
      });
      const specsData = await fetchAPI<Specialization[]>("/admin/specializations");
      setSpecializations(specsData || []);
      setEditingSpecialization(null);
      alert("Specialization updated successfully!");
    } catch (error) {
      console.error("Failed to update specialization:", error);
      alert("Failed to update specialization");
    }
  };

  const handleDeleteSpecialization = async (specId: string) => {
    if (!confirm("Are you sure you want to delete this specialization?")) return;
    try {
      await fetchAPI(`/admin/specializations/${specId}`, { method: "DELETE" });
      const specsData = await fetchAPI<Specialization[]>("/admin/specializations");
      setSpecializations(specsData || []);
      alert("Specialization deleted successfully!");
    } catch (error) {
      console.error("Failed to delete specialization:", error);
      alert("Failed to delete specialization");
    }
  };

  const viewDetails = async (type: string, id: string) => {
    try {
      const details = await fetchAPI(`/admin/${type}/${id}/details`);
      setSelectedItem(details);
      setModalType(type);
      setShowModal(true);
    } catch (error) {
      console.error("Failed to fetch details:", error);
      alert("Failed to load details");
    }
  };

  const refreshStats = async () => {
    try {
      const extStats = await fetchAPI<ExtendedStats>("/admin/extended-stats");
      if (extStats) setStats(extStats);
    } catch {
      const basicStats = await apiClient.getAdminStats() as AdminStats | null;
      if (basicStats) {
        setStats({
          ...basicStats,
          total_documents: 0,
          pending_documents: 0,
          total_portfolios: 0,
          pending_portfolios: 0,
          active_relationships: 0,
        });
      }
    }
  };

  if (!user || user.userType !== "clinical_admin") {
    return null;
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Tab configuration
  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "doctor-verifications", label: "🩺 Verify Doctors", icon: "✅", count: pendingDoctorVerifications.length },
    { id: "users", label: "Users", icon: "👥", count: stats?.total_users },
    { id: "doctors", label: "Doctors", icon: "🩺", count: stats?.total_doctors },
    { id: "hospitals", label: "Hospitals", icon: "🏥", count: stats?.total_hospitals },
    { id: "verifications", label: "All Verifications", icon: "📋", count: stats?.pending_verifications },
    { id: "documents", label: "Documents", icon: "📄", count: stats?.pending_documents },
    { id: "portfolios", label: "Portfolios", icon: "📁", count: stats?.pending_portfolios },
    { id: "relationships", label: "Relationships", icon: "🔗", count: stats?.active_relationships },
    { id: "hospital-types", label: "Hospital Types", icon: "🏷️", count: hospitalTypes.length },
    { id: "specializations", label: "Specializations", icon: "⚕️", count: specializations.length },
  ];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* HEADER */}
      <header className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b shadow-sm`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                🏥 Clinical Admin Dashboard
              </h1>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Welcome, {user.name} • Full Management Access
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 pr-4 py-2 rounded-lg border ${
                    isDark 
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                      : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TAB NAVIGATION */}
      <nav className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? `${isDark ? "border-blue-400 text-blue-400" : "border-blue-600 text-blue-600"}`
                    : `border-transparent ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"}`
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard icon="👥" label="Total Users" value={stats?.total_users || 0} color="blue" isDark={isDark} />
              <StatCard icon="🩺" label="Total Doctors" value={stats?.total_doctors || 0} color="green" isDark={isDark} />
              <StatCard icon="🏥" label="Total Hospitals" value={stats?.total_hospitals || 0} color="purple" isDark={isDark} />
              <StatCard icon="📅" label="Appointments" value={stats?.total_appointments || 0} color="indigo" isDark={isDark} />
              <StatCard icon="⏳" label="Pending Verifications" value={stats?.pending_verifications || 0} color="yellow" isDark={isDark} />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="📄" label="Total Documents" value={stats?.total_documents || 0} color="cyan" isDark={isDark} />
              <StatCard icon="📝" label="Pending Documents" value={stats?.pending_documents || 0} color="orange" isDark={isDark} />
              <StatCard icon="📁" label="Total Portfolios" value={stats?.total_portfolios || 0} color="pink" isDark={isDark} />
              <StatCard icon="🔗" label="Active Relationships" value={stats?.active_relationships || 0} color="teal" isDark={isDark} />
            </div>

            {/* Quick Actions */}
            <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-xl shadow-lg p-6 border`}>
              <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"} mb-4`}>Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tabs.slice(1).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`p-4 rounded-lg border transition-all hover:scale-105 ${
                      isDark 
                        ? "bg-gray-700 border-gray-600 hover:bg-gray-600" 
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-2xl block mb-2">{tab.icon}</span>
                    <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      Manage {tab.label}
                    </p>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <DataTable
            title="User Management"
            description="Manage all registered patients and users"
            icon="👥"
            isDark={isDark}
            data={users.filter(u => 
              u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.mobile?.includes(searchQuery)
            )}
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "mobile", label: "Mobile" },
              { key: "userType", label: "Type" },
              { key: "verified", label: "Verified", render: (v: boolean) => v ? "✅" : "❌" },
            ]}
            actions={(item: User) => (
              <div className="flex gap-2">
                <button
                  onClick={() => viewDetails("users", item._id || item.id)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleDeleteUser(item._id || item.id)}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          />
        )}

        {/* DOCTORS TAB */}
        {activeTab === "doctors" && (
          <DataTable
            title="Doctor Management"
            description="Manage all registered doctors and their profiles"
            icon="🩺"
            isDark={isDark}
            data={doctors.filter(d => 
              d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              d.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            columns={[
              { key: "name", label: "Name" },
              { key: "specialization", label: "Specialization" },
              { key: "qualification", label: "Qualification" },
              { key: "experience", label: "Experience", render: (v: number) => v ? `${v} yrs` : "-" },
              { key: "verified", label: "Verified", render: (v: boolean) => v ? "✅" : "❌" },
            ]}
            actions={(item: Doctor) => (
              <div className="flex gap-2">
                <button
                  onClick={() => viewDetails("doctors", item._id || item.id)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleDeleteDoctor(item._id || item.id)}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          />
        )}

        {/* HOSPITALS TAB */}
        {activeTab === "hospitals" && (
          <DataTable
            title="Hospital Management"
            description="Manage all registered hospitals and clinics"
            icon="🏥"
            isDark={isDark}
            data={hospitals.filter(h => 
              h.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              h.city?.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            columns={[
              { key: "name", label: "Name" },
              { key: "city", label: "City" },
              { key: "address", label: "Address" },
              { key: "phone", label: "Phone" },
              { key: "verified", label: "Verified", render: (v: boolean) => v ? "✅" : "❌" },
            ]}
            actions={(item: Hospital) => (
              <div className="flex gap-2">
                <button
                  onClick={() => viewDetails("hospitals", item._id || item.id)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleDeleteHospital(item._id || item.id)}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          />
        )}

        {/* DOCTOR VERIFICATIONS TAB - Dedicated section for verifying doctors */}
        {activeTab === "doctor-verifications" && (
          <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-xl shadow-lg border`}>
            <div className={`p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🩺</span>
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Doctor Verification Panel</h3>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Review doctor credentials, verify their details, and approve them to practice. 
                    Approved doctors will receive a notification and can start accepting appointments.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {pendingDoctorVerifications.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-6xl block mb-4">✅</span>
                  <p className={`text-lg font-medium ${isDark ? "text-white" : "text-gray-900"}`}>All Doctors Verified!</p>
                  <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>No pending doctor verifications at this time.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pendingDoctorVerifications.map((item) => (
                    <div 
                      key={item.verification._id || item.verification.id} 
                      className={`border-2 rounded-xl p-6 ${isDark ? "border-gray-600 bg-gray-750" : "border-gray-200 bg-white shadow-md"}`}
                    >
                      {/* Doctor Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${isDark ? "bg-blue-900" : "bg-blue-100"}`}>
                            🩺
                          </div>
                          <div>
                            <h4 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                              {item.doctor?.name || "Unknown Doctor"}
                            </h4>
                            <p className={`text-sm ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                              {item.doctor?.specialization || "Specialization not specified"}
                            </p>
                            <span className="inline-block mt-1 px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              ⏳ Pending Verification
                            </span>
                          </div>
                        </div>
                        <div className={`text-right text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          Applied: {new Date(item.verification.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Doctor Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {/* Qualifications */}
                        <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                          <span className={`text-xs font-semibold uppercase ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            🎓 Qualifications
                          </span>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {Array.isArray(item.doctor?.qualifications) 
                              ? item.doctor.qualifications.join(", ") 
                              : item.doctor?.qualifications || "Not specified"}
                          </p>
                        </div>

                        {/* Experience */}
                        <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                          <span className={`text-xs font-semibold uppercase ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            📅 Experience
                          </span>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {item.doctor?.experience_years || item.doctor?.experience || "Not specified"} {(item.doctor?.experience_years || item.doctor?.experience) ? "years" : ""}
                          </p>
                        </div>

                        {/* License Number */}
                        <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                          <span className={`text-xs font-semibold uppercase ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            📋 License Number
                          </span>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {item.doctor?.license_number || "Not provided"}
                          </p>
                        </div>

                        {/* Hospital */}
                        <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                          <span className={`text-xs font-semibold uppercase ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            🏥 Hospital
                          </span>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {item.hospital?.name || "Not affiliated"}
                          </p>
                          {item.hospital?.city && (
                            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              {item.hospital.city}
                            </p>
                          )}
                        </div>

                        {/* Contact Info */}
                        <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                          <span className={`text-xs font-semibold uppercase ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            📧 Contact
                          </span>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {item.user?.email || "No email"}
                          </p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {item.user?.mobile || "No mobile"}
                          </p>
                        </div>

                        {/* User Account Status */}
                        <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                          <span className={`text-xs font-semibold uppercase ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            👤 Account Status
                          </span>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {item.user?.userType === "doctor" ? "Doctor Account" : "User Account"}
                          </p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            Registered: {item.user?.createdAt ? new Date(item.user.createdAt).toLocaleDateString() : "Unknown"}
                          </p>
                        </div>
                      </div>

                      {/* Required Documents */}
                      {item.verification.documents_required && (
                        <div className={`mb-4 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                          <span className={`text-xs font-semibold uppercase ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            📄 Required Documents
                          </span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.verification.documents_required.map((doc, idx) => (
                              <span 
                                key={idx}
                                className={`px-2 py-1 text-xs rounded ${
                                  item.verification.documents_submitted?.includes(doc)
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {item.verification.documents_submitted?.includes(doc) ? "✓" : "✗"} {doc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => openVerificationModal(item, "approve")}
                          className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                        >
                          ✅ Verify & Approve Doctor
                        </button>
                        <button
                          onClick={() => openVerificationModal(item, "reject")}
                          className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                        >
                          ❌ Reject Verification
                        </button>
                        <button
                          onClick={() => viewDetails("doctors", item.doctor?._id || item.doctor?.id || "")}
                          className={`px-6 py-3 font-semibold rounded-lg transition ${
                            isDark 
                              ? "bg-gray-700 text-gray-200 hover:bg-gray-600" 
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          📋 View Full Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Modal with Comments */}
        {showVerificationModal && selectedVerification && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-2xl max-w-lg w-full`}>
              <div className={`p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{verificationAction === "approve" ? "✅" : "❌"}</span>
                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {verificationAction === "approve" ? "Approve Doctor" : "Reject Doctor"}
                    </h3>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {selectedVerification.doctor?.name || "Doctor"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {verificationAction === "approve" ? "Admin Comments (Optional)" : "Rejection Reason (Required)"}
                  </label>
                  <textarea
                    value={verificationComments}
                    onChange={(e) => setVerificationComments(e.target.value)}
                    placeholder={verificationAction === "approve" 
                      ? "Add comments about the verification (e.g., credentials verified, documents reviewed)..."
                      : "Please explain why this verification is being rejected..."
                    }
                    rows={4}
                    className={`w-full p-3 rounded-lg border ${
                      isDark 
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                        : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {verificationAction === "approve" && (
                  <div className={`mb-4 p-4 rounded-lg ${isDark ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200"} border`}>
                    <p className={`text-sm ${isDark ? "text-green-300" : "text-green-800"}`}>
                      <strong>✅ Upon approval:</strong>
                    </p>
                    <ul className={`text-sm mt-2 space-y-1 ${isDark ? "text-green-400" : "text-green-700"}`}>
                      <li>• Doctor will be marked as verified</li>
                      <li>• Doctor can start accepting patient appointments</li>
                      <li>• Notification will be sent to the doctor</li>
                    </ul>
                  </div>
                )}

                {verificationAction === "reject" && (
                  <div className={`mb-4 p-4 rounded-lg ${isDark ? "bg-red-900/30 border-red-700" : "bg-red-50 border-red-200"} border`}>
                    <p className={`text-sm ${isDark ? "text-red-300" : "text-red-800"}`}>
                      <strong>❌ Upon rejection:</strong>
                    </p>
                    <ul className={`text-sm mt-2 space-y-1 ${isDark ? "text-red-400" : "text-red-700"}`}>
                      <li>• Doctor will be notified about the rejection</li>
                      <li>• Doctor will need to resubmit documents/credentials</li>
                      <li>• Your rejection reason will be shared with the doctor</li>
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleDoctorVerificationWithComments}
                    className={`flex-1 px-6 py-3 font-bold rounded-lg transition ${
                      verificationAction === "approve"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {verificationAction === "approve" ? "✅ Confirm Approval" : "❌ Confirm Rejection"}
                  </button>
                  <button
                    onClick={() => {
                      setShowVerificationModal(false);
                      setSelectedVerification(null);
                      setVerificationComments("");
                    }}
                    className={`px-6 py-3 font-semibold rounded-lg transition ${
                      isDark 
                        ? "bg-gray-700 text-gray-200 hover:bg-gray-600" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VERIFICATIONS TAB */}
        {activeTab === "verifications" && (
          <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-xl shadow-lg border`}>
            <div className={`p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Background Verifications</h3>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Review and approve verification requests</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {verifications.length === 0 ? (
                <EmptyState message="No pending verifications" icon="✅" isDark={isDark} />
              ) : (
                <div className="space-y-4">
                  {verifications.map((verification) => (
                    <div key={verification._id || verification.id} className={`border rounded-lg p-4 ${isDark ? "border-gray-700 bg-gray-750" : "border-gray-200 bg-gray-50"}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              verification.entity_type === 'user' ? 'bg-blue-100 text-blue-800' :
                              verification.entity_type === 'doctor' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {verification.entity_type.toUpperCase()}
                            </span>
                            <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              ID: {verification.entity_id}
                            </span>
                          </div>
                          {verification.documents_required && (
                            <div className="mb-2">
                              <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Required: </span>
                              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {verification.documents_required.join(", ")}
                              </span>
                            </div>
                          )}
                          {verification.documents_submitted && verification.documents_submitted.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-green-600">Submitted: </span>
                              <span className="text-sm text-green-500">
                                {verification.documents_submitted.join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApproveVerification(verification._id || verification.id)}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectVerification(verification._id || verification.id)}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === "documents" && (
          <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-xl shadow-lg border`}>
            <div className={`p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>User Documents</h3>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Review and verify user-submitted documents</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {documents.length === 0 ? (
                <EmptyState message="No documents submitted" icon="📄" isDark={isDark} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>User</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Document Type</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Name</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Status</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
                      {documents.map((doc) => (
                        <tr key={doc._id || doc.id} className={`${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{doc.user_name || "Unknown"}</td>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{doc.document_type}</td>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{doc.document_name}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={doc.status} />
                          </td>
                          <td className="px-4 py-3">
                            {doc.status === "pending" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleVerifyDocument(doc._id || doc.id)}
                                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => handleRejectDocument(doc._id || doc.id)}
                                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PORTFOLIOS TAB */}
        {activeTab === "portfolios" && (
          <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-xl shadow-lg border`}>
            <div className={`p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📁</span>
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Doctor Portfolios</h3>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Review and verify doctor certificates and credentials</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {portfolios.length === 0 ? (
                <EmptyState message="No portfolio items submitted" icon="📁" isDark={isDark} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Doctor</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Type</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Title</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Status</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
                      {portfolios.map((portfolio) => (
                        <tr key={portfolio._id || portfolio.id} className={`${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{portfolio.doctor_name || "Unknown"}</td>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{portfolio.item_type}</td>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{portfolio.title}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={portfolio.status} />
                          </td>
                          <td className="px-4 py-3">
                            {portfolio.status === "pending" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleVerifyPortfolio(portfolio._id || portfolio.id)}
                                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => handleRejectPortfolio(portfolio._id || portfolio.id)}
                                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RELATIONSHIPS TAB */}
        {activeTab === "relationships" && (
          <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-xl shadow-lg border`}>
            <div className={`p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔗</span>
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Doctor-Patient Relationships</h3>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Manage care relationships between doctors and patients</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {relationships.length === 0 ? (
                <EmptyState message="No relationships established" icon="🔗" isDark={isDark} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Doctor</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Patient</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Hospital</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Primary Care</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Status</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
                      {relationships.map((rel) => (
                        <tr key={rel._id || rel.id} className={`${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{rel.doctor_name || "Unknown"}</td>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{rel.patient_name || "Unknown"}</td>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{rel.hospital_name || "-"}</td>
                          <td className={`px-4 py-3 text-sm`}>{rel.primary_care ? "✅ Yes" : "❌ No"}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={rel.status} />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteRelationship(rel._id || rel.id)}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HOSPITAL TYPES TAB */}
        {activeTab === "hospital-types" && (
          <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-xl shadow-lg border`}>
            <div className={`p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏷️</span>
                  <div>
                    <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Hospital Types</h3>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Manage hospital type categories for filtering</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Add New Hospital Type Form */}
              <div className={`mb-6 p-4 rounded-lg border ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
                <h4 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                  {editingHospitalType ? "Edit Hospital Type" : "Add New Hospital Type"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    type="text"
                    placeholder="Type Name *"
                    value={editingHospitalType ? editingHospitalType.name : newHospitalType.name}
                    onChange={(e) => editingHospitalType 
                      ? setEditingHospitalType({...editingHospitalType, name: e.target.value})
                      : setNewHospitalType({...newHospitalType, name: e.target.value})
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      isDark ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={editingHospitalType ? editingHospitalType.description || "" : newHospitalType.description}
                    onChange={(e) => editingHospitalType
                      ? setEditingHospitalType({...editingHospitalType, description: e.target.value})
                      : setNewHospitalType({...newHospitalType, description: e.target.value})
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      isDark ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Icon (emoji)"
                    value={editingHospitalType ? editingHospitalType.icon || "" : newHospitalType.icon}
                    onChange={(e) => editingHospitalType
                      ? setEditingHospitalType({...editingHospitalType, icon: e.target.value})
                      : setNewHospitalType({...newHospitalType, icon: e.target.value})
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      isDark ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300"
                    }`}
                  />
                  <div className="flex gap-2">
                    {editingHospitalType ? (
                      <>
                        <button
                          onClick={handleUpdateHospitalType}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-1"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => setEditingHospitalType(null)}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleCreateHospitalType}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex-1"
                      >
                        Add Type
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Hospital Types List */}
              {hospitalTypes.length === 0 ? (
                <EmptyState message="No hospital types defined" icon="🏷️" isDark={isDark} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Icon</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Name</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Description</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Status</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
                      {hospitalTypes.map((type) => (
                        <tr key={type._id || type.id} className={`${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                          <td className="px-4 py-3 text-xl">{type.icon || "🏥"}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{type.name}</td>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{type.description || "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              type.is_active 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }`}>
                              {type.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingHospitalType(type)}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteHospitalType(type._id || type.id)}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SPECIALIZATIONS TAB */}
        {activeTab === "specializations" && (
          <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-xl shadow-lg border`}>
            <div className={`p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚕️</span>
                  <div>
                    <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Specializations</h3>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Manage medical specializations for doctors and hospitals</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Add New Specialization Form */}
              <div className={`mb-6 p-4 rounded-lg border ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
                <h4 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                  {editingSpecialization ? "Edit Specialization" : "Add New Specialization"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={editingSpecialization ? editingSpecialization.name : newSpecialization.name}
                    onChange={(e) => editingSpecialization 
                      ? setEditingSpecialization({...editingSpecialization, name: e.target.value})
                      : setNewSpecialization({...newSpecialization, name: e.target.value})
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      isDark ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={editingSpecialization ? editingSpecialization.description || "" : newSpecialization.description}
                    onChange={(e) => editingSpecialization
                      ? setEditingSpecialization({...editingSpecialization, description: e.target.value})
                      : setNewSpecialization({...newSpecialization, description: e.target.value})
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      isDark ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Icon (emoji)"
                    value={editingSpecialization ? editingSpecialization.icon || "" : newSpecialization.icon}
                    onChange={(e) => editingSpecialization
                      ? setEditingSpecialization({...editingSpecialization, icon: e.target.value})
                      : setNewSpecialization({...newSpecialization, icon: e.target.value})
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      isDark ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={editingSpecialization ? editingSpecialization.category || "" : newSpecialization.category}
                    onChange={(e) => editingSpecialization
                      ? setEditingSpecialization({...editingSpecialization, category: e.target.value})
                      : setNewSpecialization({...newSpecialization, category: e.target.value})
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      isDark ? "bg-gray-600 border-gray-500 text-white" : "bg-white border-gray-300"
                    }`}
                  />
                  <div className="flex gap-2">
                    {editingSpecialization ? (
                      <>
                        <button
                          onClick={handleUpdateSpecialization}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-1"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => setEditingSpecialization(null)}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleCreateSpecialization}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex-1"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Specializations List */}
              {specializations.length === 0 ? (
                <EmptyState message="No specializations defined" icon="⚕️" isDark={isDark} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Icon</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Name</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Description</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Category</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Status</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
                      {specializations.map((spec) => (
                        <tr key={spec._id || spec.id} className={`${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                          <td className="px-4 py-3 text-xl">{spec.icon || "🩺"}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{spec.name}</td>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{spec.description || "-"}</td>
                          <td className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{spec.category || "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              spec.is_active 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }`}>
                              {spec.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingSpecialization(spec)}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSpecialization(spec._id || spec.id)}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* DETAILS MODAL */}
      {showModal && selectedItem && (
        <DetailsModal
          type={modalType}
          data={selectedItem}
          isDark={isDark}
          onClose={() => {
            setShowModal(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}

// ============== HELPER COMPONENTS ==============

function StatCard({ icon, label, value, color, isDark }: { icon: string; label: string; value: number; color: string; isDark: boolean }) {
  const colorClasses: Record<string, string> = {
    blue: isDark ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-200",
    green: isDark ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200",
    purple: isDark ? "bg-purple-900/30 border-purple-700" : "bg-purple-50 border-purple-200",
    yellow: isDark ? "bg-yellow-900/30 border-yellow-700" : "bg-yellow-50 border-yellow-200",
    indigo: isDark ? "bg-indigo-900/30 border-indigo-700" : "bg-indigo-50 border-indigo-200",
    cyan: isDark ? "bg-cyan-900/30 border-cyan-700" : "bg-cyan-50 border-cyan-200",
    orange: isDark ? "bg-orange-900/30 border-orange-700" : "bg-orange-50 border-orange-200",
    pink: isDark ? "bg-pink-900/30 border-pink-700" : "bg-pink-50 border-pink-200",
    teal: isDark ? "bg-teal-900/30 border-teal-700" : "bg-teal-50 border-teal-200",
  };

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]} transition-all hover:scale-105`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{label}</p>
          <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusClasses: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    verified: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    terminated: "bg-red-100 text-red-800",
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status] || "bg-gray-100 text-gray-800"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function EmptyState({ message, icon, isDark }: { message: string; icon: string; isDark: boolean }) {
  return (
    <div className="text-center py-12">
      <span className="text-6xl block mb-4">{icon}</span>
      <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{message}</p>
    </div>
  );
}

interface Column {
  key: string;
  label: string;
  render?: (value: any) => React.ReactNode;
}

function DataTable({ 
  title, 
  description, 
  icon, 
  isDark, 
  data, 
  columns, 
  actions 
}: { 
  title: string; 
  description: string; 
  icon: string; 
  isDark: boolean; 
  data: any[]; 
  columns: Column[];
  actions: (item: any) => React.ReactNode;
}) {
  return (
    <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-xl shadow-lg border`}>
      <div className={`p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{title}</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {data.length === 0 ? (
          <EmptyState message={`No ${title.toLowerCase()} found`} icon={icon} isDark={isDark} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                  {columns.map((col) => (
                    <th key={col.key} className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {col.label}
                    </th>
                  ))}
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
                {data.map((item, idx) => (
                  <tr key={item._id || item.id || idx} className={`${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {col.render ? col.render(item[col.key]) : (item[col.key] || "-")}
                      </td>
                    ))}
                    <td className="px-4 py-3">{actions(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsModal({ type, data, isDark, onClose }: { type: string; data: any; isDark: boolean; onClose: () => void }) {
  const typeLabels: Record<string, string> = {
    users: "User Details",
    doctors: "Doctor Details",
    hospitals: "Hospital Details",
  };

  const entityKey = type.endsWith('s') ? type.slice(0, -1) : type;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden`}>
        <div className={`p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"} flex items-center justify-between`}>
          <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            {typeLabels[type] || "Details"}
          </h2>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Main Entity Info */}
          <div className={`mb-6 p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
            <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {data[entityKey] && Object.entries(data[entityKey]).map(([key, value]) => (
                key !== "_id" && key !== "password" && (
                  <div key={key}>
                    <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")}
                    </span>
                    <p className={`${isDark ? "text-white" : "text-gray-900"}`}>
                      {typeof value === "boolean" ? (value ? "Yes" : "No") : (value as string) || "-"}
                    </p>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Documents/Portfolios */}
          {(data.documents?.length > 0 || data.portfolios?.length > 0) && (
            <div className={`mb-6 p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
              <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                {data.documents ? "📄 Documents" : "📁 Portfolios"}
              </h3>
              <div className="space-y-2">
                {(data.documents || data.portfolios || []).map((item: any, idx: number) => (
                  <div key={idx} className={`p-3 rounded border ${isDark ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        {item.document_name || item.title}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {item.document_type || item.item_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointments */}
          {data.appointments?.length > 0 && (
            <div className={`mb-6 p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
              <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                📅 Appointments ({data.appointments.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {data.appointments.slice(0, 5).map((apt: any, idx: number) => (
                  <div key={idx} className={`p-3 rounded border ${isDark ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                        {new Date(apt.appointment_date).toLocaleDateString()}
                      </span>
                      <StatusBadge status={apt.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          {data.relationships?.length > 0 && (
            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
              <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                🔗 Relationships ({data.relationships.length})
              </h3>
              <div className="space-y-2">
                {data.relationships.map((rel: any, idx: number) => (
                  <div key={idx} className={`p-3 rounded border ${isDark ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                        {rel.doctor_name || rel.patient_name || "Unknown"}
                      </span>
                      <StatusBadge status={rel.status} />
                    </div>
                    {rel.primary_care && (
                      <span className="text-xs text-green-500">Primary Care Provider</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification */}
          {data.verification && (
            <div className={`mt-6 p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
              <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                ✅ Verification Status
              </h3>
              <StatusBadge status={data.verification.status} />
              {data.verification.verification_notes && (
                <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Notes: {data.verification.verification_notes}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
