import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/api";
import {
  HiBell,
  HiLockClosed,
  HiColorSwatch,
  HiUserCircle,
  HiTrash,
  HiCheck,
  HiX,
  HiGlobe,
  HiMoon,
  HiSun,
  HiChevronRight,
} from "react-icons/hi";

interface SettingsData {
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    appointmentReminders: boolean;
    healthTips: boolean;
    promosAndOffers: boolean;
  };
  privacy: {
    profileVisibility: string;
    shareHealthData: boolean;
    allowResearch: boolean;
  };
  preferences: {
    language: string;
    theme: string;
    dateFormat: string;
    distanceUnit: string;
  };
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useUser();
  const [settingsData, setSettingsData] = useState<SettingsData>({
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      appointmentReminders: true,
      healthTips: false,
      promosAndOffers: false,
    },
    privacy: {
      profileVisibility: "private",
      shareHealthData: false,
      allowResearch: false,
    },
    preferences: {
      language: "English",
      theme: theme || "light",
      dateFormat: "DD/MM/YYYY",
      distanceUnit: "km",
    },
  });

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [activeTab, setActiveTab] = useState("notifications");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Keep theme in sync
  useEffect(() => {
    setSettingsData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        theme: theme || "light",
      },
    }));
  }, [theme]);

  const handleToggle = (category: keyof SettingsData, key: string) => {
    const categoryData = settingsData[category];
    setSettingsData({
      ...settingsData,
      [category]: {
        ...categoryData,
        [key]: !(categoryData as Record<string, unknown>)[key],
      },
    });
  };

  const handleSelectChange = (category: keyof SettingsData, key: string, value: string) => {
    if (key === "theme") {
      setTheme(value as "light" | "dark" | "system");
      if (value === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    setSettingsData({
      ...settingsData,
      [category]: {
        ...settingsData[category],
        [key]: value,
      },
    });
  };

  const handleSaveSettings = () => {
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await apiClient.deleteAccount();
      logout();
    } catch (error) {
      console.error("Error deleting account:", error);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const tabs = [
    { id: "notifications", label: "Notifications", icon: HiBell },
    { id: "privacy", label: "Privacy", icon: HiLockClosed },
    { id: "preferences", label: "Preferences", icon: HiColorSwatch },
    { id: "account", label: "Account", icon: HiUserCircle },
  ];

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-gradient-to-r from-blue-600 to-emerald-500" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6 transition-colors duration-300">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your account settings and preferences
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-lg hover:from-blue-700 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg"
        >
          <HiCheck className="w-5 h-5" />
          Save Changes
        </button>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <HiCheck className="w-5 h-5" />
          Settings saved successfully!
        </div>
      )}

      {/* Settings Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Email Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates via email</p>
                </div>
                <ToggleSwitch
                  enabled={settingsData.notifications.emailNotifications}
                  onToggle={() => handleToggle("notifications", "emailNotifications")}
                />
              </div>
              <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Push Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive push notifications on your device</p>
                </div>
                <ToggleSwitch
                  enabled={settingsData.notifications.pushNotifications}
                  onToggle={() => handleToggle("notifications", "pushNotifications")}
                />
              </div>
              <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Appointment Reminders</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get reminded before your appointments</p>
                </div>
                <ToggleSwitch
                  enabled={settingsData.notifications.appointmentReminders}
                  onToggle={() => handleToggle("notifications", "appointmentReminders")}
                />
              </div>
              <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Health Tips</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive personalized health tips and advice</p>
                </div>
                <ToggleSwitch
                  enabled={settingsData.notifications.healthTips}
                  onToggle={() => handleToggle("notifications", "healthTips")}
                />
              </div>
              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Promotions & Offers</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive promotional offers and discounts</p>
                </div>
                <ToggleSwitch
                  enabled={settingsData.notifications.promosAndOffers}
                  onToggle={() => handleToggle("notifications", "promosAndOffers")}
                />
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div className="py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Profile Visibility</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Control who can see your profile</p>
                  </div>
                </div>
                <select
                  value={settingsData.privacy.profileVisibility}
                  onChange={(e) => handleSelectChange("privacy", "profileVisibility", e.target.value)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="public">Public - Visible to everyone</option>
                  <option value="private">Private - Only visible to doctors</option>
                  <option value="hidden">Hidden - Completely private</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Share Health Data</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Allow doctors to access your health records</p>
                </div>
                <ToggleSwitch
                  enabled={settingsData.privacy.shareHealthData}
                  onToggle={() => handleToggle("privacy", "shareHealthData")}
                />
              </div>
              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Research Participation</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Allow anonymous data usage for medical research</p>
                </div>
                <ToggleSwitch
                  enabled={settingsData.privacy.allowResearch}
                  onToggle={() => handleToggle("privacy", "allowResearch")}
                />
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div className="py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <HiGlobe className="w-5 h-5 text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Language</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Select your preferred language</p>
                    </div>
                  </div>
                </div>
                <select
                  value={settingsData.preferences.language}
                  onChange={(e) => handleSelectChange("preferences", "language", e.target.value)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="English">English</option>
                  <option value="Hindi">हिंदी (Hindi)</option>
                  <option value="Tamil">தமிழ் (Tamil)</option>
                  <option value="Telugu">తెలుగు (Telugu)</option>
                </select>
              </div>

              {/* Enhanced Theme Toggle with Sun/Moon Animation */}
              <div className="py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors duration-300 ${theme === "dark" ? "bg-indigo-900/30" : "bg-yellow-100"}`}>
                      {theme === "dark" ? (
                        <HiMoon className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <HiSun className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Appearance</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Customize how the app looks</p>
                    </div>
                  </div>
                </div>

                {/* Sun/Moon Toggle Switch */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative bg-gray-200 dark:bg-gray-700 rounded-full p-1 flex items-center w-64 h-14 shadow-inner">
                    {/* Sliding Background */}
                    <div 
                      className={`absolute w-1/2 h-12 rounded-full transition-all duration-500 ease-in-out shadow-lg ${
                        theme === "dark" 
                          ? "translate-x-[calc(100%-4px)] bg-gradient-to-r from-indigo-600 to-purple-600" 
                          : "translate-x-0 bg-gradient-to-r from-yellow-400 to-orange-400"
                      }`}
                    />
                    
                    {/* Light Mode Button */}
                    <button
                      onClick={() => handleSelectChange("preferences", "theme", "light")}
                      className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-all duration-300 ${
                        theme !== "dark" ? "text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      <HiSun className={`w-5 h-5 transition-transform duration-500 ${theme !== "dark" ? "rotate-0 scale-110" : "rotate-180 scale-100"}`} />
                      <span className="font-medium text-sm">Light</span>
                    </button>

                    {/* Dark Mode Button */}
                    <button
                      onClick={() => handleSelectChange("preferences", "theme", "dark")}
                      className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-all duration-300 ${
                        theme === "dark" ? "text-white" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <HiMoon className={`w-5 h-5 transition-transform duration-500 ${theme === "dark" ? "rotate-0 scale-110" : "-rotate-90 scale-100"}`} />
                      <span className="font-medium text-sm">Dark</span>
                    </button>
                  </div>
                </div>

                {/* Theme Options Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Light Theme Card */}
                  <button
                    onClick={() => handleSelectChange("preferences", "theme", "light")}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      theme === "light"
                        ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg shadow-yellow-500/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        theme === "light" 
                          ? "bg-gradient-to-br from-yellow-400 to-orange-400 shadow-lg shadow-yellow-400/50" 
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}>
                        <HiSun className={`w-6 h-6 transition-colors ${theme === "light" ? "text-white" : "text-gray-400"}`} />
                      </div>
                      <span className={`text-sm font-medium ${theme === "light" ? "text-yellow-600 dark:text-yellow-400" : "text-gray-600 dark:text-gray-400"}`}>
                        Light
                      </span>
                      {theme === "light" && (
                        <span className="text-xs text-yellow-500 dark:text-yellow-400 font-semibold">Active</span>
                      )}
                    </div>
                  </button>

                  {/* Dark Theme Card */}
                  <button
                    onClick={() => handleSelectChange("preferences", "theme", "dark")}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      theme === "dark"
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg shadow-indigo-500/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        theme === "dark" 
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/50" 
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}>
                        <HiMoon className={`w-6 h-6 transition-colors ${theme === "dark" ? "text-white" : "text-gray-400"}`} />
                      </div>
                      <span className={`text-sm font-medium ${theme === "dark" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400"}`}>
                        Dark
                      </span>
                      {theme === "dark" && (
                        <span className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold">Active</span>
                      )}
                    </div>
                  </button>

                  {/* System Theme Card */}
                  <button
                    onClick={() => handleSelectChange("preferences", "theme", "system")}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      theme === "system" || theme === "auto"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg shadow-blue-500/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        theme === "system" || theme === "auto"
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50" 
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}>
                        <HiColorSwatch className={`w-6 h-6 transition-colors ${theme === "system" || theme === "auto" ? "text-white" : "text-gray-400"}`} />
                      </div>
                      <span className={`text-sm font-medium ${theme === "system" || theme === "auto" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}>
                        System
                      </span>
                      {(theme === "system" || theme === "auto") && (
                        <span className="text-xs text-blue-500 dark:text-blue-400 font-semibold">Active</span>
                      )}
                    </div>
                  </button>
                </div>

                {/* Theme Description */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {theme === "light" && "☀️ Light mode is active. Great for daytime use and bright environments."}
                    {theme === "dark" && "🌙 Dark mode is active. Easier on the eyes in low-light conditions."}
                    {(theme === "system" || theme === "auto") && "🖥️ System preference is active. The app will follow your device's theme settings."}
                  </p>
                </div>
              </div>

              <div className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Date Format</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Choose how dates are displayed</p>
                  </div>
                </div>
                <select
                  value={settingsData.preferences.dateFormat}
                  onChange={(e) => handleSelectChange("preferences", "dateFormat", e.target.value)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === "account" && (
            <div className="space-y-6">
              {/* Account Info */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{user?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{user?.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Account Type</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{user?.userType || "User"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Role</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{user?.currentRole || user?.userType || "User"}</p>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <HiTrash className="w-5 h-5" />
                  Danger Zone
                </h3>
                <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiTrash className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Account</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2"
              >
                <HiX className="w-5 h-5" />
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <HiTrash className="w-5 h-5" />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
