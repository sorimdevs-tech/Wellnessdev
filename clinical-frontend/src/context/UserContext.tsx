import React, { createContext, useState, useContext, useEffect } from "react";

interface User {
  id?: string;
  name: string;
  email?: string;
  mobile?: string;
  phone?: string;
  userType: "user" | "doctor" | "clinical_admin";
  currentRole: "user" | "doctor" | "clinical_admin";
  regNumber?: string;
  registration_number?: string;  // Medical registration number for doctors
  avatar?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  bloodType?: string;
  emergencyContact?: string;
}

interface Session {
  loginTime: string;
  lastActivityTime: string;
  sessionDuration: number; // in minutes
  isActive: boolean;
  deviceInfo: string;
}

interface UserContextType {
  user: User | null;
  session: Session | null;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  switchRole: (role: "user" | "doctor" | "clinical_admin") => Promise<void>;
  logout: () => void;
  createSession: (user: User) => void;
  updateActivity: () => void;
  getSessionDuration: () => number;
  getSessionTimeRemaining: () => number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);


  // Load user and session from localStorage on mount, and check for inactivity timeout
  useEffect(() => {
    const userType = localStorage.getItem("userType") as "user" | "doctor" | "clinical_admin" | null;
    const userName = localStorage.getItem("userName");
    const userEmail = localStorage.getItem("userEmail");
    const userMobile = localStorage.getItem("userMobile");
    const sessionData = localStorage.getItem("sessionData");

    let validSession = true;

    if (userType && userName) {
      // For doctors, always set currentRole to "doctor" - no mode switching
      // Doctors act as patients automatically when booking appointments
      const effectiveRole = userType === "doctor" ? "doctor" : 
                           ((localStorage.getItem("currentRole") as "user" | "doctor" | "clinical_admin") || userType);
      
      const userData: User = {
        id: localStorage.getItem("userId") || undefined,
        name: userName,
        email: userEmail || undefined,
        mobile: userMobile || undefined,
        userType: userType,
        currentRole: effectiveRole,
        regNumber: localStorage.getItem("regNumber") || undefined,
        avatar: localStorage.getItem("userAvatar") || undefined,
      };
      setUser(userData);

      if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        // Check inactivity: if lastActivityTime is more than 30 min ago, logout
        const lastActivity = new Date(parsedSession.lastActivityTime);
        const now = new Date();
        const diffMs = now.getTime() - lastActivity.getTime();
        if (diffMs > 30 * 60 * 1000) {
          // Inactive for more than 30 min
          validSession = false;
          setUser(null);
          setSession(null);
          localStorage.clear();
        } else {
          setSession(parsedSession);
        }
      }
    }
    setIsInitialized(true);
  }, []);

  // Update lastActivityTime on user activity
  useEffect(() => {
    const updateLastActivity = () => {
      if (session) {
        const updatedSession = {
          ...session,
          lastActivityTime: new Date().toISOString(),
        };
        setSession(updatedSession);
        localStorage.setItem("sessionData", JSON.stringify(updatedSession));
      }
    };
    // Listen for user activity
    window.addEventListener("mousemove", updateLastActivity);
    window.addEventListener("keydown", updateLastActivity);
    window.addEventListener("click", updateLastActivity);
    return () => {
      window.removeEventListener("mousemove", updateLastActivity);
      window.removeEventListener("keydown", updateLastActivity);
      window.removeEventListener("click", updateLastActivity);
    };
  }, [session]);


  const createSession = (userData: User) => {
    const now = new Date();
    const newSession: Session = {
      loginTime: now.toISOString(),
      lastActivityTime: now.toISOString(),
      sessionDuration: 1440, // 24 hours - persists until logout or inactivity
      isActive: true,
      deviceInfo: `${navigator.platform} - ${navigator.userAgent.substring(0, 50)}`,
    };
    setSession(newSession);
    localStorage.setItem("sessionData", JSON.stringify(newSession));
    
    // Dispatch custom event to notify ThemeContext to sync theme from backend
    window.dispatchEvent(new CustomEvent("user-logged-in"));
  };

  const updateActivity = () => {
    // Session persists until explicit logout - no activity tracking needed
    // This method is kept for compatibility but does nothing
  };

  const getSessionDuration = (): number => {
    if (!session) return 0;
    const loginTime = new Date(session.loginTime);
    const now = new Date();
    const diffInMs = now.getTime() - loginTime.getTime();
    return Math.floor(diffInMs / (1000 * 60)); // in minutes
  };

  const getSessionTimeRemaining = (): number => {
    if (!session) return 0;
    const sessionDurationMs = session.sessionDuration * 60 * 1000; // Convert to milliseconds
    const loginTime = new Date(session.loginTime);
    const now = new Date();
    const elapsedMs = now.getTime() - loginTime.getTime();
    const remainingMs = sessionDurationMs - elapsedMs;
    return Math.floor(remainingMs / (1000 * 60)); // in minutes
  };

  const switchRole = async (role: "user" | "doctor" | "clinical_admin") => {
    if (user) {
      // Doctors cannot switch to "user" mode - they're always doctors
      // When they book appointments, they automatically act as patients
      if (user.userType === "doctor" && role === "user") {
        console.log("Doctors cannot switch to user mode - booking as patient is automatic");
        return;
      }
      
      try {
        // Call backend to update role in database
        const token = localStorage.getItem("authToken");
        if (token) {
          await fetch("http://localhost:8000/auth/switch-role", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ new_role: role })
          });
        }
        
        // Update local state
        const updatedUser = { ...user, currentRole: role };
        setUser(updatedUser);
        localStorage.setItem("currentRole", role);
      } catch (error) {
        console.error("Failed to switch role:", error);
        // Still update locally even if backend fails
        const updatedUser = { ...user, currentRole: role };
        setUser(updatedUser);
        localStorage.setItem("currentRole", role);
      }
    }
  };

  const logout = () => {
    setUser(null);
    setSession(null);
    localStorage.removeItem("userType");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userMobile");
    localStorage.removeItem("currentRole");
    localStorage.removeItem("regNumber");
    localStorage.removeItem("userAvatar");
    localStorage.removeItem("sessionData");
    localStorage.removeItem("authToken"); // Also clear auth token
  };

  return (
    <UserContext.Provider
      value={{
        user,
        session,
        isInitialized,
        setUser,
        switchRole,
        logout,
        createSession,
        updateActivity,
        getSessionDuration,
        getSessionTimeRemaining,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
