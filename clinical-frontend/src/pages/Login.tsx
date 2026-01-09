import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  const navigate = useNavigate();
  const { setUser, createSession } = useUser();

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

  const sendOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiClient.sendOtp(email);
      setStep("otp");
      setOtpTimer(600);
    } catch (err: any) {
      if (err.message?.includes("404")) {
        setError("Email not registered. Please create an account first.");
      } else {
        setError(err.message || "Failed to send OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
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
      verifyOtp();
    }
  }, [otp]);

  const verifyOtp = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter complete OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiClient.verifyOtp({ email, otp: otpString, userType: "user" }) as any;

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

        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-500 to-cyan-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
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
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Your Health,<br />Our Priority
          </h1>
          <p className="text-white/80 text-xl max-w-md">
            Access your healthcare dashboard, book appointments, and manage your medical records securely.
          </p>
        </div>

        <div className="relative z-10 flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i === 2 ? 'bg-white' : 'bg-white/40'}`}></div>
          ))}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-slate-800 text-2xl font-bold">Wellness</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800">
              {step === "email" ? "Welcome back" : "Enter verification code"}
            </h2>
            <p className="text-slate-500 mt-2 text-lg">
              {step === "email" 
                ? "Sign in to access your account" 
                : `We sent a code to ${email}`}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {step === "email" ? (
            /* Email Step */
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  placeholder="name@example.com"
                  className="w-full px-4 py-4 rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            /* OTP Step */
            <div className="space-y-6">
              {/* OTP Inputs */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Verification code
                </label>
                <div className="flex gap-3" onPaste={handlePaste}>
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
                      className="w-full h-16 text-center text-2xl font-bold rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition text-slate-800"
                    />
                  ))}
                </div>
              </div>

              {/* Timer & Resend */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-sm">
                  {otpTimer > 0 ? (
                    <>Expires in <span className="font-semibold text-slate-700">{formatTime(otpTimer)}</span></>
                  ) : (
                    <span className="text-red-500 font-medium">Code expired</span>
                  )}
                </span>
                <button
                  onClick={() => { setOtp(["", "", "", "", "", ""]); sendOtp(); }}
                  disabled={otpTimer > 540}
                  className="text-teal-600 hover:text-teal-700 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Resend code
                </button>
              </div>

              <button
                onClick={verifyOtp}
                disabled={loading || otpTimer === 0}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  "Verify & Sign in"
                )}
              </button>

              <button
                onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                className="w-full py-3 text-slate-500 hover:text-slate-700 font-medium transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Change email
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-slate-500">
              Don't have an account?{" "}
              <span
                onClick={() => navigate("/register")}
                className="text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
              >
                Create account
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
