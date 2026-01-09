import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function SessionManager() {
  const navigate = useNavigate();
  const { user, session, logout, getSessionTimeRemaining } = useUser();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);

  useEffect(() => {
    if (!session || !user) return;

    const interval = setInterval(() => {
      const remaining = getSessionTimeRemaining();
      setTimeRemaining(remaining);

      // Show warning when 5 minutes or less remaining (optional UX)
      if (remaining <= 5 && remaining > 0) {
        setShowWarning(true);
      }

      // Do NOT auto-logout – user should logout manually only
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [session, user]);

  const handleAutoLogout = () => {
    logout();
    navigate("/");
  };

  const handleExtendSession = () => {
    // Extend session by 8 more hours
    if (session) {
      const updatedSession = {
        ...session,
        sessionDuration: 480 + session.sessionDuration, // Add 8 more hours
      };
      localStorage.setItem("sessionData", JSON.stringify(updatedSession));
      setShowExtendModal(false);
      setShowWarning(false);
      setTimeRemaining(480 * 60);
    }
  };

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = 0;

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    } else if (mins > 0) {
      return `${mins}m`;
    }
    return "< 1m";
  };

  if (!user || !session) return null;

  return (
    <>
      {/* SESSION WARNING MODAL */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in">
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-4">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Session Expiring</h2>
            <p className="text-gray-600 text-center mb-6">
              Your session will expire in <span className="font-bold text-red-600">{formatTime(timeRemaining)}</span>
            </p>

            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Tip:</span> Your session automatically logs you out for security. Extend your session to continue.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAutoLogout}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition"
              >
                Logout
              </button>
              <button
                onClick={handleExtendSession}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
              >
                Extend Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SESSION INFO BADGE (Optional - shown in header area) */}
      {timeRemaining > 0 && timeRemaining <= 5 && (
        <div className="fixed top-24 right-4 bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-40">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.5a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V7z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Expires in {formatTime(timeRemaining)}</span>
        </div>
      )}
    </>
  );
}
