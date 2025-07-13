"use client";
import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";

const UserIdContext = createContext<string | null>(null);

export function UserIdProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  return (
    <UserIdContext.Provider value={userId ?? null}>
      {children}
    </UserIdContext.Provider>
  );
}

export function useUserId() {
  return useContext(UserIdContext);
} 