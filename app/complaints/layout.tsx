import type { Metadata } from "next";
import ComplaintLayoutClient from "./ComplaintLayoutClient";

export const metadata: Metadata = {
  title: "Complaints",
  description: "Complaints Dashboard",
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <ComplaintLayoutClient>{children}</ComplaintLayoutClient>;
} 