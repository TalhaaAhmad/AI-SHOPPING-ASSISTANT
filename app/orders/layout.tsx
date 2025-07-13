import type { Metadata } from "next";
import OrdersLayoutClient from "./OrdersLayoutClient";

export const metadata: Metadata = {
  title: "Orders",
  description: "Orders Dashboard",
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <OrdersLayoutClient>{children}</OrdersLayoutClient>;
} 