import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";
import type { Order } from "@/lib/types";

// 1. ORDER STATUS TOOL (Updated to use formatted order ID)
export const orderStatusTool = new DynamicStructuredTool({
  name: "checkOrderStatus",
  description:
    "Check the status of orders. Can look up by formatted order ID (#ORD1000) with email verification, or show all orders for a customer. Provides detailed order info including status, fulfillment, and items.",
  schema: z.object({
    customer: z.string().optional().describe("Customer name to check orders for"),
    email: z.string().optional().describe("Customer email for verification"),
    orderIdFormatted: z.string().optional().describe("Formatted order ID to check (#ORD1000)"),
    query: z.string().describe("Natural language query about order status"),
  }),
  func: async ({ customer, email, orderIdFormatted, query }) => {
    try {
      const convexClient = getConvexClient();
      const lowerQuery = query.toLowerCase();

      // If specific formatted order ID is provided
      if (orderIdFormatted) {
        if (!email) {
          return "Email is required to verify and access order details.";
        }

        const order = await convexClient.query(api.orders.getOrderByFormattedIdAndEmail, {
          orderIdFormatted,
          email,
        }) as Order | null;

        if (!order) {
          return "Order not found or email doesn't match. Please check the order ID and email.";
        }

        return formatOrderDetails(order);
      }

      // Get all orders by customer name
      if (!customer) {
        return "Please provide either a customer name or formatted order ID with email.";
      }

      const orders = await convexClient.query(api.orders.getOrdersByCustomer, {
        customer,
      });

      if (!orders || orders.length === 0) {
        return "No orders found for this customer.";
      }

      if (lowerQuery.includes("recent") || lowerQuery.includes("latest")) {
        const recentOrder = orders[0]; // Orders sorted descending
        return formatOrderDetails(recentOrder);
      }

      const statusKeywords = ["pending", "fulfilled", "cancelled"];
      const requestedStatus = statusKeywords.find(status =>
        lowerQuery.includes(status)
      );

      if (requestedStatus) {
        const filteredOrders = orders.filter(
          order => order.status === requestedStatus
        );
        if (filteredOrders.length === 0) {
          return `No ${requestedStatus} orders found for this customer.`;
        }

        const ordersList = filteredOrders.map(order =>
          `Order ${order.orderIdFormatted}: ${order.status.toUpperCase()} - $${order.total.toFixed(2)}`
        ).join("\n");

        return `${requestedStatus.charAt(0).toUpperCase() + requestedStatus.slice(1)} orders:\n${ordersList}`;
      }

      // Show recent orders summary
      const ordersList = orders.slice(0, 10).map(order =>
        `Order ${order.orderIdFormatted}: ${order.status.toUpperCase()} - $${order.total.toFixed(2)}`
      ).join("\n");

      const more = orders.length > 10 ? `\n...and ${orders.length - 10} more` : "";
      return `Customer orders:\n${ordersList}${more}`;
    } catch (err) {
      console.error("Error checking order status:", err);
      return "An error occurred while retrieving the order. Please try again later.";
    }
  }
});

// 2. CANCEL ORDER TOOL (Updated to use formatted order ID)
export const cancelOrderTool = new DynamicStructuredTool({
  name: "cancelOrder",
  description:
    "Cancel an order using formatted order ID (#ORD1000) and email verification. Only pending and fulfilled orders can be cancelled before shipment.",
  schema: z.object({
    email: z.string().describe("Customer email for verification"),
    orderIdFormatted: z.string().describe("The formatted order ID to cancel (#ORD1000)"),
    reason: z.string().optional().describe("Optional reason for cancellation"),
  }),
  func: async ({ email, orderIdFormatted, reason }) => {
    try {
      const convexClient = getConvexClient();
      const order = await convexClient.query(api.orders.getOrderByFormattedIdAndEmail, {
        orderIdFormatted,
        email,
      }) as Order | null;

      if (!order) {
        return "Order not found or email doesn't match. Please check the order ID and email.";
      }

      if (order.status === "cancelled") return "This order is already cancelled.";
      if (order.fulfillment === "Shipped" || order.fulfillment === "Delivered") {
        return "This order has already been shipped or delivered and cannot be cancelled.";
      }

      await convexClient.mutation(api.orders.updateOrderStatus, {
        orderId: order._id as Id<"orders">,
        status: "cancelled",
      });

      return `Order ${orderIdFormatted} has been cancelled.${reason ? `\nReason: ${reason}` : ""}`;
    } catch (error) {
      console.error("Error cancelling order:", error);
      return "Failed to cancel the order. Please try again later.";
    }
  }
});

// 3. NEW: SEARCH ORDER TOOL (Using formatted order ID and email)
export const searchOrderTool = new DynamicStructuredTool({
  name: "searchOrder",
  description:
    "Search for a specific order using formatted order ID (#ORD1000) and email for verification.",
  schema: z.object({
    orderIdFormatted: z.string().describe("Formatted order ID (#ORD1000)"),
    email: z.string().describe("Customer email for verification"),
  }),
  func: async ({ orderIdFormatted, email }) => {
    try {
      const convexClient = getConvexClient();
      const order = await convexClient.query(api.orders.getOrderByFormattedIdAndEmail, {
        orderIdFormatted,
        email,
      }) as Order | null;

      if (!order) {
        return "Order not found or email doesn't match. Please check the order ID and email.";
      }

      return formatOrderDetails(order);
    } catch (error) {
      console.error("Error searching order:", error);
      return "Failed to search for the order. Please try again later.";
    }
  }
});

// 4. NEW: UPDATE ORDER QUANTITIES TOOL
export const updateOrderQuantitiesTool = new DynamicStructuredTool({
  name: "updateOrderQuantities",
  description:
    "Update product quantities in an order using formatted order ID (#ORD1000) and email verification. Automatically recalculates totals.",
  schema: z.object({
    orderIdFormatted: z.string().describe("Formatted order ID (#ORD1000)"),
    email: z.string().describe("Customer email for verification"),
    products: z.array(z.object({
      name: z.string().describe("Product name"),
      quantity: z.number().describe("New quantity"),
      price: z.number().describe("Product price per unit"),
    })).describe("Updated product list with new quantities"),
    updateReason: z.string().optional().describe("Reason for quantity update"),
  }),
  func: async ({ orderIdFormatted, email, products, updateReason }) => {
    try {
      const convexClient = getConvexClient();
      
      // First, find the order
      const order = await convexClient.query(api.orders.getOrderByFormattedIdAndEmail, {
        orderIdFormatted,
        email,
      }) as Order | null;

      if (!order) {
        return "Order not found or email doesn't match. Please check the order ID and email.";
      }

      if (order.status === "cancelled") {
        return "Cannot update quantities for a cancelled order.";
      }

      if (order.fulfillment === "Shipped" || order.fulfillment === "Delivered") {
        return "Cannot update quantities for an order that has already been shipped or delivered.";
      }

      // Update the quantities
             const result = await convexClient.mutation(api.orders.updateOrderQuantities, {
         orderId: order._id as Id<"orders">,
         products,
       });

      const reason = updateReason ? `\nReason: ${updateReason}` : "";
      return `✅ Order ${orderIdFormatted} quantities updated successfully!
New Total: $${result.newTotal.toFixed(2)}
New Items Count: ${result.newItemsCount}${reason}`;
    } catch (error) {
      console.error("Error updating order quantities:", error);
      return "Failed to update order quantities. Please try again later.";
    }
  }
});

// 5. NEW: UPDATE SHIPPING ADDRESS TOOL
export const updateShippingAddressTool = new DynamicStructuredTool({
  name: "updateShippingAddress",
  description:
    "Update shipping address for an order using formatted order ID (#ORD1000) and email verification.",
  schema: z.object({
    orderIdFormatted: z.string().describe("Formatted order ID (#ORD1000)"),
    email: z.string().describe("Customer email for verification"),
    newShippingAddress: z.string().describe("New shipping address"),
    updateReason: z.string().optional().describe("Reason for address update"),
  }),
  func: async ({ orderIdFormatted, email, newShippingAddress, updateReason }) => {
    try {
      const convexClient = getConvexClient();
      
      // First, find the order
      const order = await convexClient.query(api.orders.getOrderByFormattedIdAndEmail, {
        orderIdFormatted,
        email,
      }) as Order | null;

      if (!order) {
        return "Order not found or email doesn't match. Please check the order ID and email.";
      }

      if (order.status === "cancelled") {
        return "Cannot update shipping address for a cancelled order.";
      }

      if (order.fulfillment === "Shipped" || order.fulfillment === "Delivered") {
        return "Cannot update shipping address for an order that has already been shipped or delivered.";
      }

      // Update the shipping address
             await convexClient.mutation(api.orders.updateShippingAddress, {
         orderId: order._id as Id<"orders">,
         shippingAddress: newShippingAddress,
       });

      const reason = updateReason ? `\nReason: ${updateReason}` : "";
      return `✅ Order ${orderIdFormatted} shipping address updated successfully!
Old Address: ${order.shippingAddress}
New Address: ${newShippingAddress}${reason}`;
    } catch (error) {
      console.error("Error updating shipping address:", error);
      return "Failed to update shipping address. Please try again later.";
    }
  }
});

// 6. UPDATE ORDER TOOL (ADMIN/STAFF USE) - Updated to use formatted order ID
export const updateOrderTool = new DynamicStructuredTool({
  name: "updateOrder",
  description:
    "Update order status or shipping address using formatted order ID (#ORD1000). Used by admins to mark order as fulfilled, shipped, etc.",
  schema: z.object({
    orderIdFormatted: z.string().describe("Formatted order ID to update (#ORD1000)"),
    updates: z.object({
      status: z.enum(["pending", "fulfilled", "cancelled"]).optional(),
      fulfillment: z.enum(["Unfulfilled", "Shipped", "Delivered", "Cancelled", "Returned", "Refunded"]).optional(),
      shippingAddress: z.string().optional(),
      payment: z.enum(["pending", "paid", "refunded"]).optional(),
      trackingNumber: z.string().optional(),
    }),
    updateReason: z.string().optional(),
  }),
  func: async ({ orderIdFormatted, updates, updateReason }) => {
    try {
      const convexClient = getConvexClient();
      const order = await convexClient.query(api.orders.getOrderByFormattedId, {
        orderIdFormatted,
      }) as Order | null;

      if (!order) return "Order not found.";

      const changes: string[] = [];

      if (updates.status && updates.status !== order.status) {
        await convexClient.mutation(api.orders.updateOrderStatus, {
          orderId: order._id as Id<"orders">,
          status: updates.status,
        });
        changes.push(`Status: ${order.status} → ${updates.status}`);
      }

      if (updates.fulfillment && updates.fulfillment !== order.fulfillment) {
        await convexClient.mutation(api.orders.updateFulfillmentStatus, {
          orderId: order._id as Id<"orders">,
          fulfillment: updates.fulfillment,
        });
        changes.push(`Fulfillment: ${order.fulfillment} → ${updates.fulfillment}`);
      }

      if (updates.shippingAddress && updates.shippingAddress !== order.shippingAddress) {
        await convexClient.mutation(api.orders.updateShippingAddress, {
          orderId: order._id as Id<"orders">,
          shippingAddress: updates.shippingAddress,
        });
        changes.push("Shipping address updated.");
      }

      if (updates.payment && updates.payment !== order.payment) {
        await convexClient.mutation(api.orders.updatePaymentStatus, {
          orderId: order._id as Id<"orders">,
          payment: updates.payment,
        });
        changes.push(`Payment: ${order.payment} → ${updates.payment}`);
      }

      if (updates.trackingNumber && updates.trackingNumber !== order.trackingNumber) {
        await convexClient.mutation(api.orders.updateTrackingNumber, {
          orderId: order._id as Id<"orders">,
          trackingNumber: updates.trackingNumber,
        });
        changes.push(`Tracking number updated to ${updates.trackingNumber}`);
      }

      if (changes.length === 0) return "No updates were applied.";

      const reason = updateReason ? `\nReason: ${updateReason}` : "";
      return `✅ Order ${orderIdFormatted} updated:\n${changes.join("\n")}${reason}`;
    } catch (error) {
      console.error("Error updating order:", error);
      return "Failed to update the order. Please try again later.";
    }
  }
});

// FORMAT ORDER DETAILS (Updated to show formatted order ID)
function formatOrderDetails(order: Order): string {
  const items = order.products.map(p => `${p.quantity}x ${p.name} ($${p.price})`).join("\n");

  return `🧾 Order Summary:
Order ID: ${order.orderIdFormatted}
Customer: ${order.customer}
Email: ${order.email}
Status: ${order.status}
Fulfillment: ${order.fulfillment}
Tracking Number: ${order.trackingNumber}
Payment: ${order.payment}
Total: $${order.total.toFixed(2)}
Items: ${order.items}

📦 Products:
${items}

📍 Shipping Address:
${order.shippingAddress}`;
}