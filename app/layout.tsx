import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import { ConvexClient } from "convex/browser";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { UserIdProvider } from "@/lib/UserContext";
const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Shopping Assistant",
  description: "AI Shopping Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexClientProvider>
    <html lang="en">
      <body
        className={`${geistSans.variable} antialiased`}
      >
        <UserIdProvider>
          {children}
        </UserIdProvider>
      </body>
    </html>
    </ConvexClientProvider>
  );
}
