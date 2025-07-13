import React, { useState } from 'react';
import { Search, Users, MessageSquare, Activity, Eye, Calendar, TrendingUp } from 'lucide-react';

interface Chat {
  _id: string;
  title: string;
  userId: string;
  createdAt: number;
  messageCount: number;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedUser, setSelectedUser] = useState('');

  // TODO: Replace with Convex queries for stats, chats, and messages

  // const formatDate = (timestamp: number) => {
  //   return new Date(timestamp).toLocaleString();
  // };

  // Remove all renderOverview, renderChats, renderMessages, renderUsers, and any usage of mock data

  return (
    <div>
      {/* TODO: Implement dashboard UI using Convex data */}
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      {/* Add Convex-powered stats, chats, messages, and users here */}
    </div>
  );
};

export default AdminDashboard;