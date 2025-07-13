// app/api/orders/route.ts (for App Router)
// OR pages/api/orders.ts (for Pages Router)

import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    // Get user authentication from Clerk
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" }, 
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { 
      orderIdFormatted, 
      customer, 
      email, 
      total, 
      items, 
      shippingAddress, 
      status, 
      payment, 
      fulfillment, 
      trackingNumber, 
      products 
    } = body;

    // Validate required fields
    if (!orderIdFormatted || !customer || !email || !total || !items || !shippingAddress || !products) {
      return NextResponse.json(
        { error: "Missing required fields" }, 
        { status: 400 }
      );
    }

    // Create the order through Convex
    const orderId = await convex.mutation(api.chats.createOrder, {
      orderIdFormatted,
      customer,
      email,
      status: status || "pending",
      payment: payment || "pending",
      total,
      items,
      fulfillment: fulfillment || "Unfulfilled",
      shippingAddress,
      trackingNumber,
      products,
    });

    console.log("✅ Order created successfully:", orderId);

    return NextResponse.json({ 
      success: true, 
      orderId,
      message: "Order created successfully" 
    });

  } catch (error) {
    console.error("❌ Error creating order:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to create order", 
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

// For Pages Router (pages/api/orders.ts), use this instead:
/*
import { getAuth } from "@clerk/nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Please sign in" });
    }

    const { 
      orderIdFormatted, 
      customer, 
      email, 
      total, 
      items, 
      shippingAddress, 
      status, 
      payment, 
      fulfillment, 
      trackingNumber, 
      products 
    } = req.body;

    if (!orderIdFormatted || !customer || !email || !total || !items || !shippingAddress || !products) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const orderId = await convex.mutation(api.chats.createOrder, {
      orderIdFormatted,
      customer,
      email,
      status: status || "pending",
      payment: payment || "pending",
      total,
      items,
      fulfillment: fulfillment || "Unfulfilled",
      shippingAddress,
      trackingNumber,
      products,
    });

    console.log("✅ Order created successfully:", orderId);

    res.status(200).json({ 
      success: true, 
      orderId,
      message: "Order created successfully" 
    });

  } catch (error) {
    console.error("❌ Error creating order:", error);
    
    res.status(500).json({ 
      error: "Failed to create order", 
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
*/