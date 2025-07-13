"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "./ui/button";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { NavigationContext } from "@/lib/NavigationProvider";
import { use } from "react";
import { Bot } from "lucide-react";

export default function Header() {
  const { setIsMobileNavOpen } = use(NavigationContext);
  const { user } = useUser();

  // Fetch user from Convex based on Clerk's userId
  const userData = useQuery(api.users.getUserByUserId, {
    userId: user?.id ?? "",
  });

  return (
    <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Mobile menu + Logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <HamburgerMenuIcon className="h-5 w-5" />
          </Button>
          
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-800">AI Shopping Assistant</h1>
              <p className="text-xs text-gray-600">Powered by Wato</p>
            </div>
          </div>
        </div>

        {/* Right side - Status + User info */}
        <div className="flex items-center gap-4">
          {/* Online status */}
          <div className="hidden sm:flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-600">Online</span>
          </div>

          {/* User ID (optional - you might want to remove this in production) */}
          {userData ? (
            <div className="hidden md:block text-sm text-gray-700 font-medium">
              ID: {userData.userId}
            </div>
          ) : (
            <div className="hidden md:block text-sm text-gray-400">Loading...</div>
          )}

          {/* User button */}
          <UserButton
            appearance={{
              elements: {
                avatarBox:
                  "h-8 w-8 ring-2 ring-gray-200/50 ring-offset-2 rounded-full transition-shadow hover:ring-gray-300/50",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}