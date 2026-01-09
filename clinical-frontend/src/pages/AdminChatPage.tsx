import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { apiClient } from "../services/api";
import ChatBox from "../components/ChatBox";

interface AdminConversation {
  appointment_id: string;
  patient_name: string;
  doctor_name: string;
  hospital: string;
  status: string;
  unread_count: number;
  last_message: string;
  timestamp: string;
  user_type: "patient" | "doctor";
}

export default function AdminChatPage() {
  const { user } = useUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "patient" | "doctor">("all");

  // Load all conversations (admin view)
  useEffect(() => {
    loadAdminConversations();
  }, [user]);

  async function loadAdminConversations() {
    try {
      setLoading(true);
      // Admin can see all conversations
      const data = await apiClient.getChatConversations();
      if (Array.isArray(data)) {
        // Convert to admin view with more info
        const adminConversations = data.map(conv => ({
          appointment_id: conv.appointment_id,
          patient_name: conv.partner_name, // Will need to differentiate
          doctor_name: "Doctor", // Will fetch from appointment
          hospital: "Hospital",
          status: "active",
          unread_count: conv.unread_count,
          last_message: conv.last_message,
          timestamp: conv.timestamp,
          user_type: "patient" as const
        }));
        setConversations(adminConversations);
        if (adminConversations.length > 0 && !selectedChat) {
          setSelectedChat(adminConversations[0].appointment_id);
        }
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.hospital.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || conv.user_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  if (!user || user.userType !== "clinical_admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">Only clinical admins can access this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
      {/* Left Sidebar - Conversations List */}
      <div className={`w-96 border-r flex flex-col ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
        {/* Header */}
        <div className={`p-4 border-b ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gradient-to-r from-blue-600 to-emerald-500"}`}>
          <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-white"}`}>
            Support Chat
          </h1>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-blue-100"}`}>
            Monitor all conversations
          </p>
        </div>

        {/* Search & Filter */}
        <div className={`p-4 border-b space-y-3 ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-gray-50"}`}>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 ${
              isDark
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "border-gray-300"
            }`}
          />
          
          <div className="flex gap-2">
            {[
              { id: "all" as const, label: "All" },
              { id: "patient" as const, label: "Patients" },
              { id: "doctor" as const, label: "Doctors" },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setFilterType(filter.id)}
                className={`flex-1 px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                  filterType === filter.id
                    ? "bg-blue-600 text-white"
                    : isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className={isDark ? "text-gray-400" : "text-gray-500"}>Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className={`text-lg font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {searchTerm ? "No conversations found" : "No conversations yet"}
                </p>
              </div>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.appointment_id}
                onClick={() => setSelectedChat(conv.appointment_id)}
                className={`w-full text-left p-4 border-b transition-colors ${
                  selectedChat === conv.appointment_id
                    ? isDark
                      ? "bg-blue-900/40 border-blue-700"
                      : "bg-blue-50 border-blue-200"
                    : isDark
                    ? "border-gray-700 hover:bg-gray-800"
                    : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                      {conv.patient_name}
                    </h3>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      with {conv.doctor_name}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full font-bold">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                
                <p className={`text-sm truncate ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {conv.last_message}
                </p>
                
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    conv.user_type === "patient"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {conv.user_type === "patient" ? "👤 Patient" : "👨‍⚕️ Doctor"}
                  </span>
                  <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    {new Date(conv.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className={`flex-1 flex flex-col ${isDark ? "bg-gray-900" : "bg-white"}`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"
            }`}>
              <div>
                <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Conversation Details
                </h2>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Appointment ID: {selectedChat}
                </p>
              </div>
              <button
                onClick={() => window.open(`/chat/${selectedChat}`, "_blank")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
              >
                📤 Open Full Chat
              </button>
            </div>

            {/* Chat Component */}
            <div className="flex-1 overflow-hidden">
              <ChatBox
                appointmentId={selectedChat}
                userId={user.id || ""}
                userRole="admin"
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Select a Conversation
              </h2>
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                Choose a conversation from the list to view messages
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
