from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
from typing import Optional, List, Union
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    user = "user"
    doctor = "doctor"
    clinical_admin = "clinical_admin"

class UserBase(BaseModel):
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    userType: UserRole = UserRole.user

class UserCreate(UserBase):
    password: str

class UserCreateWithOTP(UserBase):
    """Schema for OTP-based registration (no password required)"""
    otp: str
    dob: Optional[str] = None
    gender: Optional[str] = None
    registration_number: Optional[str] = None  # Medical registration number for doctors

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    password: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    profile_image: Optional[str] = None
    # Doctor-specific fields
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_fee: Optional[float] = None
    available_days: Optional[List[str]] = None
    available_time_start: Optional[str] = None
    available_time_end: Optional[str] = None
    bio: Optional[str] = None
    languages: Optional[List[str]] = None
    registration_number: Optional[str] = None

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    userType: UserRole = UserRole.user
    currentRole: UserRole = UserRole.user
    createdAt: Optional[datetime] = None
    # Profile fields
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    profile_image: Optional[str] = None
    # Doctor-specific fields
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_fee: Optional[float] = None
    available_days: Optional[List[str]] = None
    available_time_start: Optional[str] = None
    available_time_end: Optional[str] = None
    bio: Optional[str] = None
    languages: Optional[List[str]] = None
    registration_number: Optional[str] = None
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        serialize_by_alias=True  # This ensures JSON output uses "_id" instead of "id"
    )

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class OTPSendRequest(BaseModel):
    email: EmailStr

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
    name: Optional[str] = None
    mobile: Optional[str] = None
    userType: Optional[str] = "user"
    dob: Optional[str] = None
    gender: Optional[str] = None
    regNumber: Optional[str] = None

    class Config:
        allow_population_by_field_name = True

class OTPResponse(BaseModel):
    message: str
    otp_id: Optional[str] = None
    expires_in: Optional[int] = None

class SwitchRoleRequest(BaseModel):
    new_role: UserRole

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class HospitalBase(BaseModel):
    name: str
    location: str
    city: str
    rating: Optional[float] = None
    specialties: Optional[List[str]] = None
    phone: Optional[str] = None
    website: Optional[str] = None

class HospitalCreate(HospitalBase):
    pass

class HospitalResponse(HospitalBase):
    id: str = Field(alias="_id")
    createdAt: datetime
    doctors: Optional[List[dict]] = None

    class Config:
        populate_by_name = True

class DoctorBase(BaseModel):
    name: str
    specialization: str
    hospital_id: Optional[str] = None
    rating: Optional[float] = None
    experience_years: Optional[int] = None
    qualifications: Optional[List[str]] = None

class DoctorCreate(DoctorBase):
    user_id: Optional[str] = None
    license_number: Optional[str] = None
    consultation_fee: Optional[int] = None
    available_days: Optional[List[str]] = None
    available_time_start: Optional[str] = None
    available_time_end: Optional[str] = None
    # Additional comprehensive fields
    education: Optional[str] = None
    awards: Optional[List[str]] = None
    publications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    emergency_contact: Optional[str] = None
    work_history: Optional[List[dict]] = None  # Previous hospitals, positions, duration
    certifications: Optional[List[str]] = None
    professional_memberships: Optional[List[str]] = None
    research_interests: Optional[List[str]] = None
    consultation_types: Optional[List[str]] = None
    preferred_payment_methods: Optional[List[str]] = None

class DoctorUpdate(BaseModel):
    # Required fields for enrollment
    specialization: str
    hospital_id: str

    # Optional fields - all can be updated
    name: Optional[str] = None
    experience_years: Optional[Union[str, int]] = None
    qualifications: Optional[Union[str, List[str]]] = None
    license_number: Optional[str] = None
    consultation_fee: Optional[Union[str, int]] = None
    available_days: Optional[List[str]] = None
    available_time_start: Optional[str] = None
    available_time_end: Optional[str] = None

    # Additional comprehensive fields
    education: Optional[str] = None
    awards: Optional[List[str]] = None
    publications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    emergency_contact: Optional[str] = None
    work_history: Optional[List[dict]] = None
    certifications: Optional[List[str]] = None
    professional_memberships: Optional[List[str]] = None
    research_interests: Optional[List[str]] = None
    consultation_types: Optional[List[str]] = None
    preferred_payment_methods: Optional[List[str]] = None

    class Config:
        extra = "allow"  # Allow extra fields to be stored

    @field_validator('qualifications')
    @classmethod
    def validate_qualifications(cls, v):
        if isinstance(v, str):
            # Convert string to list
            return [q.strip() for q in v.replace('\n', ',').split(',') if q.strip()]
        return v

class DoctorResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    specialization: str
    hospital_id: Optional[str] = None
    rating: Optional[float] = None
    experience_years: Optional[int] = None
    qualifications: Optional[List[str]] = None
    user_id: Optional[str] = None
    license_number: Optional[str] = None
    consultation_fee: Optional[int] = None
    available_days: Optional[List[str]] = None
    available_time_start: Optional[str] = None
    available_time_end: Optional[str] = None
    createdAt: Optional[datetime] = None

    # Verification status
    verified: Optional[bool] = False
    is_active: Optional[bool] = False

    # Additional comprehensive fields
    education: Optional[str] = None
    awards: Optional[List[str]] = None
    publications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    emergency_contact: Optional[str] = None
    work_history: Optional[List[dict]] = None
    certifications: Optional[List[str]] = None
    professional_memberships: Optional[List[str]] = None
    research_interests: Optional[List[str]] = None
    consultation_types: Optional[List[str]] = None
    preferred_payment_methods: Optional[List[str]] = None

    # Online/Offline status and additional metadata
    is_online: Optional[bool] = False
    last_seen: Optional[datetime] = None
    status_message: Optional[str] = None
    current_location: Optional[str] = None
    emergency_available: Optional[bool] = False

    class Config:
        populate_by_name = True

class AppointmentStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"
    missed = "missed"
    rescheduled = "rescheduled"

class AppointmentBase(BaseModel):
    patient_id: str
    doctor_id: str
    hospital_id: str
    appointment_date: datetime
    status: AppointmentStatus = AppointmentStatus.pending
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None

class PatientInfo(BaseModel):
    id: str
    name: str
    email: Optional[str] = ""
    mobile: Optional[str] = ""

class AppointmentResponse(AppointmentBase):
    id: str = Field(alias="_id")
    createdAt: datetime
    patient_info: Optional[PatientInfo] = None  # Added for doctor view
    
    # Dynamic fields populated from doctor/hospital lookups
    doctorName: Optional[str] = None
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    qualifications: Optional[List[str]] = None
    experience_years: Optional[str] = None
    department: Optional[str] = None
    is_available: Optional[bool] = True  # Doctor availability status
    
    class Config:
        populate_by_name = True

class MedicalRecordBase(BaseModel):
    patient_id: str
    record_type: str
    title: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    doctor_notes: Optional[str] = None

class MedicalRecordCreate(MedicalRecordBase):
    pass

class MedicalRecordResponse(MedicalRecordBase):
    id: str = Field(alias="_id")
    createdAt: Optional[datetime] = None
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    appointment_id: Optional[str] = None
    uploaded_by: Optional[str] = None
    patient_name: Optional[str] = None  # Added for doctor view
    source: Optional[str] = None  # 'chat' or 'upload' - indicates where file was uploaded from
    conversation_id: Optional[str] = None  # If uploaded via chat, the conversation ID
    
    class Config:
        populate_by_name = True

class SettingsBase(BaseModel):
    notifications: Optional[dict] = None
    privacy: Optional[dict] = None
    preferences: Optional[dict] = None

class SettingsUpdate(SettingsBase):
    pass

class SettingsResponse(SettingsBase):
    user_id: str
    id: str = Field(alias="_id")
    updatedAt: datetime

    class Config:
        populate_by_name = True

class VerificationStatus(str, Enum):
    pending = "pending"
    under_review = "under_review"
    verified = "verified"
    rejected = "rejected"

class BackgroundVerificationBase(BaseModel):
    entity_type: str  # "user", "doctor", "hospital"
    entity_id: str
    status: VerificationStatus = VerificationStatus.pending
    verified_by: Optional[str] = None
    verification_notes: Optional[str] = None
    documents_required: Optional[List[str]] = None
    documents_submitted: Optional[List[str]] = None

class BackgroundVerificationCreate(BackgroundVerificationBase):
    pass

class BackgroundVerificationUpdate(BaseModel):
    status: Optional[VerificationStatus] = None
    verification_notes: Optional[str] = None
    documents_submitted: Optional[List[str]] = None

class BackgroundVerificationResponse(BackgroundVerificationBase):
    id: str = Field(alias="_id")
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True

class AdminStats(BaseModel):
    total_users: int
    total_doctors: int
    total_hospitals: int
    pending_verifications: int
    total_appointments: int

# Document Tracking Schemas
class DocumentType(str, Enum):
    id_proof = "id_proof"
    address_proof = "address_proof"
    medical_report = "medical_report"
    prescription = "prescription"
    insurance = "insurance"
    other = "other"

class DocumentStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"

class UserDocumentBase(BaseModel):
    user_id: str
    document_type: DocumentType
    document_name: str
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    status: DocumentStatus = DocumentStatus.pending
    notes: Optional[str] = None
    verified_by: Optional[str] = None

class UserDocumentCreate(UserDocumentBase):
    pass

class UserDocumentUpdate(BaseModel):
    status: Optional[DocumentStatus] = None
    notes: Optional[str] = None
    verified_by: Optional[str] = None

class UserDocumentResponse(UserDocumentBase):
    id: str = Field(alias="_id")
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    user_name: Optional[str] = None
    
    class Config:
        populate_by_name = True

# Doctor Portfolio Schemas
class PortfolioItemType(str, Enum):
    certificate = "certificate"
    degree = "degree"
    license = "license"
    award = "award"
    publication = "publication"
    specialization = "specialization"
    experience = "experience"
    other = "other"

class DoctorPortfolioBase(BaseModel):
    doctor_id: str
    item_type: PortfolioItemType
    title: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    issuing_authority: Optional[str] = None
    status: DocumentStatus = DocumentStatus.pending
    verified_by: Optional[str] = None
    verification_notes: Optional[str] = None

class DoctorPortfolioCreate(DoctorPortfolioBase):
    pass

class DoctorPortfolioUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[DocumentStatus] = None
    verification_notes: Optional[str] = None
    verified_by: Optional[str] = None

class DoctorPortfolioResponse(DoctorPortfolioBase):
    id: str = Field(alias="_id")
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    doctor_name: Optional[str] = None
    
    class Config:
        populate_by_name = True

# Doctor-Patient Relationship Schemas
class RelationshipStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    pending = "pending"
    terminated = "terminated"

class DoctorPatientRelationshipBase(BaseModel):
    doctor_id: str
    patient_id: str
    hospital_id: Optional[str] = None
    status: RelationshipStatus = RelationshipStatus.active
    start_date: datetime
    end_date: Optional[datetime] = None
    notes: Optional[str] = None
    primary_care: bool = False

class DoctorPatientRelationshipCreate(DoctorPatientRelationshipBase):
    pass

class DoctorPatientRelationshipUpdate(BaseModel):
    status: Optional[RelationshipStatus] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None
    primary_care: Optional[bool] = None

class DoctorPatientRelationshipResponse(DoctorPatientRelationshipBase):
    id: str = Field(alias="_id")
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    hospital_name: Optional[str] = None
    
    class Config:
        populate_by_name = True

# Extended Admin Stats
class AdminExtendedStats(AdminStats):
    total_documents: int
    pending_documents: int
    total_portfolios: int
    pending_portfolios: int
    active_relationships: int

# Hospital Types/Categories (Admin Managed)
class HospitalTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool = True

class HospitalTypeCreate(HospitalTypeBase):
    pass

class HospitalTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None

class HospitalTypeResponse(HospitalTypeBase):
    id: str = Field(alias="_id")
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    
    class Config:
        populate_by_name = True

# Specializations (Admin Managed)
class SpecializationBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    is_active: bool = True

class SpecializationCreate(SpecializationBase):
    pass

class SpecializationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class SpecializationResponse(SpecializationBase):
    id: str = Field(alias="_id")
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
