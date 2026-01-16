import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "../services/api";

const API_BASE_URL = "https://wellnessdev.onrender.com";

interface ChatMessage {
  _id?: string;
  sender_id: string;
  sender_role: string;
  message: string;
  message_type: "text" | "image" | "document" | "whatsapp";
  file_url?: string;
  whatsapp_sid?: string;
  read_by?: string[];
  timestamp: string;
  deleted?: boolean;
}

interface ChatBoxProps {
  appointmentId: string;
  userId: string;
  userRole: string;
  userName?: string;
  partnerName?: string;
  appointmentDetails?: any;  // Doctor/patient info for access validation
}

const WS_URL =
  window.location.protocol === "https:"
    ? `wss://${window.location.hostname}:8000/chat/ws/`
    : `ws://${window.location.hostname}:8000/chat/ws/`;

export default function ChatBox({ appointmentId, userId, userRole, userName = "You", partnerName = "Doctor", appointmentDetails }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [useWhatsApp, setUseWhatsApp] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Check if user has access to this appointment
  useEffect(() => {
    if (appointmentDetails) {
      const patientId = String(appointmentDetails.patient_id || "").trim();
      const doctorId = String(appointmentDetails.doctor_id || "").trim();
      const currentUserId = String(userId || "").trim();
      
      const isPatient = currentUserId === patientId;
      const isDoctor = userRole === "doctor" && currentUserId === doctorId;
      
      console.log("🔐 ChatBox Access Check:", {
        userId: currentUserId,
        userRole,
        patientId,
        doctorId,
        isPatient,
        isDoctor,
        granted: isPatient || isDoctor,
      });
      
      if (!isPatient && !isDoctor) {
        console.warn("❌ ACCESS DENIED - Reason:", {
          userIsPatient: isPatient,
          userIsDoctor: isDoctor,
          userIdMatches: currentUserId === patientId,
          doctorIdMatches: currentUserId === doctorId,
          userRoleIsDoctor: userRole === "doctor",
        });
        setAccessDenied(true);
      } else {
        console.log("✅ ACCESS GRANTED");
        setAccessDenied(false);
      }
    } else {
      console.log("⏳ Waiting for appointmentDetails to load...");
      setAccessDenied(false);
    }
  }, [appointmentDetails, userId, userRole]);

  // Fetch chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, [appointmentId]);

  // WebSocket connection for live messages
  useEffect(() => {
    connectWebSocket();
    return () => {
      ws.current?.close();
    };
  }, [appointmentId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadChatHistory() {
    try {
      const history = await apiClient.getChatHistory(appointmentId);
      setMessages(
        Array.isArray(history)
          ? history.filter((msg: any) => !msg.deleted)
          : []
      );
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  }

  // Poll for new messages every 3 seconds as fallback
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const history = await apiClient.getChatHistory(appointmentId);
        const newMessages = Array.isArray(history) ? history.filter((msg: any) => !msg.deleted) : [];
        setMessages(prev => {
          // Only update if we have new messages
          if (newMessages.length > prev.length) {
            return newMessages;
          }
          return prev;
        });
      } catch (error) {
        console.error("Poll messages error:", error);
      }
    }, 3000);
    
    return () => clearInterval(pollInterval);
  }, [appointmentId]);

  function connectWebSocket() {
    try {
      const token = localStorage.getItem('authToken');
      ws.current = new WebSocket(`${WS_URL}${appointmentId}?token=${token}`);

      ws.current.onopen = () => {
        console.log("WebSocket connected");
      };

      ws.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log('[ChatBox] WebSocket received:', msg);
          // Only add if message doesn't already exist
          setMessages(prev => {
            const exists = prev.some(m => (m._id === msg._id) || (m._id === msg.id));
            if (exists) return prev;
            return [...prev, msg];
          });
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.current.onclose = () => {
        console.log("WebSocket disconnected");
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
    }
  }

  async function sendMessage() {
    if (!input.trim() && !uploading) return;

    setSending(true);
    try {
      if (useWhatsApp) {
        await apiClient.sendWhatsAppMessage(appointmentId, input);
      } else {
        if (ws.current?.readyState === 1) {
          ws.current.send(
            JSON.stringify({
              sender_id: userId,
              sender_role: userRole,
              message: input,
              message_type: "text",
            })
          );
        } else {
          // Fallback to HTTP if WebSocket not available
          await apiClient.sendChatMessage(appointmentId, input);
        }
      }
      setInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);

    try {
      const response = await apiClient.uploadChatFile(appointmentId, file);
      
      // Send message with file
      if (ws.current?.readyState === 1) {
        ws.current.send(
          JSON.stringify({
            sender_id: userId,
            sender_role: userRole,
            message: file.name,
            message_type: file.type.startsWith("image/") ? "image" : "document",
            file_url: response.file_url,
          })
        );
      }
    } catch (error) {
      console.error("File upload failed:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function markMessageRead(messageId: string) {
    try {
      await apiClient.markChatMessageRead(messageId);
    } catch (error) {
      // Silently fail - read status is optional
      // console.error("Failed to mark message as read:", error);
    }
  }

  return (
    <div className="flex flex-col h-screen w-full max-w-4xl mx-auto bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4 bg-gradient-to-r from-blue-600 to-blue-500">
        <div>
          <h2 className="text-xl font-bold text-white">Chat</h2>
          <p className="text-sm text-blue-100">Appointment {appointmentId}</p>
        </div>
        <button
          onClick={() => setUseWhatsApp(!useWhatsApp)}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            useWhatsApp
              ? "bg-green-500 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          {useWhatsApp ? "💬 WhatsApp" : "💬 Chat"}
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={msg._id || idx}
              className={`flex flex-col ${msg.sender_id === userId ? "items-end" : "items-start"}`}
              onMouseEnter={() => msg._id && markMessageRead(msg._id)}
            >
              {/* Sender Name */}
              <span className={`text-xs font-bold mb-1 ${
                msg.sender_id === userId
                  ? "text-blue-600"
                  : "text-gray-600"
              }`}>
                {msg.sender_id === userId ? userName : partnerName}
              </span>

              {/* Message content */}
              <div
                className={`px-4 py-3 rounded-lg max-w-sm shadow-sm ${
                  msg.sender_id === userId
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {msg.message_type === "image" && msg.file_url ? (
                  <img
                    src={msg.file_url.startsWith('http') ? msg.file_url : `${API_BASE_URL}${msg.file_url}`}
                    alt="Chat attachment"
                    className="max-w-xs rounded-lg"
                  />
                ) : msg.message_type === "document" && msg.file_url ? (
                  <a
                    href={msg.file_url.startsWith('http') ? msg.file_url : `${API_BASE_URL}${msg.file_url}`}
                    download
                    className={`flex items-center gap-2 underline ${
                      msg.sender_id === userId
                        ? "text-blue-100"
                        : "text-blue-600"
                    }`}
                  >
                    📎 {msg.message}
                  </a>
                ) : (
                  <p className="break-words">{msg.message}</p>
                )}
              </div>

              {/* Metadata with Read Status */}
              <div className={`text-xs mt-1 flex items-center gap-2 ${
                msg.sender_id === userId
                  ? "text-blue-300"
                  : "text-gray-500"
              }`}>
                <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                {msg.message_type === "whatsapp" && <span>📱</span>}
                
                {/* Read Status Indicators - Only for sender's messages */}
                {msg.sender_id === userId && (
                  <span className="ml-1 flex items-center gap-0.5">
                    {msg.read_by && msg.read_by.length > 0 ? (
                      // Message has been read
                      <span className="font-bold text-blue-400">✓✓</span>
                    ) : (
                      // Message sent but not yet read
                      <span className="font-bold text-gray-400">✓</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-gray-50">
        {accessDenied ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-semibold">❌ Access Denied</p>
            <p className="text-sm">
              {appointmentDetails ? (
                <>
                  Your ID: <code className="text-xs bg-red-50 px-1">{userId}</code>
                  <br />
                  Appointment Doctor ID: <code className="text-xs bg-red-50 px-1">{appointmentDetails.doctor_id}</code>
                  <br />
                  <span className="text-xs mt-1 block">This appointment is assigned to a different doctor.</span>
                </>
              ) : (
                "You don't have permission to access this chat."
              )}
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xlsx,.xls"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Attach file"
            >
              {uploading ? "⏳ Uploading..." : "📎"}
            </button>

            <textarea
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message... (Shift+Enter for new line)"
              rows={3}
              disabled={sending}
            />

            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={sendMessage}
              disabled={(!input.trim() && !uploading) || sending}
            >
              {sending ? "⏳" : "Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
