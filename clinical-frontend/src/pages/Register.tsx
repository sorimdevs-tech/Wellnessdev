import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const { setUser, createSession } = useUser();

  // Form state
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [isDoctor, setIsDoctor] = useState(false);
  const [regNumber, setRegNumber] = useState("");
  
  // OTP state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(0);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Calculate age from DOB
  const calculateAge = (dateStr: string) => {
    if (!dateStr) return "";
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age > 0 ? `${age} years` : "";
  };

  // OTP Timer
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Validate form
  const validateForm = () => {
    if (!name.trim()) return "Please enter your full name";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email";
    if (!mobile.match(/^\d{10}$/)) return "Please enter a valid 10-digit mobile number";
    if (!dob) return "Please select your date of birth";
    if (!gender) return "Please select your gender";
    if (isDoctor && !regNumber.trim()) return "Please enter your medical registration number";
    return null;
  };

  // Send OTP
  const sendOtp = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiClient.sendRegistrationOtp(email.trim());
      setStep("otp");
      setOtpTimer(600);
    } catch (err: any) {
      if (err.message?.includes("400")) {
        setError("This email is already registered. Please login instead.");
      } else {
        setError(err.message || "Failed to send OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  // OTP handlers
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
  };

  // Auto-verify when all 6 digits are entered
  useEffect(() => {
    const otpString = otp.join("");
    if (otpString.length === 6 && step === "otp" && !loading && otpTimer > 0) {
      verifyAndRegister();
    }
  }, [otp]);

  // Verify OTP and Register
  const verifyAndRegister = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiClient.registerWithOtp({
        email,
        otp: otpString,
        name,
        mobile,
        userType: isDoctor ? "doctor" : "user",
        dob,
        gender,
        registration_number: isDoctor ? regNumber : undefined
      }) as any;

      if (response?.user) {
        const userId = response.user.id || response.user._id;
        const userData = {
          id: userId,
          name: response.user.name,
          email: response.user.email,
          mobile: response.user.mobile,
          userType: response.user.userType,
          currentRole: response.user.currentRole,
          token: response.access_token
        };

        setUser(userData);
        createSession(userData);

        localStorage.setItem("authToken", response.access_token);
        localStorage.setItem("userId", userId);
        localStorage.setItem("userName", response.user.name);
        localStorage.setItem("userEmail", response.user.email);
        localStorage.setItem("userType", response.user.userType);
        localStorage.setItem("currentRole", response.user.currentRole);
        if (isDoctor && regNumber) {
          localStorage.setItem("regNumber", regNumber);
        }

        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-500 to-cyan-600 p-8 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 border border-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-white rounded-full"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-white text-2xl font-bold">Wellness</span>
          </div>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Start Your<br />Health Journey
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Join thousands of patients and healthcare providers on our platform.
          </p>
        </div>

        <div className="relative z-10 flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i === 1 ? 'bg-white' : 'bg-white/40'}`}></div>
          ))}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-slate-800 text-2xl font-bold">Wellness</span>
          </div>

          {/* Header */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-800">
              {step === "form" ? "Create account" : "Verify email"}
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              {step === "form" 
                ? "Fill in your details to get started" 
                : `Enter the code sent to ${email}`}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {step === "form" ? (
            /* Registration Form */
            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition text-sm"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition text-sm"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile number</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition text-sm"
                />
              </div>

              {/* DOB & Age */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition text-sm"
                  />
                </div>
                {dob && (
                  <div className="w-20">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                    <div className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-center font-medium text-sm">
                      {calculateAge(dob)}
                    </div>
                  </div>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gender</label>
                <div className="flex gap-2">
                  {[
                    { value: "male", label: "Male", color: "blue" },
                    { value: "female", label: "Female", color: "pink" },
                    { value: "other", label: "Other", color: "purple" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGender(option.value)}
                      className={`flex-1 py-2 rounded-xl border-2 font-medium text-sm transition ${
                        gender === option.value
                          ? option.color === "blue" 
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : option.color === "pink"
                            ? "border-pink-500 bg-pink-50 text-pink-700"
                            : "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor Toggle */}
              <div
                onClick={() => setIsDoctor(!isDoctor)}
                className={`p-3 rounded-xl border-2 cursor-pointer transition ${
                  isDoctor ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                    isDoctor ? "border-teal-500 bg-teal-500" : "border-slate-300"
                  }`}>
                    {isDoctor && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">I'm a healthcare practitioner</p>
                    <p className="text-xs text-slate-500">Check if you're a doctor or medical professional</p>
                  </div>
                </div>
              </div>

              {/* Registration Number */}
              {isDoctor && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Medical registration number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="e.g., MCI123456"
                    className="w-full px-3 py-2.5 rounded-xl border border-teal-300 bg-teal-50/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition text-sm"
                  />
                </div>
              )}

              {/* Submit */}
              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending code...
                  </>
                ) : (
                  <>
                    Continue
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* OTP Verification */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Verification code</label>
                <div className="flex gap-2" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-full h-12 text-center text-xl font-bold rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">
                  {otpTimer > 0 ? (
                    <>Expires in <span className="font-semibold text-slate-700">{formatTime(otpTimer)}</span></>
                  ) : (
                    <span className="text-red-500 font-medium">Code expired</span>
                  )}
                </span>
                <button
                  onClick={() => { setOtp(["", "", "", "", "", ""]); sendOtp(); }}
                  disabled={otpTimer > 540}
                  className="text-teal-600 hover:text-teal-700 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Resend code
                </button>
              </div>

              <button
                onClick={verifyAndRegister}
                disabled={loading || otpTimer === 0}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>

              <button
                onClick={() => { setStep("form"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                className="w-full py-2 text-slate-500 hover:text-slate-700 font-medium flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to form
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className="text-slate-500 text-sm">
              Already have an account?{" "}
              <span
                onClick={() => navigate("/login")}
                className="text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
              >
                Sign in
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
