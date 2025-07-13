"use client";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { NavigationProvider } from "@/lib/NavigationProvider";
import { Authenticated } from "convex/react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <>
      <SignedIn>
        <NavigationProvider>
          <div className="flex h-screen">
            <Authenticated>
              <Sidebar />
            </Authenticated>
            <div className="flex-1">
              <Header />
              <main>{children}</main>
            </div>
          </div>
        </NavigationProvider>
      </SignedIn>
      
      <SignedOut>

      </SignedOut>
    </>
  );
}
