"use client";

import React from 'react';
import { useUser } from "@clerk/nextjs";
import { Shield, Users, MessageSquare, Activity, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ADMIN_USER_IDS = [
  "user_2zJ2jWXawy5yFT2GkYTUeQUhdmF",
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Overview', href: '/admin', icon: Activity },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Chats', href: '/admin/chats', icon: MessageSquare },
  { name: 'Orders', href: '/admin/orders', icon: Activity },
  { name: 'Complaints', href: '/admin/complaints', icon: Shield },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!user || !ADMIN_USER_IDS.includes(user.id)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access the admin dashboard.</p>
          <Link
            href="/"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors inline-block"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r shadow-sm fixed inset-y-0 left-0 z-30">
        <div className="flex items-center h-16 px-6 border-b">
          <Shield className="w-8 h-8 text-blue-500 mr-2" />
          <span className="text-xl font-bold text-gray-900">Admin Panel</span>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors mb-1 ${
                isActive(item.href)
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-blue-700'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${isActive(item.href) ? 'text-blue-500' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          ))}
        </nav>
        {/* User info at bottom */}
        <div className="mt-auto p-4 border-t flex items-center space-x-3">
          {user.imageUrl ? (
            <img src={user.imageUrl} alt="User avatar" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-gray-500 truncate">{user.emailAddresses[0]?.emailAddress}</p>
          </div>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
        {/* Topbar */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-gray-900">
                {navigation.find(item => isActive(item.href))?.name || 'Admin Dashboard'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Admin</span>
              <span className="text-sm text-gray-600">•</span>
              <span className="text-sm text-gray-600">{user.emailAddresses[0]?.emailAddress}</span>
            </div>
          </div>
        </header>
        {/* Main content */}
        <main className="flex-1 bg-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 