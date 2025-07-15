import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Product Schema helper functions

// Helper types for better TypeScript support
export type ProductStatus = "active" | "inactive" | "discontinued" | "draft";

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: string;
}

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface ProductVariant {
  name: string;
  value: string;
  price?: number;
  sku?: string;
  stockQuantity?: number;
  imageUrl?: string;
}

// Validation helpers
export const validateProduct = (product: any) => {
  const errors: string[] = [];

  // Required fields
  if (!product.name?.trim()) errors.push("Product name is required");
  if (!product.description?.trim()) errors.push("Product description is required");
  if (typeof product.price !== 'number' || product.price < 0) errors.push("Valid price is required");
  if (!product.imageUrl?.trim()) errors.push("Product image is required");
  if (!product.category?.trim()) errors.push("Product category is required");

  // Price validation
  if (product.originalPrice && product.originalPrice < product.price) {
    errors.push("Original price should be higher than current price");
  }

  // Stock validation
  if (product.trackInventory && typeof product.stockQuantity !== 'number') {
    errors.push("Stock quantity is required when tracking inventory");
  }

  // SKU uniqueness (would need to be checked at database level)
  if (product.sku && !/^[A-Za-z0-9-_]+$/.test(product.sku)) {
    errors.push("SKU can only contain letters, numbers, hyphens, and underscores");
  }

  // Dimensions validation
  if (product.dimensions) {
    const { length, width, height } = product.dimensions;
    if (length <= 0 || width <= 0 || height <= 0) {
      errors.push("All dimensions must be positive numbers");
    }
  }

  return errors;
};

// Default values helper
export const getDefaultProductValues = () => ({
  status: "draft" as ProductStatus,
  inStock: true,
  currency: "USD",
  trackInventory: false,
  shippingRequired: true,
  hasVariants: false,
  featured: false,
  viewCount: 0,
  salesCount: 0,
  reviewCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});


// Complaint status types
export const complaintStatus = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("resolved"),
  v.literal("escalated")
);

export const complaintType = v.union(
  v.literal("return"),
  v.literal("exchange"),
  v.literal("refund"),
  v.literal("damaged_item"),
  v.literal("wrong_item"),
  v.literal("missing_item"),
  v.literal("defective_item"),
  v.literal("late_delivery"),
  v.literal("poor_quality"),
  v.literal("warranty_claim"),
  v.literal("billing_issue"),
  v.literal("shipping_issue"),
  v.literal("customer_service"),
  v.literal("other")
);

export const resolutionType = v.union(
  v.literal("full_refund"),
  v.literal("partial_refund"),
  v.literal("store_credit"),
  v.literal("replacement"),
  v.literal("exchange"),
  v.literal("repair"),
  v.literal("compensation"),
  v.literal("apology"),
  v.literal("policy_explanation"),
  v.literal("no_action")
);

export const urgencyLevel = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical")
);



// Product search and filter utilities
export const createProductSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const formatPrice = (price: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

export const isProductOnSale = (price: number, originalPrice?: number): boolean => {
  return originalPrice !== undefined && originalPrice > price;
};

export const getDiscountPercentage = (price: number, originalPrice: number): number => {
  if (originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
};

// Order status types
export const orderStatus = v.union(
  v.literal("pending"),
  v.literal("fulfilled"),
  v.literal("cancelled")
);

export const paymentStatus = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("refunded")
);

export const fulfillmentStatus = v.union(
  v.literal("Unfulfilled"),
  v.literal("Shipped"),
  v.literal("Delivered"),
  v.literal("Cancelled"),
  v.literal("Returned"),
  v.literal("Refunded")
);

export default defineSchema({
  chats: defineTable({
    title: v.string(),
    userId: v.string(),
    createdAt: v.number(),
    // Clerk authentication fields
    username: v.optional(v.string()), // Display name/username
    email: v.optional(v.string()), // User email
    
    // Optional: Additional user info from Clerk
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()), // Profile picture URL
    
    // Additional user metadata
    userAgent: v.optional(v.string()), // Browser/device info
    ipAddress: v.optional(v.string()), // IP address (if needed)
    timezone: v.optional(v.string()), // User's timezone
    language: v.optional(v.string()), // User's language preference
  })
  .index("by_user", ["userId"])
  .index("by_email", ["email"]),

  messages: defineTable({
    chatId: v.id("chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    createdAt: v.number(),
    // Support for image attachments
    attachments: v.optional(v.array(v.object({
      type: v.literal("image"),
      url: v.string(),
      filename: v.string(),
      size: v.optional(v.number()),
      mimeType: v.optional(v.string()),
    }))),
  }).index("by_chat", ["chatId"]),

  products: defineTable({
    // Basic product information
    name: v.string(),
    description: v.string(),
    shortDescription: v.optional(v.string()), // Brief summary for listings
    
    // Pricing and inventory
    price: v.number(),
    originalPrice: v.optional(v.number()), // For sale pricing
    costPrice: v.optional(v.number()), // For profit margin calculations
    currency: v.optional(v.string()), // Default to USD if not specified
    
    // Inventory management
    inStock: v.boolean(),
    stockQuantity: v.optional(v.number()), // Actual stock count
    lowStockThreshold: v.optional(v.number()), // Alert when stock is low
    trackInventory: v.optional(v.boolean()), // Whether to track inventory
    
    // Product organization
    category: v.string(),
    subcategory: v.optional(v.string()),
    brand: v.optional(v.string()),
    tags: v.array(v.string()),
    
    // Media and presentation
    imageUrl: v.string(),
    imageUrls: v.optional(v.array(v.string())), // Multiple product images
    videoUrl: v.optional(v.string()),
    
    // Product specifications
    sku: v.optional(v.string()), // Stock Keeping Unit
    barcode: v.optional(v.string()),
    weight: v.optional(v.number()), // In grams
    dimensions: v.optional(v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
      unit: v.string(), // "cm", "inches", etc.
    })),
    
    // Product attributes (flexible key-value pairs)
    attributes: v.optional(v.array(v.object({
      name: v.string(),
      value: v.string(),
    }))),
    
    // SEO and marketing
    slug: v.optional(v.string()), // URL-friendly version of name
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    
    // Product status and visibility
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("discontinued"),
      v.literal("draft")
    ),
    featured: v.optional(v.boolean()),
    
    // Shipping information
    shippingRequired: v.optional(v.boolean()),
    shippingWeight: v.optional(v.number()),
    shippingDimensions: v.optional(v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
      unit: v.string(),
    })),
    
    // Product variants (for products with different options)
    hasVariants: v.optional(v.boolean()),
    variants: v.optional(v.array(v.object({
      name: v.string(), // e.g., "Color", "Size"
      value: v.string(), // e.g., "Red", "Large"
      price: v.optional(v.number()), // Price modifier
      sku: v.optional(v.string()),
      stockQuantity: v.optional(v.number()),
      imageUrl: v.optional(v.string()),
    }))),
    
    // Analytics and performance
    viewCount: v.optional(v.number()),
    salesCount: v.optional(v.number()),
    rating: v.optional(v.number()), // Average rating
    reviewCount: v.optional(v.number()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    
    // Admin fields
    createdBy: v.optional(v.string()), // User ID who created the product
    updatedBy: v.optional(v.string()), // User ID who last updated
    
    // Additional metadata
    notes: v.optional(v.string()), // Internal notes
    externalId: v.optional(v.string()), // For integration with external systems
  })
    // Indexes for efficient querying
    .index("by_category", ["category"])
    .index("by_brand", ["brand"])
    .index("by_status", ["status"])
    .index("by_featured", ["featured"])
    .index("by_category_status", ["category", "status"])
    .index("by_brand_category", ["brand", "category"])
    .index("by_price", ["price"])
    .index("by_stock", ["inStock"])
    .index("by_created", ["createdAt"])
    .index("by_updated", ["updatedAt"])
    .index("by_sku", ["sku"])
    .index("by_slug", ["slug"])
    // Search indexes
    .searchIndex("search_products", {
      searchField: "name",
      filterFields: ["category", "brand", "status", "inStock"]
    })
    .searchIndex("search_description", {
      searchField: "description",
      filterFields: ["category", "status"]
    })
    .searchIndex("search_tags", {
      searchField: "tags",
      filterFields: ["category", "status"]
    }),

  orders: defineTable({
    orderIdFormatted: v.string(),  // Add this field
    customer: v.string(),
    email: v.string(),
    status: orderStatus,
    payment: paymentStatus,
    total: v.number(),
    items: v.number(),
    fulfillment: fulfillmentStatus,
    shippingAddress: v.string(),
    trackingNumber: v.optional(v.string()),
    returnStatus: v.optional(v.string()), // Add this field
    chatId: v.optional(v.id("chats")),
    products: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        price: v.number(),
        sku: v.optional(v.string()),      // NEW
        brand: v.optional(v.string()),    // NEW
        productId: v.optional(v.id("products")), // NEW - for reference
      })
    ),
  }).index("by_status", ["status"])
    .index("by_payment", ["payment"])
    .index("by_customer", ["customer"])
    .index("by_orderIdFormatted", ["orderIdFormatted"])
    .searchIndex("search_orders", {
      searchField: "customer",
      filterFields: ["status", "payment"]
    }),
  
  users: defineTable({
    userId: v.string(),         // e.g. "USR001"
    clerkUserId: v.string(),    // e.g. "user_abc123"
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_clerkUserId", ["clerkUserId"]),


  complaints: defineTable({
    complaintId: v.string(),
    orderId: v.string(),
    customerEmail: v.string(),
    complaintType: complaintType,
    description: v.string(),
    affectedProducts: v.array(v.string()),
    hasEvidence: v.boolean(),
    preferredResolution: v.optional(resolutionType),
    suggestedResolution: resolutionType,
    status: complaintStatus,
    urgency: urgencyLevel,
    resolutionDetails: v.string(),
    compensationAmount: v.number(),
    
    // Resolution tracking
    resolvedAt: v.optional(v.number()),
    resolutionNotes: v.optional(v.string()),
    assignedTo: v.optional(v.string()), // Staff member handling the complaint
    
    // Communication tracking
    customerNotified: v.optional(v.boolean()),
    internalNotes: v.optional(v.string()),
    
    // Evidence tracking
    evidenceUrls: v.optional(v.array(v.string())), // URLs to uploaded evidence
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    
    // Admin fields
    createdBy: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
  })
    .index("by_order", ["orderId"])
    .index("by_customer", ["customerEmail"])
    .index("by_status", ["status"])
    .index("by_type", ["complaintType"])
    .index("by_urgency", ["urgency"])
    .index("by_created", ["createdAt"])
    .index("by_complaint_id", ["complaintId"])
    .searchIndex("search_complaints", {
      searchField: "description",
      filterFields: ["complaintType", "status", "urgency"]
    }),


  counters: defineTable({
    name: v.string(),   // e.g., "order"
    value: v.number(),  // e.g., 1000, 1001, ...
  }).index("by_name", ["name"]),

  whatsapp_chats: defineTable({
    contact_name: v.string(), // WhatsApp number (unique per chat)
    createdAt: v.number(),
    name: v.optional(v.string()),
    // Optional: add more metadata fields as needed
    // e.g., lastMessageAt: v.optional(v.number()),
    // e.g., chatTitle: v.optional(v.string()),
  }).index("by_contact_name", ["contact_name"]),

  whatsapp_messages: defineTable({
    chatId: v.id("whatsapp_chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    createdAt: v.number(),
    // WhatsApp-specific metadata
    sender_name: v.optional(v.string()),
    message_type: v.optional(v.string()),
    direction: v.optional(v.string()),
    hour: v.optional(v.string()),
    my_number: v.optional(v.string()),
    media: v.optional(v.string()),
    keyword: v.optional(v.string()),
    filename: v.optional(v.string()),
    group_flag: v.optional(v.string()),
    scan_number: v.optional(v.string()),
    quote_message: v.optional(v.string()),
    quote_from: v.optional(v.string()),
    quote_name: v.optional(v.string()),
  }).index("by_chat", ["chatId"]),
});