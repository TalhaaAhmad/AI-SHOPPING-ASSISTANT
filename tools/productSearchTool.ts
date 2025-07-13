import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod"; // Make sure to install 'zod' with: pnpm add zod

// Define the product type according to your updated Convex schema
interface Product {
  _id: string;
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

const productSearchTool = new DynamicStructuredTool({
  name: "searchProducts",
  description:
    "Handles natural language product queries: search, recommend, price lookup, brand filtering, category browsing, sale items, featured products, etc. Returns comprehensive product information including variants, ratings, and availability.",
  schema: z.object({
    query: z.string().describe("The user's natural language product query"),
  }),
  func: async ({ query }: { query: string }) => {
    const convexClient = getConvexClient();
    // Fetch all products from Convex
    const products = (await convexClient.query(api.products.getAllProducts, {})) as Product[];
    const lowerQuery = query.toLowerCase();

    // Helper function to format product info
    const formatProduct = (p: Product): string => {
      const currency = p.currency || "USD";
      const price = formatPrice(p.price, currency);
      const originalPrice = p.originalPrice ? formatPrice(p.originalPrice, currency) : null;
      const discount = p.originalPrice ? getDiscountPercentage(p.price, p.originalPrice) : 0;
      
      let result = `${p.name} - ${price}`;
      if (originalPrice && discount > 0) {
        result += ` (was ${originalPrice}, ${discount}% off)`;
      }
      
      result += ` - ${p.category}`;
      if (p.subcategory) result += ` > ${p.subcategory}`;
      if (p.brand) result += ` by ${p.brand}`;
      
      // Stock info
      if (p.trackInventory && p.stockQuantity !== undefined) {
        result += ` - ${p.stockQuantity} in stock`;
      } else {
        result += ` - ${p.inStock ? "In stock" : "Out of stock"}`;
      }
      
      // Rating and reviews
      if (p.rating && p.reviewCount) {
        result += ` - ${p.rating}★ (${p.reviewCount} reviews)`;
      }
      
      // Featured indicator
      if (p.featured) result += " - ⭐ Featured";
      
      // Variants info
      if (p.hasVariants && p.variants?.length) {
        result += ` - ${p.variants.length} variants available`;
      }
      
      return result;
    };

    // Helper function to format price
    const formatPrice = (price: number, currency: string = 'USD'): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(price);
    };

    // Helper function to calculate discount percentage
    const getDiscountPercentage = (price: number, originalPrice: number): number => {
      if (originalPrice <= price) return 0;
      return Math.round(((originalPrice - price) / originalPrice) * 100);
    };

    // Filter active products only
    const activeProducts = products.filter((p: Product) => p.status === "active");

    // Price lookup: "price of X"
    const priceMatch = lowerQuery.match(/price of ([\w\s]+)/);
    if (priceMatch) {
      const name = priceMatch[1].trim();
      const found = activeProducts.find((p: Product) => 
        p.name.toLowerCase().includes(name) || 
        p.slug?.toLowerCase().includes(name.replace(/\s+/g, '-'))
      );
      if (found) {
        return formatProduct(found);
      }
      return "Sorry, I couldn't find that product.";
    }

    // Sale/discount items
    if (lowerQuery.includes("sale") || lowerQuery.includes("discount") || lowerQuery.includes("deal")) {
      const saleItems = activeProducts.filter((p: Product) => 
        p.originalPrice && p.originalPrice > p.price
      );
      if (saleItems.length) {
        return saleItems.map(formatProduct).join("\n");
      }
      return "No sale items found at the moment.";
    }

    // Featured products
    if (lowerQuery.includes("featured") || lowerQuery.includes("popular") || lowerQuery.includes("best")) {
      const featuredItems = activeProducts.filter((p: Product) => p.featured);
      if (featuredItems.length) {
        return featuredItems.map(formatProduct).join("\n");
      }
      return "No featured products found.";
    }

    // Brand search
    const brandMatch = lowerQuery.match(/(?:from|by|brand) ([\w\s]+)/);
    if (brandMatch) {
      const brand = brandMatch[1].trim();
      const brandProducts = activeProducts.filter((p: Product) => 
        p.brand?.toLowerCase().includes(brand)
      );
      if (brandProducts.length) {
        return brandProducts.map(formatProduct).join("\n");
      }
      return `No products found from brand "${brand}".`;
    }

    // Category search
    const categoryMatch = lowerQuery.match(/(?:in|category) ([\w\s]+)/);
    if (categoryMatch) {
      const category = categoryMatch[1].trim();
      const categoryProducts = activeProducts.filter((p: Product) => 
        p.category.toLowerCase().includes(category) ||
        p.subcategory?.toLowerCase().includes(category)
      );
      if (categoryProducts.length) {
        return categoryProducts.map(formatProduct).join("\n");
      }
      return `No products found in category "${category}".`;
    }

    // Price range search
    const priceRangeMatch = lowerQuery.match(/(?:under|below|less than) \$?(\d+)/);
    if (priceRangeMatch) {
      const maxPrice = parseInt(priceRangeMatch[1]);
      const affordableProducts = activeProducts.filter((p: Product) => p.price <= maxPrice);
      if (affordableProducts.length) {
        return affordableProducts
          .sort((a, b) => a.price - b.price)
          .map(formatProduct)
          .join("\n");
      }
      return `No products found under $${maxPrice}.`;
    }

    // Recommend for traveling or by category/tag
    if (lowerQuery.includes("recommend")) {
      // Try to extract a category or tag
      const travelKeywords = ["travel", "trip", "vacation", "journey", "portable"];
      const foundKeyword = travelKeywords.find(k => lowerQuery.includes(k));
      let recommended: Product[] = [];
      
      if (foundKeyword) {
        recommended = activeProducts.filter(
          (p: Product) =>
            p.category.toLowerCase().includes(foundKeyword) ||
            p.subcategory?.toLowerCase().includes(foundKeyword) ||
            p.tags.some((tag: string) => tag.toLowerCase().includes(foundKeyword)) ||
            p.description.toLowerCase().includes(foundKeyword) ||
            p.attributes?.some(attr => 
              attr.name.toLowerCase().includes(foundKeyword) || 
              attr.value.toLowerCase().includes(foundKeyword)
            )
        );
      } else {
        // Fallback: recommend featured products or high-rated products
        recommended = activeProducts.filter((p: Product) => 
          p.featured || (p.rating && p.rating >= 4)
        );
      }
      
      if (recommended.length) {
        return recommended
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 5)
          .map(formatProduct)
          .join("\n");
      }
      return "Sorry, I couldn't find any suitable recommendations.";
    }

    // General search by product/category/tag/description/attributes
    const searchWords = lowerQuery.match(/\w+/g) || [];
    const found = activeProducts.filter((p: Product) =>
      searchWords.some(
        (w: string) =>
          p.name.toLowerCase().includes(w) ||
          p.category.toLowerCase().includes(w) ||
          p.subcategory?.toLowerCase().includes(w) ||
          p.brand?.toLowerCase().includes(w) ||
          p.tags.some((tag: string) => tag.toLowerCase().includes(w)) ||
          p.description.toLowerCase().includes(w) ||
          p.shortDescription?.toLowerCase().includes(w) ||
          p.attributes?.some(attr => 
            attr.name.toLowerCase().includes(w) || 
            attr.value.toLowerCase().includes(w)
          )
      )
    );

    if (found.length) {
      return found
        .sort((a, b) => {
          // Sort by featured first, then by rating, then by sales count
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
          return (b.salesCount || 0) - (a.salesCount || 0);
        })
        .slice(0, 10)
        .map(formatProduct)
        .join("\n");
    }

    // Fallback: show featured or in-stock products
    const fallbackProducts = activeProducts.filter((p: Product) => 
      p.featured || p.inStock
    );
    
    if (fallbackProducts.length) {
      return fallbackProducts
        .sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.salesCount || 0) - (a.salesCount || 0);
        })
        .slice(0, 5)
        .map(formatProduct)
        .join("\n");
    }
    
    return "No products found.";
  },
});

export default productSearchTool;