import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { fetchAPI } from '../services/api';

// Types
interface Message {
  id: string;
  conversation_id?: string;
  appointment_id?: string;
  sender_id: string;
  sender_name?: string;
  sender_role: string;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  file_url?: string;
  timestamp: string;
  read_by: string[];
  deleted?: boolean;
}

interface AppointmentSummary {
  id: string;
  status: string;
  date: string;
  time: string;
}

interface Conversation {
  conversation_id: string;
  partner_id: string;
  partner_name: string;
  partner_mobile?: string;
  partner_role: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  chat_enabled: boolean;
  appointments: AppointmentSummary[];
  active_appointment_id?: string;
  active_appointment_status?: string;
  total_appointments: number;
}

interface AppointmentDetails {
  id: string;
  doctor_id: string;
  doctor_name: string;
  patient_id: string;
  patient_name: string;
  hospital_name?: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason?: string;
}

const ChatPage: React.FC = () => {
  const { appointmentId: urlConversationId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(urlConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentConversationData, setCurrentConversationData] = useState<Conversation | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Common emojis for quick access
  const quickEmojis = ['😊', '👍', '❤️', '😂', '🙏', '👋', '🎉', '💪'];

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchAPI<Conversation[]>('/chat/conversations');
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const data = await fetchAPI<Message[]>(`/chat/messages/${conversationId}`);
      setMessages(data);
      setTimeout(scrollToBottom, 100);
      
      // Mark messages as read
      await fetchAPI(`/chat/messages/${conversationId}/read`, { method: 'PUT' });
      
      // Update unread count in conversations
      setConversations(prev => 
        prev.map(conv => 
          conv.conversation_id === conversationId 
            ? { ...conv, unread_count: 0 } 
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Update current conversation data when conversations or selection changes
  useEffect(() => {
    if (selectedConversation && conversations.length > 0) {
      const conv = conversations.find(c => c.conversation_id === selectedConversation);
      if (conv) {
        setCurrentConversationData(conv);
      }
    }
  }, [selectedConversation, conversations]);

  // Setup WebSocket connection
  const setupWebSocket = useCallback((conversationId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const token = localStorage.getItem('authToken');
    const wsUrl = `ws://localhost:8000/chat/ws/${conversationId}?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[CHAT] WebSocket received:', data);
      if (data.type === 'message' || data.message || data.sender_id) {
        const newMsg = data.message || data;
        // Only add if message doesn't already exist
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMsg.id || m.id === newMsg._id);
          if (exists) return prev;
          return [...prev, newMsg];
        });
        setTimeout(scrollToBottom, 100);
        
        // Update last message in conversations
        setConversations(prev =>
          prev.map(conv =>
            conv.conversation_id === conversationId
              ? { ...conv, last_message: newMsg.message, last_message_time: newMsg.timestamp }
              : conv
          )
        );
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
  }, []);

  // Send message
  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation) return;

    if (selectedFile) {
      await uploadFile();
      return;
    }

    const messageToSend = newMessage.trim();
    setNewMessage('');

    // Always use HTTP POST for sending messages (more reliable than WebSocket)
    try {
      console.log('[CHAT] Sending message:', { conversation: selectedConversation, message: messageToSend });
      const response = await fetchAPI<Message>(`/chat/messages/${selectedConversation}`, {
        method: 'POST',
        body: JSON.stringify({ message: messageToSend })
      });
      console.log('[CHAT] Message sent successfully:', response);
      console.log('[CHAT] Response sender_id:', response.sender_id, 'User id:', user?.id);
      setMessages(prev => [...prev, response]);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('[CHAT] Failed to send message:', error);
      setNewMessage(messageToSend); // Restore message on failure
    }
  };

  // Upload file
  const uploadFile = async () => {
    if (!selectedFile || !selectedConversation) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8000/chat/upload/${selectedConversation}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[CHAT] File uploaded:', data);
        // The backend now returns a complete message object and broadcasts via WebSocket
        // Only add to messages if it wasn't already added by WebSocket
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.id || m.id === data._id);
          if (exists) return prev;
          return [...prev, data];
        });
        setTimeout(scrollToBottom, 100);
      } else {
        const errorText = await response.text();
        console.error('[CHAT] Upload failed:', errorText);
        alert('Failed to upload file');
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp - handle invalid dates gracefully
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for message groups - handle invalid dates gracefully
  const formatDate = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Unknown';
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  // Group messages by date - handle invalid dates gracefully
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach(msg => {
      if (!msg.timestamp) return; // Skip messages without timestamp
      const date = new Date(msg.timestamp);
      const dateKey = isNaN(date.getTime()) ? 'Unknown' : date.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv =>
    conv.partner_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get partner info for current conversation
  const currentPartner = conversations.find(c => c.conversation_id === selectedConversation);

  // Poll for new messages as fallback (every 3 seconds)
  const pollMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await fetchAPI<Message[]>(`/chat/messages/${conversationId}`);
      setMessages(prev => {
        // Only update if we have new messages
        if (data.length > prev.length) {
          return data;
        }
        // Check if last message is different
        if (data.length > 0 && prev.length > 0) {
          const lastNew = data[data.length - 1];
          const lastOld = prev[prev.length - 1];
          if (lastNew.id !== lastOld.id) {
            return data;
          }
        }
        return prev;
      });
    } catch (error) {
      console.error('Poll messages error:', error);
    }
  }, []);

  // Effects
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      setupWebSocket(selectedConversation);
      
      // Update URL
      navigate(`/chat/${selectedConversation}`, { replace: true });
      
      // Poll for new messages every 3 seconds as fallback
      const pollInterval = setInterval(() => {
        pollMessages(selectedConversation);
      }, 3000);
      
      return () => {
        clearInterval(pollInterval);
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedConversation, loadMessages, setupWebSocket, navigate, pollMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Render message content based on type
  const renderMessageContent = (message: Message) => {
    if (message.deleted) {
      return <span className="italic text-gray-400">This message was deleted</span>;
    }

    // System messages (appointment notifications)
    if (message.message_type === 'system' || message.sender_id === 'system') {
      return (
        <div className="text-center py-2">
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
            {message.message}
          </span>
        </div>
      );
    }

    switch (message.message_type) {
      case 'image':
        const imageUrl = message.file_url?.startsWith('http') 
          ? message.file_url 
          : `http://localhost:8000${message.file_url}`;
        return (
          <div>
            <img 
              src={imageUrl} 
              alt="Shared image" 
              className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
              onClick={() => window.open(imageUrl, '_blank')}
            />
            {message.message && <p className="mt-2">{message.message}</p>}
          </div>
        );
      case 'file':
        const fileUrl = message.file_url?.startsWith('http') 
          ? message.file_url 
          : `http://localhost:8000${message.file_url}`;
        return (
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">{message.message || 'File attachment'}</span>
          </a>
        );
      default:
        return <p className="whitespace-pre-wrap">{message.message}</p>;
    }
  };

  if (loading) {
    return (
      <div className="-m-6 h-[calc(100vh-4rem)] bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="-m-6 h-[calc(100vh-4rem)] bg-gray-100 flex overflow-hidden">
        {/* Sidebar - Conversation List */}
        <div className={`${showSidebar ? 'w-full md:w-96' : 'hidden'} ${selectedConversation ? 'hidden md:block' : ''} bg-white border-r border-gray-200 flex flex-col`}>
          {/* Sidebar Header */}
          <div className="bg-[#008069] text-white p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold">Chats</h1>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/10 rounded-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-10 py-2 bg-[#00695c] rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-center">No conversations yet</p>
                <p className="text-sm text-center mt-2">Start chatting with your doctor or patient after booking an appointment</p>
              </div>
            ) : filteredConversations.length === 0 && searchTerm ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 p-4">
                <p className="text-center text-sm">No results for "{searchTerm}"</p>
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-teal-600 text-sm mt-2 hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.conversation_id}
                  onClick={() => setSelectedConversation(conv.conversation_id)}
                  className={`flex items-center gap-3 p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedConversation === conv.conversation_id ? 'bg-[#f0f2f5]' : ''}`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-lg">
                      {conv.partner_name.charAt(0).toUpperCase()}
                    </div>
                    {/* Online indicator or chat status */}
                    {conv.chat_enabled ? (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    ) : (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conv.partner_role === 'doctor' ? 'Dr. ' : ''}{conv.partner_name}
                        </h3>
                        {conv.total_appointments > 1 && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            {conv.total_appointments} appts
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {conv.last_message_time ? formatTime(conv.last_message_time) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500 truncate">
                        {conv.last_message || 'No messages yet'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="bg-[#25d366] text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : ''}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-[#008069] text-white px-4 py-3 flex items-center gap-3 shadow-sm">
                {/* Back button for mobile */}
                <button 
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-1 hover:bg-white/10 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Partner Avatar */}
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                  {currentPartner?.partner_name.charAt(0).toUpperCase() || '?'}
                </div>
                
                {/* Partner Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold truncate">
                    {currentPartner?.partner_role === 'doctor' ? 'Dr. ' : ''}{currentPartner?.partner_name || 'Chat'}
                  </h2>
                  <p className="text-xs text-white/80">
                    {currentPartner?.chat_enabled 
                      ? `${currentPartner?.total_appointments || 0} appointment${(currentPartner?.total_appointments || 0) > 1 ? 's' : ''}` 
                      : 'Pending approval'}
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className="p-2 hover:bg-white/10 rounded-full"
                    title="View details"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Messages Area */}
              <div 
                className="flex-1 overflow-y-auto p-4"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d5dbdb' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundColor: '#e5ddd5'
                }}
              >
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                      <svg className="w-12 h-12 mx-auto mb-3 text-[#008069]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="font-medium text-gray-700">No messages yet</p>
                      <p className="text-sm mt-1">Send a message to start the conversation</p>
                    </div>
                  </div>
                ) : (
                  Object.entries(groupMessagesByDate(messages)).map(([dateKey, dayMessages]) => (
                    <div key={dateKey}>
                      {/* Date Separator */}
                      <div className="flex justify-center my-4">
                        <span className="bg-white/90 text-gray-600 text-xs px-3 py-1 rounded-lg shadow-sm">
                          {formatDate(dayMessages[0].timestamp)}
                        </span>
                      </div>
                      
                      {/* Messages for this date */}
                      {dayMessages.map((message, index) => {
                        // Handle system messages (appointment notifications) differently
                        if (message.message_type === 'system' || message.sender_id === 'system') {
                          return (
                            <div key={message.id || index} className="flex justify-center my-3">
                              <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-xs font-medium shadow-sm max-w-[80%] text-center">
                                <span>📋 </span>
                                {message.message}
                                <div className="text-yellow-600 text-[10px] mt-1">
                                  {formatTime(message.timestamp)}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const isOwn = message.sender_id === user?.id;
                        const showAvatar = !isOwn && (index === 0 || dayMessages[index - 1]?.sender_id !== message.sender_id);
                        
                        return (
                          <div
                            key={message.id || index}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
                          >
                            {/* Avatar placeholder for alignment */}
                            {!isOwn && (
                              <div className={`w-8 ${showAvatar ? '' : 'invisible'}`}>
                                {showAvatar && (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-medium">
                                    {message.sender_name?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Message Bubble */}
                            <div
                              className={`max-w-[70%] mx-2 px-3 py-2 rounded-lg shadow-sm ${
                                isOwn 
                                  ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none' 
                                  : 'bg-white text-gray-800 rounded-tl-none'
                              }`}
                            >
                              {renderMessageContent(message)}
                              
                              {/* Time and Read Status */}
                              <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-gray-600' : 'text-gray-500'}`}>
                                <span className="text-[10px]">{formatTime(message.timestamp)}</span>
                                {isOwn && (
                                  <span className="text-[#4fc3f7]">
                                    {message.read_by && message.read_by.length > 1 ? (
                                      // Double check - read
                                      <svg className="w-4 h-4" viewBox="0 0 16 15" fill="currentColor">
                                        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.266a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.89 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                                      </svg>
                                    ) : (
                                      // Single check - sent
                                      <svg className="w-4 h-4" viewBox="0 0 16 15" fill="currentColor">
                                        <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.89 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                                      </svg>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* File Preview */}
              {selectedFile && (
                <div className="px-4 py-2 bg-gray-100 border-t flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg flex-1">
                    {selectedFile.type.startsWith('image/') ? (
                      <img 
                        src={URL.createObjectURL(selectedFile)} 
                        alt="Preview" 
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    <span className="text-sm text-gray-600 truncate">{selectedFile.name}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="p-2 text-gray-500 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Message Input */}
              <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-3">
                {/* Emoji Picker Toggle */}
                <div className="relative">
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  
                  {/* Quick Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg p-2 flex gap-1">
                      {quickEmojis.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setNewMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                            messageInputRef.current?.focus();
                          }}
                          className="p-2 hover:bg-gray-100 rounded text-xl"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* File Attachment */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                
                {/* Message Input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message"
                    className="w-full px-4 py-2 bg-white rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#008069]/30 resize-none"
                    rows={1}
                    style={{ maxHeight: '100px' }}
                  />
                </div>
                
                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && !selectedFile) || uploading}
                  className="p-3 bg-[#008069] text-white rounded-full hover:bg-[#017561] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          ) : (
            // No conversation selected - Welcome screen
            <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] text-gray-500">
              <div className="bg-white rounded-lg p-8 shadow-sm text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-4 bg-[#008069] rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Wellness Chat</h2>
                <p className="text-gray-600">
                  Send and receive messages with your healthcare provider.<br />
                  Select a conversation from the list to start chatting.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Details Panel */}
        {showDetails && selectedConversation && currentPartner && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto hidden lg:block">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Conversation Details</h3>
                <button 
                  onClick={() => setShowDetails(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Partner Avatar Large */}
              <div className="text-center mb-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-3xl font-semibold">
                  {currentPartner?.partner_name.charAt(0).toUpperCase()}
                </div>
                <h4 className="mt-3 font-semibold text-lg text-gray-800">
                  {currentPartner?.partner_role === 'doctor' ? 'Dr. ' : ''}{currentPartner?.partner_name}
                </h4>
                <p className="text-sm text-gray-500 capitalize">{currentPartner?.partner_role}</p>
                {currentPartner?.partner_mobile && (
                  <p className="text-sm text-teal-600 mt-1">{currentPartner.partner_mobile}</p>
                )}
              </div>
            </div>
            
            {/* Chat Status */}
            <div className="p-4 border-b">
              <div className={`flex items-center gap-2 ${currentPartner.chat_enabled ? 'text-green-600' : 'text-yellow-600'}`}>
                <div className={`w-2 h-2 rounded-full ${currentPartner.chat_enabled ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-sm font-medium">
                  {currentPartner.chat_enabled ? 'Chat Enabled' : 'Awaiting Approval'}
                </span>
              </div>
            </div>
            
            {/* Appointments List */}
            <div className="p-4">
              <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                Appointments ({currentPartner.total_appointments})
              </h4>
              <div className="space-y-3">
                {currentPartner.appointments.map((apt) => (
                  <div key={apt.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        apt.status === 'approved' || apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        apt.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {apt.date ? new Date(apt.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'No date'}
                    </p>
                    {apt.time && (
                      <p className="text-xs text-gray-500">{apt.time}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ChatPage;
