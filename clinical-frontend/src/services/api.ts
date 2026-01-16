// (Removed misplaced sendOtp and verifyOtp from top-level)
const API_BASE_URL = "https://wellnessdev.onrender.com";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Get token from localStorage
function getAuthToken(): string | null {
  const token = localStorage.getItem("authToken");
  console.log("🔑 API Client - Retrieved auth token:", token ? `${token.substring(0, 20)}...` : "NO TOKEN");
  return token;
}

// Make API request with auth token
export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const headers: any = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = getAuthToken();
    
    // If endpoint requires auth (not login/register/health) and no token, throw early
    const publicEndpoints = ['/auth/login', '/auth/register', '/auth/send-otp', '/auth/verify-otp', '/health', '/hospitals'];
    const isPublic = publicEndpoints.some(ep => endpoint.startsWith(ep));
    
    if (!token && !isPublic) {
      console.warn(`⚠️ No auth token for protected endpoint: ${endpoint}`);
      throw new Error("Not authenticated");
    }
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    console.log(`🔄 API Request: ${options.method || 'GET'} ${API_BASE_URL}${endpoint}`);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    console.log(`📡 API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${response.statusText}`, errorText);
      
      // Handle 401 Unauthorized - clear auth and redirect to login
      if (response.status === 401) {
        console.warn("🔒 Unauthorized - Clearing auth data");
        localStorage.removeItem("authToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("userType");
        localStorage.removeItem("userName");
        localStorage.removeItem("currentRole");
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ API Success:`, data);
    return data;
  } catch (error) {
    console.error("❌ API Request failed:", error);
    throw error; // Re-throw to let caller handle it
  }
}

export const apiClient = {
    // OTP Authentication for login
    async sendOtp(email: string) {
      return fetchAPI("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },

    async verifyOtp(userData: any) {
      return fetchAPI("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(userData),
      });
    },
  // Health check
  async health() {
    return fetchAPI("/health");
  },

  // Hospitals
  async getHospitals() {
    return fetchAPI("/hospitals/");
  },

  async getHospital(id: string) {
    return fetchAPI(`/hospitals/${id}`);
  },

  async createHospital(data: any) {
    return fetchAPI("/hospitals/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Doctors
  async getDoctors() {
    return fetchAPI("/doctors/");
  },

  async getDoctor(id: string) {
    return fetchAPI(`/doctors/${id}`);
  },

  async createDoctor(data: any) {
    return fetchAPI("/doctors/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getMyDoctorProfile() {
    return fetchAPI("/doctors/me");
  },

  async getDoctorDetails(doctorId: string) {
    return fetchAPI(`/doctors/details/${doctorId}`);
  },

  async updateMyDoctorProfile(data: any) {
    return fetchAPI("/doctors/enroll", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Appointments
  async getAppointments() {
    return fetchAPI("/appointments/");
  },

  async getUserAppointments(userId: string) {
    return fetchAPI(`/appointments/patient/${userId}`);
  },

  async createAppointment(data: any) {
    return fetchAPI("/appointments/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateAppointment(id: string, data: any) {
    return fetchAPI(`/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async getAppointmentById(id: string) {
    return fetchAPI(`/appointments/${id}`);
  },

  async approveAppointment(id: string) {
    return fetchAPI(`/appointments/${id}/approve`, {
      method: "PUT",
    });
  },

  async rejectAppointment(id: string, reason?: string) {
    const url = reason
      ? `/appointments/${id}/reject?reason=${encodeURIComponent(reason)}`
      : `/appointments/${id}/reject`;
    return fetchAPI(url, {
      method: "PUT",
    });
  },

  async completeAppointment(id: string) {
    return fetchAPI(`/appointments/${id}/complete`, {
      method: "PUT",
    });
  },

  async markAppointmentMissed(id: string) {
    return fetchAPI(`/appointments/${id}/missed`, {
      method: "PUT",
    });
  },

  async rescheduleAppointment(id: string, newDate: string) {
    return fetchAPI(`/appointments/${id}/reschedule?new_date=${encodeURIComponent(newDate)}`, {
      method: "POST",
    });
  },

  async checkMissedAppointments() {
    return fetchAPI("/appointments/check-missed", {
      method: "POST",
    });
  },

  async cancelAppointment(id: string, reason?: string) {
    return fetchAPI(`/appointments/${id}`, {
      method: "DELETE",
    });
  },

  // Medical Records
  async getMedicalRecords() {
    return fetchAPI("/medical-records/");
  },

  async getUserMedicalRecords(userId: string) {
    return fetchAPI(`/medical-records/patient/${userId}`);
  },

  async createMedicalRecord(data: any) {
    return fetchAPI("/medical-records/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async uploadMedicalFile(
    file: File,
    patientId: string,
    title: string,
    recordType: string = "other",
    description?: string,
    appointmentId?: string
  ) {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("patient_id", patientId);
    formData.append("title", title);
    formData.append("record_type", recordType);
    if (description) formData.append("description", description);
    if (appointmentId) formData.append("appointment_id", appointmentId);

    try {
      const response = await fetch(`${API_BASE_URL}/medical-records/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Medical file upload error:", error);
      throw error;
    }
  },

  async getMedicalRecordsByAppointment(appointmentId: string) {
    return fetchAPI(`/medical-records/by-appointment/${appointmentId}`);
  },

  getMedicalFileDownloadUrl(patientId: string, fileName: string) {
    return `${API_BASE_URL}/medical-records/download/${patientId}/${fileName}`;
  },

  async downloadMedicalFile(patientId: string, fileName: string) {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/medical-records/download/${patientId}/${fileName}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return true;
    } catch (error) {
      console.error("Medical file download error:", error);
      throw error;
    }
  },

  async viewMedicalFile(patientId: string, fileName: string) {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/medical-records/download/${patientId}/${fileName}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`View failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      return url;
    } catch (error) {
      console.error("Medical file view error:", error);
      throw error;
    }
  },

  async deleteMedicalRecord(recordId: string) {
    return fetchAPI(`/medical-records/${recordId}`, {
      method: "DELETE",
    });
  },

  async getMedicalRecord(recordId: string) {
    return fetchAPI(`/medical-records/${recordId}`);
  },

  async updateMedicalRecord(recordId: string, data: any) {
    return fetchAPI(`/medical-records/${recordId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Feedback
  async submitAppointmentFeedback(appointmentId: string, data: { rating: number; feedback: string; doctorId?: string; mobile?: string }) {
    return fetchAPI(`/appointments/${appointmentId}/feedback`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Settings
  async getSettings() {
    return fetchAPI("/settings/");
  },

  async updateSettings(data: any) {
    return fetchAPI("/settings/", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Users
  async getUser(id: string) {
    return fetchAPI(`/users/${id}`);
  },

  async updateUser(id: string, data: any) {
    return fetchAPI(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Auth
  async login(email: string, password: string) {
    return fetchAPI("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async register(data: any) {
    return fetchAPI("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getCurrentUser() {
    return fetchAPI("/auth/me");
  },

  async switchRole(role: string) {
    return fetchAPI("/auth/switch-role", {
      method: "POST",
      body: JSON.stringify({ new_role: role }),
    });
  },

  // OTP Authentication

  // Registration OTP (uses same endpoint as login OTP)
  async sendRegistrationOtp(email: string) {
    return fetchAPI("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },


  // ...existing code...

  async registerWithOtp(userData: any) {
    return fetchAPI("/auth/register-with-otp", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async deleteAccount() {
    return fetchAPI("/auth/delete-account", {
      method: "DELETE",
    });
  },

  // Notifications
  async getNotifications() {
    return fetchAPI("/notifications/");
  },

  async markNotificationRead(notificationId: string) {
    return fetchAPI(`/notifications/${notificationId}/read`, {
      method: "PUT",
    });
  },

  async deleteNotification(notificationId: string) {
    return fetchAPI(`/notifications/${notificationId}`, {
      method: "DELETE",
    });
  },

  async clearAllNotifications() {
    return fetchAPI("/notifications/", {
      method: "DELETE",
    });
  },

  // Admin APIs
  async getAdminStats() {
    return fetchAPI("/admin/stats");
  },

  async createAdminUser(userData: any) {
    return fetchAPI("/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async getAdminUsers() {
    return fetchAPI("/admin/users");
  },

  async updateAdminUser(userId: string, userData: any) {
    return fetchAPI(`/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  async deleteAdminUser(userId: string) {
    return fetchAPI(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  },

  async createAdminDoctor(doctorData: any) {
    return fetchAPI("/admin/doctors", {
      method: "POST",
      body: JSON.stringify(doctorData),
    });
  },

  async getAdminDoctors() {
    return fetchAPI("/admin/doctors");
  },

  async updateAdminDoctor(doctorId: string, doctorData: any) {
    return fetchAPI(`/admin/doctors/${doctorId}`, {
      method: "PUT",
      body: JSON.stringify(doctorData),
    });
  },

  async deleteAdminDoctor(doctorId: string) {
    return fetchAPI(`/admin/doctors/${doctorId}`, {
      method: "DELETE",
    });
  },

  async createAdminHospital(hospitalData: any) {
    return fetchAPI("/admin/hospitals", {
      method: "POST",
      body: JSON.stringify(hospitalData),
    });
  },

  async getAdminHospitals() {
    return fetchAPI("/admin/hospitals");
  },

  async updateAdminHospital(hospitalId: string, hospitalData: any) {
    return fetchAPI(`/admin/hospitals/${hospitalId}`, {
      method: "PUT",
      body: JSON.stringify(hospitalData),
    });
  },

  async deleteAdminHospital(hospitalId: string) {
    return fetchAPI(`/admin/hospitals/${hospitalId}`, {
      method: "DELETE",
    });
  },

  async getVerifications(status?: string) {
    const query = status ? `?status=${status}` : "";
    return fetchAPI(`/admin/verifications${query}`);
  },

  async approveVerification(verificationId: string) {
    return fetchAPI(`/admin/verifications/${verificationId}/approve`, {
      method: "POST",
    });
  },

  async rejectVerification(verificationId: string, reason: string) {
    return fetchAPI(`/admin/verifications/${verificationId}/reject?notes=${encodeURIComponent(reason)}`, {
      method: "POST",
    });
  },

  // Chat APIs
  async getChatConversations() {
    return fetchAPI("/chat/conversations");
  },

  async getChatHistory(appointmentId: string) {
    return fetchAPI(`/chat/messages/${appointmentId}`);
  },

  async sendChatMessage(appointmentId: string, message: string) {
    return fetchAPI(`/chat/messages/${appointmentId}`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  async uploadChatFile(appointmentId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    
    const headers: any = {};
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/chat/upload/${appointmentId}`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error("File upload error:", error);
      throw error;
    }
  },

  async sendWhatsAppMessage(appointmentId: string, message: string) {
    return fetchAPI(`/chat/whatsapp/send/${appointmentId}`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  async markChatMessageRead(messageId: string) {
    return fetchAPI(`/chat/messages/${messageId}/read`, {
      method: "PUT",
    });
  },

  async downloadChatFile(appointmentId: string, fileName: string) {
    return `${API_BASE_URL}/chat/download/${appointmentId}/${fileName}`;
  },
};