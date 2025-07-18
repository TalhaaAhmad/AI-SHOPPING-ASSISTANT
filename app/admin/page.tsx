// app/admin/page.tsx (App Router) or pages/admin/index.tsx (Pages Router)

"use client"; // Remove this line if using Pages Router

import React, { useState, useEffect } from 'react';
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs"; // or your auth provider
import { api as convexApi } from "../../convex/_generated/api";
import { Search, Users, MessageSquare, Activity, Eye, Calendar, TrendingUp, Shield, AlertCircle, X, User, Bot, Send, Image as ImageIcon } from 'lucide-react';

// Admin user IDs - should match your admin.ts file
const ADMIN_USER_IDS = [
  "user_2zJ2jWXawy5yFT2GkYTUeQUhdmF",
];

interface WhatsAppReplyTabProps {
  allWhatsAppChats: any[];
  replyChatMessages: any[];
  handleSendReply: (message: string) => void;
  selectedReplyChat: any;
  setSelectedReplyChat: (chat: any) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  sendingReply: boolean;
  formatDate: (timestamp: number) => string;
}

const WhatsAppReplyTab: React.FC<WhatsAppReplyTabProps> = ({
  allWhatsAppChats,
  replyChatMessages,
  handleSendReply,
  selectedReplyChat,
  setSelectedReplyChat,
  replyText,
  setReplyText,
  sendingReply,
  formatDate,
}) => {
  const [waSearchTerm, setWaSearchTerm] = React.useState('');
  const [waPage, setWaPage] = React.useState(1);
  const waChatsPerPage = 10;
  const filteredChats = (Array.isArray(allWhatsAppChats) ? allWhatsAppChats : []).filter((chat: any) => {
    const term = waSearchTerm.toLowerCase();
    return (
      chat.contact_name?.toLowerCase().includes(term) ||
      (chat.name && chat.name.toLowerCase().includes(term))
    );
  });
  const totalPages = Math.ceil(filteredChats.length / waChatsPerPage) || 1;
  const paginatedChats = filteredChats.slice((waPage - 1) * waChatsPerPage, waPage * waChatsPerPage);

  // Helper to get last message preview
  const getLastMessage = (chatId: string) => {
    if (!chatId || !Array.isArray(replyChatMessages)) return '';
    const msgs = replyChatMessages.filter((m: any) => m.chatId === chatId);
    if (msgs.length === 0) return '';
    return msgs[msgs.length - 1].content;
  };

  // Scroll to bottom on new message
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replyChatMessages, selectedReplyChat]);

  return (
    <div className="flex h-[80vh] bg-white rounded-lg shadow-md overflow-hidden">
      {/* Chat List */}
      <div className="w-full sm:w-1/3 border-r flex flex-col min-w-[250px] max-w-[350px]">
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full px-3 py-2 border rounded"
            value={waSearchTerm}
            onChange={e => {
              setWaSearchTerm(e.target.value);
              setWaPage(1);
            }}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {paginatedChats.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">No WhatsApp conversations found.</div>
          ) : (
            paginatedChats.map(chat => (
              <div
                key={chat._id}
                className={`p-4 cursor-pointer hover:bg-gray-100 border-b ${selectedReplyChat?._id === chat._id ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedReplyChat(chat)}
              >
                <div className="font-medium truncate">{chat.name || chat.contact_name}</div>
                <div className="text-xs text-gray-500 truncate">{getLastMessage(chat._id)}</div>
              </div>
            ))
          )}
        </div>
        {/* Pagination controls */}
        <div className="flex items-center justify-between p-2 border-t bg-gray-50">
          <button
            onClick={() => setWaPage(p => Math.max(1, p - 1))}
            disabled={waPage === 1}
            className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
          >Prev</button>
          <span className="text-sm">Page {waPage} of {totalPages}</span>
          <button
            onClick={() => setWaPage(p => Math.min(totalPages, p + 1))}
            disabled={waPage === totalPages}
            className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
          >Next</button>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedReplyChat ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <div>
                <div className="font-semibold text-lg">{selectedReplyChat.name || selectedReplyChat.contact_name}</div>
                <div className="text-xs text-gray-500">{selectedReplyChat.contact_name}</div>
              </div>
              <button
                onClick={() => setSelectedReplyChat(null)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {(!replyChatMessages || replyChatMessages.length === 0) ? (
                <div className="text-center text-gray-400 mt-10">No messages in this conversation</div>
              ) : (
                replyChatMessages.map((msg: any) => (
                  <div
                    key={msg._id}
                    className={`mb-2 flex ${msg.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`rounded-lg px-4 py-2 max-w-xs break-words ${msg.role === 'assistant' ? 'bg-green-100 text-right' : 'bg-white border'}`}>
                      <div>{msg.content}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatDate(msg.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Message input */}
            <div className="p-3 border-t flex items-center bg-white">
              <input
                type="text"
                className="flex-1 px-3 py-2 border rounded mr-2"
                placeholder="Type your reply..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendReply(replyText); }}
                disabled={sendingReply}
              />
              <button
                className="bg-green-500 text-white px-4 py-2 rounded-lg"
                onClick={() => handleSendReply(replyText)}
                disabled={!replyText.trim() || sendingReply}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <span>Select a chat to start replying</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface ChatType {
  _id: string;
  title?: string;
  username?: string;
  email?: string;
  humanResponseNeeded?: boolean;
}

interface MessageType {
  _id: string;
  chatId: string;
  content: string;
  role: string;
  createdAt: number;
}

interface HumanEscalationsTabProps {
  allChats: { page: ChatType[] };
  allMessages: { page: MessageType[] };
  handleSendReply: (message: string, chatObj?: ChatType) => void;
  formatDate: (timestamp: number) => string;
}

const HumanEscalationsTab: React.FC<HumanEscalationsTabProps> = ({
  allChats,
  allMessages,
  handleSendReply,
  formatDate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const chatsPerPage = 10;
  // Filter for escalated chats
  const escalatedChats = allChats.page.filter((chat: ChatType) => chat.humanResponseNeeded);
  const filteredChats = escalatedChats.filter((chat: ChatType) => {
    const term = searchTerm.toLowerCase();
    return (
      chat.title?.toLowerCase().includes(term) ||
      chat.username?.toLowerCase().includes(term) ||
      chat.email?.toLowerCase().includes(term)
    );
  });
  const totalPages = Math.ceil(filteredChats.length / chatsPerPage) || 1;
  const paginatedChats = filteredChats.slice((page - 1) * chatsPerPage, page * chatsPerPage);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const chatMessages: MessageType[] = selectedChat
    ? allMessages.page.filter((m: MessageType) => m.chatId === selectedChat._id).sort((a: MessageType, b: MessageType) => a.createdAt - b.createdAt)
    : [];
  // Helper to get last message preview
  const getLastMessage = (chatId: string): string => {
    const msgs = allMessages.page.filter((m: MessageType) => m.chatId === chatId);
    if (msgs.length === 0) return '';
    return msgs[msgs.length - 1].content;
  };
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, selectedChat]);
  return (
    <div className="flex h-[80vh] bg-white rounded-lg shadow-md overflow-hidden">
      {/* Chat List */}
      <div className="w-full sm:w-1/3 border-r flex flex-col min-w-[250px] max-w-[350px]">
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full px-3 py-2 border rounded"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {paginatedChats.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">No escalated conversations found.</div>
          ) : (
            paginatedChats.map((chat: ChatType) => (
              <div
                key={chat._id}
                className={`p-4 cursor-pointer hover:bg-gray-100 border-b ${selectedChat?._id === chat._id ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedChat(chat)}
              >
                <div className="font-medium truncate">{chat.title || chat.username || chat.email}</div>
                <div className="text-xs text-gray-500 truncate">{getLastMessage(chat._id)}</div>
              </div>
            ))
          )}
        </div>
        {/* Pagination controls */}
        <div className="flex items-center justify-between p-2 border-t bg-gray-50">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
          >Prev</button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
          >Next</button>
        </div>
      </div>
      {/* Conversation */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <div>
                <div className="font-semibold text-lg">{selectedChat.title || selectedChat.username || selectedChat.email}</div>
                <div className="text-xs text-gray-500">{selectedChat.email}</div>
              </div>
              <button
                onClick={() => setSelectedChat(null)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-400 mt-10">No messages in this conversation</div>
              ) : (
                chatMessages.map((msg: MessageType) => (
                  <div
                    key={msg._id}
                    className={`mb-2 flex ${msg.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`rounded-lg px-4 py-2 max-w-xs break-words ${msg.role === 'assistant' ? 'bg-green-100 text-right' : 'bg-white border'}`}>
                      <div>{msg.content}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatDate(msg.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Message input */}
            <div className="p-3 border-t flex items-center bg-white">
              <input
                type="text"
                className="flex-1 px-3 py-2 border rounded mr-2"
                placeholder="Type your reply..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendReply(replyText, selectedChat); }}
                disabled={sendingReply}
              />
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-lg"
                onClick={() => handleSendReply(replyText, selectedChat)}
                disabled={!replyText.trim() || sendingReply}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <span>Select a chat to start replying</span>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminPage = () => {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  // For reply tab
  const [selectedReplyChat, setSelectedReplyChat] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [humanResponseNeeded, setHumanResponseNeeded] = React.useState(false);

  // WhatsApp data
  const [selectedWhatsAppChat, setSelectedWhatsAppChat] = useState<any>(null);
  const [showWhatsAppChatInterface, setShowWhatsAppChatInterface] = useState(false);

  // 1. Find the chat by contact_name
  const whatsappChat = useQuery(
    convexApi.whatsapp.getChatByContactName,
    selectedWhatsAppChat ? { contact_name: selectedWhatsAppChat.contact_name } : "skip"
  );
  // 2. Fetch messages by chatId (if chat exists)
  const whatsappMessages = useQuery(
    convexApi.whatsapp.listMessages,
    whatsappChat ? { chatId: whatsappChat._id } : "skip"
  );

  const allWhatsAppChats = useQuery(convexApi.whatsapp.getAllWhatsAppChats, user ? {} : "skip");

  // WhatsApp chats for reply tab
  const replyChatMessages = useQuery(
    convexApi.whatsapp.listMessages,
    selectedReplyChat ? { chatId: selectedReplyChat._id } : "skip"
  );

  // Handler to send reply
  const handleSendReply = async (message: string, chatObj?: any) => {
    const chat = chatObj || selectedReplyChat;
    if (!message.trim() || !chat) return;
    setSendingReply(true);
    try {
      // Call backend API to send message to chat and store in Convex
      await fetch("/api/chat/stream/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chat._id,
          message,
        }),
      });
      setReplyText("");
    } catch (e) {
      alert("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  // Convex queries - only run when user is authenticated
  const stats = useQuery(convexApi.admin.getConversationStats, user ? {} : "skip");
  const allChats = useQuery(convexApi.admin.getAllChats, user ? { limit: 50 } : "skip");
  const allMessages = useQuery(convexApi.admin.getAllMessages, user ? { limit: 100 } : "skip");
  const userActivity = useQuery(
    convexApi.admin.getUserActivity, 
    user && selectedUser ? { userId: selectedUser } : "skip"
  );

  // Search functionality
  const searchConversations = useQuery(
    convexApi.admin.searchConversations,
    user && searchTerm.length > 2 ? { searchTerm, limit: 20 } : "skip"
  );

  useEffect(() => {
    if (searchConversations) {
      setSearchResults(searchConversations);
    }
  }, [searchConversations]);

  // Update chat messages when a chat is selected
  useEffect(() => {
    if (selectedChat && allMessages) {
      const messages = allMessages.page
        .filter(m => m.chatId === selectedChat._id)
        .sort((a, b) => a.createdAt - b.createdAt);
      setChatMessages(messages);
    }
  }, [selectedChat, allMessages]);

  // Fetch humanResponseNeeded when opening a chat
  React.useEffect(() => {
    if (selectedChat && typeof selectedChat.humanResponseNeeded === 'boolean') {
      setHumanResponseNeeded(selectedChat.humanResponseNeeded);
    } else {
      setHumanResponseNeeded(false);
    }
  }, [selectedChat]);

  // Loading state
  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!user || !ADMIN_USER_IDS.includes(user.id)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access the admin dashboard.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Error handling
  if (!stats || !allChats || !allMessages) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading Dashboard</h1>
          <p className="text-gray-600 mb-6">Please wait while we load the admin dashboard...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // const formatContent = (content: string) => {
  //   return content.replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  // };

  const formatContent = (content: string) => {
    return content
      .replace(/\\n/g, '\n') // Convert escaped newlines to real newlines
      .replace(/-*START\s*-*/gi, '') // Remove 'START' with optional dashes/spaces, case-insensitive
      .replace(/-*END\s*-*/gi, '')   // Remove 'END' with optional dashes/spaces, case-insensitive
      .replace(/\\\\/g, '\\')           // Convert double backslashes to single
      .replace(/\\+/g, '');                 // Remove any remaining single backslashes
  };

  const openChatInterface = (chat: any) => {
    setSelectedChat(chat);
    setShowChatInterface(true);
  };

  const closeChatInterface = () => {
    setShowChatInterface(false);
    setSelectedChat(null);
    setChatMessages([]);
    setSelectedImage(null);
  };

  // WhatsApp Chat Interface
  const openWhatsAppChatInterface = (chat: any) => {
    setSelectedWhatsAppChat(chat);
    setShowWhatsAppChatInterface(true);
  };
  const closeWhatsAppChatInterface = () => {
    setShowWhatsAppChatInterface(false);
    setSelectedWhatsAppChat(null);
    setSelectedImage(null);
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }: { title: string; value: number; icon: any; color?: string }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <Icon className={`w-8 h-8 text-${color}-500`} />
      </div>
    </div>
  );

// Enhanced ChatMessage component with image support
const ChatMessage = ({ message }: { message: any }) => {
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const imageAttachments = hasAttachments ? message.attachments.filter((att: any) => att.type === 'image') : [];

  // Helper to get correct image src
  const getImageSrc = (attachment: any) => {
    if (!attachment.url) return '';
    
    // If it's already a complete data URL, use it as-is
    if (attachment.url.startsWith('data:image')) {
      return attachment.url;
    }
    
    // If it's a regular HTTP URL, use it as-is
    if (attachment.url.startsWith('http')) {
      return attachment.url;
    }
    
    // If it's a Convex storage URL, use it directly
    if (attachment.url.includes('.convex.cloud') || attachment.url.includes('.convex.dev')) {
      return attachment.url;
    }
    
    // Check if it's base64 data without the data: prefix
    if (attachment.url.match(/^[A-Za-z0-9+/]+=*$/)) {
      const mimeType = attachment.mimeType || 'image/jpeg';
      return `data:${mimeType};base64,${attachment.url}`;
    }
    
    // Last resort: try to use the URL as-is
    return attachment.url;
  };

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          message.role === 'user' ? 'bg-blue-500 ml-2' : 'bg-gray-500 mr-2'
        }`}>
          {message.role === 'user' ? (
            message.imageUrl ? (
              <img 
                src={message.imageUrl} 
                alt="User avatar" 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-white" />
            )
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>
        <div className={`rounded-lg px-4 py-2 ${
          message.role === 'user' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}>
          <div className="text-xs opacity-75 mb-1 flex items-center justify-between">
            <span>
              {message.role === 'user' && (message.username || message.email) ? (
                <span className="font-medium">
                  {message.username || `${message.firstName} ${message.lastName}`.trim() || message.email}
                </span>
              ) : ( 
                <span>Assistant</span>
              )}
            </span>
            <span>{formatDate(message.createdAt)}</span>
          </div>
          
          {/* Text Content */}
          {message.content && message.content.trim() && (
            <div className="whitespace-pre-wrap break-words mb-2">
              {formatContent(message.content)}
            </div>
          )}
          
          {/* Image Attachments - SIMPLIFIED FOR DEBUGGING */}
          {imageAttachments.length > 0 && (
            <div className="space-y-2">
              {imageAttachments.map((attachment: any, index: number) => {
                const src = getImageSrc(attachment);              
                return (
                  <div key={index} className="relative">
                    <div className="flex items-center space-x-2 mb-1">
                      <ImageIcon className="w-4 h-4 opacity-70" />
                      <span className="text-xs opacity-70">{attachment.filename}</span>
                      {attachment.size && (
                        <span className="text-xs opacity-50">
                          ({(attachment.size / 1024).toFixed(1)}KB)
                        </span>
                      )}
                    </div>
                    
                    
                    {/* ACTUAL IMAGE */}
                    <div className="relative group">
                      <img
                        src={attachment.url}
                        alt={attachment.filename}
                        className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-gray-300"
                        onClick={() => setSelectedImage(src)}
                        onError={(e) => {
                          console.error('❌ IMAGE FAILED TO LOAD:', {
                            src: src.substring(0, 100),
                            attachment,
                            error: e
                          });
                          
                          // Show error state
                          const target = e.currentTarget;
                          target.style.border = '2px solid red';
                          target.style.backgroundColor = '#fee';
                        }}
                        onLoad={() => {
                          console.log('✅ IMAGE LOADED SUCCESSFULLY:', attachment.filename);
                        }}
                        style={{ 
                          background: "#f9f9f9",
                          border: "1px solid #e5e7eb"
                        }}
                      />
                      
                      {/* Hover overlay - FIXED */}
                      <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center pointer-events-none">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-6 h-6 text-white drop-shadow-lg" />
                        </div>
                      </div>
                    </div>
                  
                  </div>
                );
              })}
            </div>
          )}
          
          {/* No content indicator */}
          {!message.content?.trim() && imageAttachments.length === 0 && (
            <div className="text-xs opacity-50 italic">
              Empty message
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
  // Image Modal Component
  const ImageModal = () => {
    if (!selectedImage) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
        <div className="relative max-w-4xl max-h-[90vh]">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full size image"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      </div>
    );
  };

  // Add reply input to ChatInterface
  interface ChatInterfaceProps {
    chatMessages: any[];
    selectedChat: any;
    setShowChatInterface: (show: boolean) => void;
    setSelectedChat: (chat: any) => void;
    setChatMessages: (msgs: any[]) => void;
    selectedImage: any;
    setSelectedImage: (img: any) => void;
    formatDate: (timestamp: number) => string;
  }
  const ChatInterface = ({
    chatMessages = [],
    selectedChat,
    setShowChatInterface,
    setSelectedChat,
    setChatMessages,
    selectedImage,
    setSelectedImage,
    formatDate,
    humanResponseNeeded,
    setHumanResponseNeeded,
  }: ChatInterfaceProps & { humanResponseNeeded: boolean; setHumanResponseNeeded: (v: boolean) => void }) => {
    const [replyText, setReplyText] = React.useState('');
    const [sendingReply, setSendingReply] = React.useState(false);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [chatMessages, selectedChat]);

    // Handler to send reply to regular chat
    const handleSendChatReply = async (message: string) => {
      if (!message.trim() || !selectedChat) return;
      setSendingReply(true);
      try {
        // Call backend API to send message to chat and store in Convex
        await fetch("/api/chat/stream/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: selectedChat._id,
            message,
          }),
        });
        setReplyText("");
      } catch (e) {
        alert("Failed to send reply");
      } finally {
        setSendingReply(false);
      }
    };

    // Handler for Talk to Human toggle
    const handleToggleHuman = async (checked: boolean) => {
      setHumanResponseNeeded(checked);
      await fetch('/api/chat/mark-human', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChat._id, humanResponseNeeded: checked }),
      });
    };

    // Debug log
    console.log("chatMessages.length", chatMessages.length, chatMessages);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-6 h-6 text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold">{selectedChat?.title || 'Chat Conversation'}</h3>
                <div className="text-sm text-gray-600 flex items-center space-x-2">
                  {selectedChat?.imageUrl && (
                    <img 
                      src={selectedChat.imageUrl} 
                      alt="User avatar" 
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  )}
                  <span>
                    {selectedChat?.username || `${selectedChat?.firstName} ${selectedChat?.lastName}`.trim() || 'Unknown User'}
                  </span>
                  {selectedChat?.email && (
                    <span className="text-gray-500">({selectedChat.email})</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowChatInterface(false);
                setSelectedChat(null);
              }}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Talk to Human toggle after 5 messages */}
          {Array.isArray(chatMessages) && chatMessages.length >= 5 && (
            <div className="flex items-center justify-end p-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={humanResponseNeeded}
                  onChange={e => handleToggleHuman(e.target.checked)}
                />
                <span className="text-sm">Talk to Human</span>
              </label>
            </div>
          )}
          {/* Notice if human response is needed */}
          {humanResponseNeeded && (
            <div className="bg-yellow-100 text-yellow-800 text-center py-2 text-sm font-medium">
              Human response requested. AI replies are disabled for this chat.
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages in this conversation</p>
                </div>
              </div>
            ) : (
              chatMessages.map((message: any) => (
                <ChatMessage key={message._id} message={message} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply input */}
          <div className="p-3 border-t flex items-center bg-white">
            <input
              type="text"
              className="flex-1 px-3 py-2 border rounded mr-2"
              placeholder="Type your reply..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendChatReply(replyText); }}
              disabled={sendingReply}
            />
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-lg"
              onClick={() => handleSendChatReply(replyText)}
              disabled={!replyText.trim() || sendingReply}
            >
              Send
            </button>
          </div>
        </div>
        {/* Image Modal */}
        <ImageModal />
      </div>
    );
  };

  // WhatsApp Chat Interface
  const WhatsAppChatInterface = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold">WhatsApp Chat: {selectedWhatsAppChat?.contact_name}</h3>
              <div className="text-sm text-gray-600 flex items-center space-x-2">
                <span>Created: {formatDate(selectedWhatsAppChat?.createdAt || Date.now())}</span>
              </div>
            </div>
          </div>
          <button
            onClick={closeWhatsAppChatInterface}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {(!whatsappMessages || whatsappMessages.length === 0) ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No messages in this conversation</p>
              </div>
            </div>
          ) : (
            whatsappMessages.map((message) => (
              <ChatMessage key={message._id} message={message} />
            ))
          )}
        </div>
        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Created: {formatDate(selectedWhatsAppChat?.createdAt || Date.now())}</span>
            <span>{(whatsappMessages?.length ?? 0)} messages</span>
          </div>
        </div>
      </div>
      {/* Image Modal */}
      <ImageModal />
    </div>
  );

  const ChatsTable = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">All Conversations</h2>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(searchTerm.length > 2 && searchResults ? searchResults.chats : allChats.page).map((chat: any) => {
                const messageCount = allMessages.page.filter(m => m.chatId === chat._id).length;
                return (
                  <tr key={chat._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {chat.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 mr-3">
                          {chat.imageUrl ? (
                            <img 
                              src={chat.imageUrl} 
                              alt="User avatar" 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {chat.username || `${chat.firstName} ${chat.lastName}`.trim() || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500 font-mono truncate max-w-xs">
                            {chat.email || chat.userId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {messageCount} messages
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(chat.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openChatInterface(chat)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Chat</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Search Results Summary */}
      {searchTerm.length > 2 && searchResults && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-medium">
              Found {searchResults.chats.length} conversations and {searchResults.messages.length} messages
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const WhatsAppChatsTable = () => {
    const [waSearchTerm, setWaSearchTerm] = useState('');
    const [waPage, setWaPage] = useState(1);
    const waChatsPerPage = 10;

    // Filter chats by search term
    const filteredChats = (Array.isArray(allWhatsAppChats) ? allWhatsAppChats : []).filter((chat: any) => {
      const term = waSearchTerm.toLowerCase();
      return (
        chat.contact_name?.toLowerCase().includes(term) ||
        (chat.name && chat.name.toLowerCase().includes(term))
      );
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredChats.length / waChatsPerPage) || 1;
    const paginatedChats = filteredChats.slice((waPage - 1) * waChatsPerPage, waPage * waChatsPerPage);

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
          <h2 className="text-xl font-semibold">WhatsApp Conversations</h2>
          <div className="flex flex-1 justify-between sm:justify-end gap-2">
            <input
              type="text"
              placeholder="Search by contact name or number..."
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              value={waSearchTerm}
              onChange={e => {
                setWaSearchTerm(e.target.value);
                setWaPage(1);
              }}
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setWaPage(p => Math.max(1, p - 1))}
                disabled={waPage === 1}
                className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
              >Prev</button>
              <span className="text-sm">Page {waPage} of {totalPages}</span>
              <button
                onClick={() => setWaPage(p => Math.min(totalPages, p + 1))}
                disabled={waPage === totalPages}
                className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
              >Next</button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedChats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400">
                      <div className="flex flex-col items-center">
                        <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                        <span>No WhatsApp conversations found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedChats.map((chat: any) => (
                    <tr key={chat._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{chat.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{chat.contact_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(chat.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openWhatsAppChatInterface(chat)}
                          className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Chat</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-end items-center mt-2">
          <span className="text-sm text-gray-500">Showing {paginatedChats.length} of {filteredChats.length} chats</span>
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Chats" value={stats.totalChats} icon={MessageSquare} />
        <StatCard title="Total Messages" value={stats.totalMessages} icon={Activity} />
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard 
          title="Avg Messages/Chat" 
          value={stats.totalChats > 0 ? Math.round(stats.totalMessages / stats.totalChats) : 0} 
          icon={TrendingUp} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Daily Activity
          </h3>
          <div className="space-y-2">
            {stats.dailyActivity.map((day, index) => (
              <div key={index} className="flex items-center">
                <span className="text-sm text-gray-600 w-24">{day.date}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2 ml-4">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.min((day.count / Math.max(...stats.dailyActivity.map(d => d.count))) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-800 ml-2 w-8">{day.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Message Distribution</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">User Messages</span>
              <span className="text-sm font-medium">{stats.messageStats.userMessages}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Assistant Messages</span>
              <span className="text-sm font-medium">{stats.messageStats.assistantMessages}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Messages</span>
                <span className="text-sm font-bold">{stats.totalMessages}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Top Users by Chat Count</h3>
        <div className="space-y-2">
          {Object.entries(stats.userStats || {})
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([userId, count]) => {
              // Find user info from chats
              const userChat = allChats.page.find(chat => chat.userId === userId);
              const displayName = userChat ? 
                (userChat.username || `${userChat.firstName} ${userChat.lastName}`.trim() || userChat.email || userId) : 
                userId;
              
              return (
                <div key={userId} className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8">
                      {userChat?.imageUrl ? (
                        <img 
                          src={userChat.imageUrl} 
                          alt="User avatar" 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 truncate">{displayName}</span>
                      {userChat?.email && (
                        <span className="text-xs text-gray-500 truncate">{userChat.email}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium">{count} chats</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );

  const renderUsers = () => {
    // Get unique users with their info from chats
    const uniqueUsers = allChats.page.reduce((acc, chat) => {
      if (!acc[chat.userId]) {
        acc[chat.userId] = {
          userId: chat.userId,
          username: chat.username,
          firstName: chat.firstName,
          lastName: chat.lastName,
          email: chat.email,
          imageUrl: chat.imageUrl,
          chatCount: 0
        };
      }
      acc[chat.userId].chatCount++;
      return acc;
    }, {} as Record<string, any>);

    // Filter users based on search term
    const filteredUsers = Object.values(uniqueUsers).filter((user: any) => {
      if (!selectedUser) return true;
      const searchLower = selectedUser.toLowerCase();
      return (
        user.userId.toLowerCase().includes(searchLower) ||
        (user.username && user.username.toLowerCase().includes(searchLower)) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower))
      );
    });

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">User Activity</h2>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search by name, email, or user ID..."
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            />
            <button
              onClick={() => setSelectedUser('')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* User List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">All Users ({filteredUsers.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user: any) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10 mr-3">
                          {user.imageUrl ? (
                            <img 
                              src={user.imageUrl} 
                              alt="User avatar" 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.username || `${user.firstName} ${user.lastName}`.trim() || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email || user.userId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.chatCount} chats
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedUser(user.userId)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                      >
                        View Activity
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Activity Details */}
        {selectedUser && userActivity && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{userActivity.totalChats}</p>
                  <p className="text-sm text-gray-600">Total Chats</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{userActivity.totalMessages}</p>
                  <p className="text-sm text-gray-600">Total Messages</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {userActivity.totalChats > 0 ? Math.round(userActivity.totalMessages / userActivity.totalChats) : 0}
                  </p>
                  <p className="text-sm text-gray-600">Avg Messages/Chat</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Recent Chats</h3>
                <div className="space-y-2">
                  {userActivity.chats.map((chat) => (
                    <div key={chat._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{chat.title}</p>
                        <p className="text-sm text-gray-600">{chat.messageCount} messages</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-500">{formatDate(chat.lastActivity)}</p>
                        <button
                          onClick={() => openChatInterface(chat)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.firstName}</span>
              <span className="text-sm text-gray-600">Last updated: {formatDate(Date.now())}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: Activity },
              { key: 'chats', label: 'Conversations', icon: MessageSquare },
              { key: 'users', label: 'Users', icon: Users },
              { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
              { key: 'whatsapp-reply', label: 'Reply to WhatsApp', icon: Send },
              { key: 'escalations', label: 'Human Escalations', icon: AlertCircle },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'chats' && <ChatsTable />}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'whatsapp' && <WhatsAppChatsTable />}
        {activeTab === 'whatsapp-reply' && (
          <WhatsAppReplyTab
            allWhatsAppChats={allWhatsAppChats ?? []}
            replyChatMessages={replyChatMessages ?? []}
            handleSendReply={handleSendReply}
            selectedReplyChat={selectedReplyChat}
            setSelectedReplyChat={setSelectedReplyChat}
            replyText={replyText}
            setReplyText={setReplyText}
            sendingReply={sendingReply}
            formatDate={formatDate}
          />
        )}
        {activeTab === 'escalations' && (
          <HumanEscalationsTab
            allChats={allChats}
            allMessages={allMessages}
            handleSendReply={handleSendReply}
            formatDate={formatDate}
          />
        )}
      </div>

      {/* Chat Interface Modal */}
      {showChatInterface && (
        <ChatInterface
          chatMessages={chatMessages}
          selectedChat={selectedChat}
          setShowChatInterface={setShowChatInterface}
          setSelectedChat={setSelectedChat}
          setChatMessages={setChatMessages}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          formatDate={formatDate}
          humanResponseNeeded={humanResponseNeeded}
          setHumanResponseNeeded={setHumanResponseNeeded}
        />
      )}
      {showWhatsAppChatInterface && <WhatsAppChatInterface />}
    </div>
  );
};

export default AdminPage;