import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-gray-900 text-white w-full">
      {/* MAIN CONTENT */}
      <div className="px-4 py-12 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* COMPANY INFO & DOWNLOAD */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate("/dashboard")}>
                <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=48&h=48&fit=crop" alt="Wellness Logo" className="w-12 h-12 rounded-lg shadow-lg" />
                <h1 className="text-2xl font-bold">Wellness Dev</h1>
              </div>
              <p className="text-gray-400 mb-6">Your trusted healthcare platform. Access quality healthcare anytime, anywhere.</p>

              {/* DOWNLOAD BUTTONS */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg mb-4">Download Our App</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button className="flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg flex-1 sm:flex-none">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.05 13.5c-.91 0-1.64.75-1.64 1.74s.73 1.74 1.64 1.74c.9 0 1.64-.75 1.64-1.74s-.74-1.74-1.64-1.74m-11.08 0c-.91 0-1.64.75-1.64 1.74s.73 1.74 1.64 1.74c.9 0 1.64-.75 1.64-1.74s-.74-1.74-1.64-1.74M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1" />
                    </svg>
                    <div className="text-left">
                      <div className="text-xs leading-none">App Store</div>
                    </div>
                  </button>

                  <button className="flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg flex-1 sm:flex-none">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 20.5V3.5C3 2.592 3.864 1.75 4.75 1.75h14.5c.886 0 1.75.864 1.75 1.75v17c0 .886-.864 1.75-1.75 1.75H4.75c-.886 0-1.75-.864-1.75-1.75zm10.5-14v8.5H6v-8.5h7.5z" />
                    </svg>
                    <div className="text-left">
                      <div className="text-xs leading-none">Google Play</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* RATINGS */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-white font-bold">4.9/5 Rating</p>
                    <p className="text-gray-400 text-sm">50K+ Reviews</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h3 className="font-bold text-lg mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li><button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white transition">Home</button></li>
              <li><button onClick={() => navigate("/appointments")} className="text-gray-400 hover:text-white transition">Appointments</button></li>
              <li><button onClick={() => navigate("/profile")} className="text-gray-400 hover:text-white transition">My Profile</button></li>
              <li><button onClick={() => navigate("/settings")} className="text-gray-400 hover:text-white transition">Settings</button></li>
              <li><button onClick={() => navigate("/medical-records")} className="text-gray-400 hover:text-white transition">Medical Records</button></li>
            </ul>
          </div>

          {/* SUPPORT */}
          <div>
            <h3 className="font-bold text-lg mb-6">Support</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-white transition">Contact Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Terms & Conditions</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">FAQ</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Blog</a></li>
            </ul>
          </div>
        </div>

        {/* FEATURES SECTION */}
        <div className="border-t border-gray-700 pt-12 mb-12">
          <h3 className="font-bold text-lg mb-8">Why Choose Wellness Dev?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-bold mb-2">Easy Booking</h4>
              <p className="text-gray-400 text-sm">Book appointments in seconds</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-bold mb-2">Verified Doctors</h4>
              <p className="text-gray-400 text-sm">100% verified medical professionals</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-bold mb-2">24/7 Support</h4>
              <p className="text-gray-400 text-sm">Round-the-clock customer support</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-bold mb-2">Secure Data</h4>
              <p className="text-gray-400 text-sm">Your health data is encrypted</p>
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-gray-400 text-sm text-center">© 2025 Wellness Dev by Sorim AI. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer >
  );
}
