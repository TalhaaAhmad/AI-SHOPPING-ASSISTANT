import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

// Updated Product interface to match the new schema
interface Product {
  _id: Id<"products">;
  name: string;
  description: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  currency?: string;
  inStock: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  category: string;
  subcategory?: string;
  brand?: string;
  tags: string[];
  imageUrl: string;
  imageUrls?: string[];
  videoUrl?: string;
  sku?: string;
  barcode?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  attributes?: Array<{
    name: string;
    value: string;
  }>;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  status: "active" | "inactive" | "discontinued" | "draft";
  featured?: boolean;
  shippingRequired?: boolean;
  shippingWeight?: number;
  shippingDimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  hasVariants?: boolean;
  variants?: Array<{
    name: string;
    value: string;
    price?: number;
    sku?: string;
    stockQuantity?: number;
    imageUrl?: string;
  }>;
  viewCount?: number;
  salesCount?: number;
  rating?: number;
  reviewCount?: number;
  createdAt: number;
  updatedAt?: number;
  publishedAt?: number;
  createdBy?: string;
  updatedBy?: string;
  notes?: string;
  externalId?: string;
}

const orderTakingTool = new DynamicStructuredTool({
  name: "takeOrder",
  description: "Handles order creation. Accepts natural language orders with multiple products and shipping address.",
  schema: z.object({
    customer: z.string().describe("Customer full name"),
    email: z.string().email().describe("Customer email address"),
    orderRequest: z.string().describe("Natural language order request with multiple product names and quantities (e.g., '2 laptops, 1 mouse, 3 keyboards')"),
    shippingAddress: z.object({
      street: z.string(),
      city: z.string(),
      zip: z.string(),
      country: z.string()
    }),
  }),
  func: async ({ customer, email, orderRequest, shippingAddress }) => {
    try {
      const convexClient = getConvexClient();

      const allProducts = (await convexClient.query(api.products.getAllProducts, {})) as Product[];
      
      // Filter only active products
      const products = allProducts.filter(p => p.status === "active");
      
      if (!products.length) {
        return "No products are available at the moment.";
      }

      const orderItems = parseOrderRequest(orderRequest, products);
      if (orderItems.length === 0) {
        return "❌ No valid products found in the order request. Please check product names and try again.";
      }

      // Enhanced stock checking with inventory tracking
      const unavailableItems = orderItems.filter(item => {
        if (!item.product.inStock) return true;
        
        // If inventory tracking is enabled, check actual stock quantity
        if (item.product.trackInventory && item.product.stockQuantity !== undefined) {
          return item.product.stockQuantity < item.quantity;
        }
        
        return false;
      });

      if (unavailableItems.length > 0) {
        const itemDetails = unavailableItems.map(item => {
          const stockInfo = item.product.trackInventory && item.product.stockQuantity !== undefined
            ? `(${item.product.stockQuantity} available, ${item.quantity} requested)`
            : "(out of stock)";
          return `${item.product.name} ${stockInfo}`;
        }).join(", ");
        
        return `❌ The following items are not available: ${itemDetails}. Please adjust quantities or remove unavailable items.`;
      }

      // Calculate totals with currency support
      const currency = products[0]?.currency || "USD";
      const total = orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const itemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const shippingAddressString = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.zip}, ${shippingAddress.country}`;

      // Enhanced order products with more details
      const orderProducts = orderItems.map(item => ({
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        sku: item.product.sku,
        brand: item.product.brand,
      }));

      // Create the order
      const { orderIdFormatted } = await convexClient.mutation(api.orders.createOrder, {
        customer,
        email,
        status: "pending",
        payment: "pending",
        fulfillment: "Unfulfilled",
        shippingAddress: shippingAddressString,
        products: orderProducts,
      });

      // Enhanced items summary with more product details
      const itemsSummary = orderItems.map(item => {
        const priceFormatted = formatPrice(item.product.price, currency);
        const totalFormatted = formatPrice(item.product.price * item.quantity, currency);
        const brandInfo = item.product.brand ? ` by ${item.product.brand}` : "";
        const skuInfo = item.product.sku ? ` (SKU: ${item.product.sku})` : "";
        
        return `  • ${item.quantity}x ${item.product.name}${brandInfo} - ${priceFormatted} each = ${totalFormatted}${skuInfo}`;
      }).join("\n");

      const totalFormatted = formatPrice(total, currency);

      return `✅ Order Created Successfully!

📋 Order Details:
Order ID: ${orderIdFormatted}
Customer: ${customer}

📦 Items (${itemsCount} total):
${itemsSummary}

💰 Total: ${totalFormatted}
📍 Status: Pending Payment
🚚 Shipping to: ${shippingAddressString}

Thank you for your order! You'll receive a confirmation email shortly.`;
    } catch (err) {
      console.error("Order creation failed:", err);
      return "❌ Failed to process the order. Please try again later or contact support.";
    }
  }
});

// Helper function to format price with currency
function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

// Enhanced helper function to parse natural language with better multi-product support
function parseOrderRequest(orderRequest: string, products: Product[]): Array<{ product: Product; quantity: number }> {
  const orderItems: Array<{ product: Product; quantity: number }> = [];
  const lowerRequest = orderRequest.toLowerCase();

  // Split by common separators for multiple items
  const itemParts = lowerRequest.split(/[,;]|(?:\s+and\s+)|(?:\s+\+\s+)/).map(part => part.trim());

  const numberWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    a: 1, an: 1
  };

  // Enhanced patterns for better parsing
  const patterns = [
    // Standard patterns like "2 laptops", "5x mice", "3 * keyboards"
    /(\d+)\s*[x*×]\s*(.+)/gi,
    /(\d+)\s+(.+)/gi,
    // Word numbers like "three laptops", "five keyboards"
    /(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|a|an)\s+(.+)/gi,
    // Just product names without quantities (defaults to 1)
    /^(?!.*\d)(.+)$/gi
  ];

  for (const part of itemParts) {
    if (!part.trim()) continue;

    let foundMatch = false;

    for (const pattern of patterns) {
      pattern.lastIndex = 0; // Reset regex state
      const match = pattern.exec(part);
      
      if (match) {
        let quantity = 1;
        let productName = '';

        if (match[1] && match[2]) {
          // Has quantity and product name
          const quantityStr = match[1].toLowerCase();
          quantity = parseInt(quantityStr) || numberWords[quantityStr] || 1;
          productName = match[2].trim();
        } else if (match[1] && !match[2]) {
          // Just product name, no quantity
          productName = match[1].trim();
          quantity = 1;
        }

        if (quantity > 0 && productName) {
          // Clean up product name (remove plurals, extra words)
          const cleanProductName = productName
            .replace(/s$/, '') // Remove plural 's'
            .replace(/\b(the|a|an)\b/g, '') // Remove articles
            .trim();

          // Find matching product with improved fuzzy matching
          const product = findBestProductMatch(cleanProductName, products);
          
          if (product) {
            const existing = orderItems.find(i => i.product._id === product._id);
            if (existing) {
              existing.quantity += quantity;
            } else {
              orderItems.push({ product, quantity });
            }
            foundMatch = true;
            break; // Stop trying other patterns for this part
          }
        }
      }
    }

    // If no pattern matched, try simple substring matching
    if (!foundMatch) {
      const product = findBestProductMatch(part, products);
      if (product) {
        const existing = orderItems.find(i => i.product._id === product._id);
        if (existing) {
          existing.quantity += 1;
        } else {
          orderItems.push({ product, quantity: 1 });
        }
      }
    }
  }

  return orderItems;
}

// Enhanced product matching function with new schema fields
function findBestProductMatch(searchTerm: string, products: Product[]): Product | null {
  const lowerSearchTerm = searchTerm.toLowerCase().trim();
  
  if (!lowerSearchTerm) return null;

  // 1. Exact name match
  let match = products.find(p => p.name.toLowerCase() === lowerSearchTerm);
  if (match) return match;

  // 2. Exact slug match
  match = products.find(p => p.slug?.toLowerCase() === lowerSearchTerm);
  if (match) return match;

  // 3. Exact SKU match
  match = products.find(p => p.sku?.toLowerCase() === lowerSearchTerm);
  if (match) return match;

  // 4. Exact name match (without plural)
  const singularSearch = lowerSearchTerm.replace(/s$/, '');
  match = products.find(p => p.name.toLowerCase() === singularSearch);
  if (match) return match;

  // 5. Product name contains search term
  match = products.find(p => p.name.toLowerCase().includes(lowerSearchTerm));
  if (match) return match;

  // 6. Search term contains product name
  match = products.find(p => lowerSearchTerm.includes(p.name.toLowerCase()));
  if (match) return match;

  // 7. Brand matching
  match = products.find(p => 
    p.brand?.toLowerCase().includes(lowerSearchTerm) || 
    (p.brand && lowerSearchTerm.includes(p.brand.toLowerCase()))
  );
  if (match) return match;

  // 8. Tag matching
  match = products.find(p => 
    p.tags.some(tag => 
      tag.toLowerCase().includes(lowerSearchTerm) || 
      lowerSearchTerm.includes(tag.toLowerCase())
    )
  );
  if (match) return match;

  // 9. Category and subcategory matching
  match = products.find(p => 
    p.category.toLowerCase().includes(lowerSearchTerm) || 
    lowerSearchTerm.includes(p.category.toLowerCase()) ||
    (p.subcategory && (
      p.subcategory.toLowerCase().includes(lowerSearchTerm) || 
      lowerSearchTerm.includes(p.subcategory.toLowerCase())
    ))
  );
  if (match) return match;

  // 10. Description matching
  match = products.find(p => 
    p.description.toLowerCase().includes(lowerSearchTerm) ||
    (p.shortDescription && p.shortDescription.toLowerCase().includes(lowerSearchTerm))
  );
  if (match) return match;

  // 11. Attributes matching
  match = products.find(p => 
    p.attributes?.some(attr => 
      attr.name.toLowerCase().includes(lowerSearchTerm) || 
      attr.value.toLowerCase().includes(lowerSearchTerm) ||
      lowerSearchTerm.includes(attr.name.toLowerCase()) ||
      lowerSearchTerm.includes(attr.value.toLowerCase())
    )
  );
  if (match) return match;

  // 12. Variant matching
  match = products.find(p => 
    p.variants?.some(variant => 
      variant.name.toLowerCase().includes(lowerSearchTerm) || 
      variant.value.toLowerCase().includes(lowerSearchTerm) ||
      lowerSearchTerm.includes(variant.name.toLowerCase()) ||
      lowerSearchTerm.includes(variant.value.toLowerCase())
    )
  );
  if (match) return match;

  // 13. Fuzzy matching for common variations
  const commonVariations: Record<string, string[]> = {
    'laptop': ['computer', 'notebook', 'pc'],
    'mouse': ['mice'],
    'keyboard': ['keys'],
    'phone': ['mobile', 'smartphone', 'cell'],
    'tablet': ['ipad', 'pad'],
    'headphone': ['headset', 'earphone', 'earbud'],
    'monitor': ['screen', 'display'],
    'charger': ['cable', 'adapter'],
  };

  for (const [key, variations] of Object.entries(commonVariations)) {
    if (lowerSearchTerm.includes(key) || variations.some(v => lowerSearchTerm.includes(v))) {
      match = products.find(p => 
        p.name.toLowerCase().includes(key) || 
        variations.some(v => p.name.toLowerCase().includes(v)) ||
        p.tags.some(tag => 
          tag.toLowerCase().includes(key) || 
          variations.some(v => tag.toLowerCase().includes(v))
        )
      );
      if (match) return match;
    }
  }

  return null;
}

export default orderTakingTool;