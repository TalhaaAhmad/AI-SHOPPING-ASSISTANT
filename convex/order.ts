import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { orderStatus, paymentStatus, fulfillmentStatus } from "./schema";

export const getOrders = query({
  args: {
    searchQuery: v.optional(v.string()),
    statusFilter: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let orders;
    
    if (args.searchQuery) {
      // Use search index for text search
      orders = await ctx.db
        .query("orders")
        .withSearchIndex("search_orders", (q) => 
          q.search("customer", args.searchQuery!)
        )
        .collect();
    } else {
      orders = await ctx.db.query("orders").collect();
    }

    // Filter by status if specified
    if (args.statusFilter && args.statusFilter !== "all") {
      orders = orders.filter(order => order.status === args.statusFilter);
    }

    // Add formatted fields for display
    return orders.map(order => ({
      ...order,
      id: `${order.orderIdFormatted}`,
      date: new Date(order._creationTime).toLocaleDateString('en-US'),
      totalFormatted: `$${order.total.toFixed(2)}`
    }));
  }
});

export const getOrder = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;
    
    return {
      ...order,
      id: `${order.orderIdFormatted}`,
      date: new Date(order._creationTime).toLocaleDateString('en-US'),
      totalFormatted: `$${order.total.toFixed(2)}`
    };
  }
});

export const updateOrderStatus = mutation({
  args: {
    id: v.id("orders"),
    status: orderStatus,
    fulfillment: v.optional(fulfillmentStatus),
    payment: v.optional(paymentStatus)
  },
  handler: async (ctx, args) => {
    const { id, status, fulfillment, payment } = args;
    
    const updateData: any = { status };
    
    if (fulfillment !== undefined) {
      updateData.fulfillment = fulfillment;
    }
    
    if (payment !== undefined) {
      updateData.payment = payment;
    }
    
    // Auto-update related fields based on status
    if (status === "fulfilled") {
      if (!fulfillment) updateData.fulfillment = "Shipped";
      if (!payment) updateData.payment = "paid";
    } else if (status === "cancelled") {
      updateData.fulfillment = "Cancelled";
      if (!payment) updateData.payment = "refunded";
    }
    
    await ctx.db.patch(id, updateData);
  }
});



export const addTrackingNumber = mutation({
  args: {
    id: v.id("orders"),
    trackingNumber: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      trackingNumber: args.trackingNumber,
      fulfillment: "Shipped"
    });
  }
});

export const bulkUpdateStatus = mutation({
  args: {
    orderIds: v.array(v.id("orders")),
    status: orderStatus
  },
  handler: async (ctx, args) => {
    const { orderIds, status } = args;
    
    const updateData: any = { status };
    
    // Auto-update related fields based on status
    if (status === "fulfilled") {
      updateData.fulfillment = "Shipped";
      updateData.payment = "paid";
    } else if (status === "cancelled") {
      updateData.fulfillment = "Cancelled";
      updateData.payment = "refunded";
    }
    
    await Promise.all(
      orderIds.map(id => ctx.db.patch(id, updateData))
    );
  }
});

export const updateOrderDelivery = mutation({
  args: {
    id: v.id("orders"),
    fulfillment: fulfillmentStatus,
    trackingNumber: v.optional(v.string()),
    payment: paymentStatus, // <-- not optional!
    returnStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      fulfillment: args.fulfillment,
      trackingNumber: args.trackingNumber,
      payment: args.payment, // <-- always present
      returnStatus: args.returnStatus,
    });
  },
});

export const getOrderChat = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order || !order.chatId) return null;
    
    const chat = await ctx.db.get(order.chatId);
    if (!chat) return null;
    
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", order.chatId!))
      .order("asc")
      .collect();
    
    return {
      chat,
      messages
    };
  }
});