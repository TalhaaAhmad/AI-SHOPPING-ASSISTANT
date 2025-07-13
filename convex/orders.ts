// convex/orders.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";


async function getNextOrderNumber(ctx: any): Promise<number> {
  const counterDoc = await ctx.db
    .query("counters")
    .withIndex("by_name", (q: any) => q.eq("name", "order"))
    .unique();

  if (!counterDoc) {
    // First order ever
    const newCounter = await ctx.db.insert("counters", {
      name: "order",
      value: 1000, // starting point
    });
    return 1000;
  }

  const nextValue = counterDoc.value + 1;

  await ctx.db.patch(counterDoc._id, { value: nextValue });

  return nextValue;
}

// Import the status unions from your schema
const orderStatus = v.union(
  v.literal("pending"),
  v.literal("fulfilled"),
  v.literal("cancelled")
);

const paymentStatus = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("refunded")
);

const fulfillmentStatus = v.union(
  v.literal("Unfulfilled"),
  v.literal("Shipped"),
  v.literal("Delivered"),
  v.literal("Cancelled"),
  v.literal("Returned"),
  v.literal("Refunded")
);

// Create a new order
export const createOrder = mutation({
  args: {
    customer: v.string(),
    email: v.string(),
    status: orderStatus,
    payment: paymentStatus,
    fulfillment: fulfillmentStatus,
    shippingAddress: v.string(),
    trackingNumber: v.optional(v.string()),
    products: v.array(
      v.object({
        brand: v.optional(v.string()),
        name: v.string(),
        quantity: v.number(),
        price: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const orderNumber = await getNextOrderNumber(ctx);
    const orderIdFormatted = `#ORD${orderNumber}`;

    const total = args.products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
    const items = args.products.reduce((sum, product) => sum + product.quantity, 0);

    const orderId = await ctx.db.insert("orders", {
      orderIdFormatted, // custom ID field
      customer: args.customer,
      email: args.email,
      status: args.status,
      payment: args.payment,
      total: total,
      items: items,
      fulfillment: args.fulfillment,
      shippingAddress: args.shippingAddress,
      trackingNumber: args.trackingNumber,
      products: args.products,
    });

    return {
      _id: orderId,
      orderIdFormatted,
    };
  },
});

// NEW: Get order by formatted order ID and email
export const getOrderByFormattedIdAndEmail = query({
  args: { 
    orderIdFormatted: v.string(),
    email: v.string() 
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_orderIdFormatted", (q) => q.eq("orderIdFormatted", args.orderIdFormatted))
      .filter((q) => q.eq(q.field("email"), args.email))
      .unique();
  },
});

// NEW: Get order by formatted order ID only
export const getOrderByFormattedId = query({
  args: { orderIdFormatted: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_orderIdFormatted", (q) => q.eq("orderIdFormatted", args.orderIdFormatted))
      .unique();
  },
});

// NEW: Update product quantities in an order
export const updateOrderQuantities = mutation({
  args: {
    orderId: v.id("orders"),
    products: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        price: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Calculate new totals
    const newTotal = args.products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
    const newItemsCount = args.products.reduce((sum, product) => sum + product.quantity, 0);

    await ctx.db.patch(args.orderId, {
      products: args.products,
      total: newTotal,
      items: newItemsCount,
    });

    return { success: true, newTotal, newItemsCount };
  },
});

// Get orders by customer name
export const getOrdersByCustomer = query({
  args: { customer: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customer", args.customer))
      .order("desc")
      .collect();
  },
});

// Get a specific order by ID
export const getOrderById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId);
  },
});

// Update order status
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: orderStatus,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      status: args.status,
    });
  },
});

// Update payment status
export const updatePaymentStatus = mutation({
  args: {
    orderId: v.id("orders"),
    payment: paymentStatus,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      payment: args.payment,
    });
  },
});

// Update fulfillment status
export const updateFulfillmentStatus = mutation({
  args: {
    orderId: v.id("orders"),
    fulfillment: fulfillmentStatus,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      fulfillment: args.fulfillment,
    });
  },
});

// Update shipping address
export const updateShippingAddress = mutation({
  args: {
    orderId: v.id("orders"),
    shippingAddress: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      shippingAddress: args.shippingAddress,
    });
  },
});

// Update tracking number
export const updateTrackingNumber = mutation({
  args: {
    orderId: v.id("orders"),
    trackingNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      trackingNumber: args.trackingNumber,
    });
  },
});

// Get all orders (admin function)
export const getAllOrders = query({
  handler: async (ctx) => {
    return await ctx.db.query("orders").order("desc").collect();
  },
});

// Get orders by status
export const getOrdersByStatus = query({
  args: { status: orderStatus },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

// Get orders by payment status
export const getOrdersByPayment = query({
  args: { payment: paymentStatus },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_payment", (q) => q.eq("payment", args.payment))
      .order("desc")
      .collect();
  },
});

// Search orders by customer name
export const searchOrders = query({
  args: { 
    searchTerm: v.string(),
    status: v.optional(orderStatus),
    payment: v.optional(paymentStatus),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("orders")
      .withSearchIndex("search_orders", (q) => q.search("customer", args.searchTerm));
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    if (args.payment) {
      query = query.filter((q) => q.eq(q.field("payment"), args.payment));
    }
    
    return await query.collect();
  },
});

// Get order statistics
export const getOrderStats = query({
  handler: async (ctx) => {
    const allOrders = await ctx.db.query("orders").collect();
    
    return {
      total: allOrders.length,
      pending: allOrders.filter(order => order.status === "pending").length,
      fulfilled: allOrders.filter(order => order.status === "fulfilled").length,
      cancelled: allOrders.filter(order => order.status === "cancelled").length,
      totalRevenue: allOrders.reduce((sum, order) => sum + order.total, 0),
      averageOrderValue: allOrders.length > 0 ? allOrders.reduce((sum, order) => sum + order.total, 0) / allOrders.length : 0,
    };
  },
});