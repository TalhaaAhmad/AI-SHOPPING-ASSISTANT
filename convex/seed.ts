import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper function to create product slug
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Helper function to generate random stock quantity
const randomStock = () => Math.floor(Math.random() * 100) + 1;

// Helper function to generate random price
const randomPrice = (min: number, max: number) => 
  Math.floor((Math.random() * (max - min) + min) * 100) / 100;

// Helper function to generate random rating
const randomRating = () => Math.floor(Math.random() * 50) / 10 + 3; // 3.0 to 5.0

// Product seed data
const productSeedData = [
  // Electronics - Laptops
  {
    name: "MacBook Pro 16-inch",
    description: "Powerful laptop with M2 Pro chip, perfect for professional work and creative tasks. Features stunning Retina display and all-day battery life.",
    shortDescription: "Professional laptop with M2 Pro chip",
    price: 2499.99,
    originalPrice: 2799.99,
    category: "Electronics",
    subcategory: "Laptops",
    brand: "Apple",
    tags: ["laptop", "professional", "creative", "m2", "retina"],
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
    attributes: [
      { name: "Screen Size", value: "16 inches" },
      { name: "Processor", value: "Apple M2 Pro" },
      { name: "RAM", value: "16GB" },
      { name: "Storage", value: "512GB SSD" }
    ]
  },
  {
    name: "Dell XPS 13",
    description: "Ultra-portable laptop with stunning InfinityEdge display and premium build quality. Perfect for business and everyday use.",
    shortDescription: "Ultra-portable business laptop",
    price: 1299.99,
    category: "Electronics",
    subcategory: "Laptops",
    brand: "Dell",
    tags: ["laptop", "business", "portable", "windows"],
    imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
    attributes: [
      { name: "Screen Size", value: "13.4 inches" },
      { name: "Processor", value: "Intel Core i7" },
      { name: "RAM", value: "16GB" },
      { name: "Storage", value: "512GB SSD" }
    ]
  },
  {
    name: "Lenovo ThinkPad X1 Carbon",
    description: "Business-grade laptop with military-grade durability and exceptional keyboard. Built for professionals who demand reliability.",
    shortDescription: "Business laptop with military-grade durability",
    price: 1899.99,
    category: "Electronics",
    subcategory: "Laptops",
    brand: "Lenovo",
    tags: ["laptop", "business", "durable", "thinkpad"],
    imageUrl: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800",
    attributes: [
      { name: "Screen Size", value: "14 inches" },
      { name: "Processor", value: "Intel Core i7" },
      { name: "RAM", value: "16GB" },
      { name: "Storage", value: "1TB SSD" }
    ]
  },
  {
    name: "ASUS ROG Gaming Laptop",
    description: "High-performance gaming laptop with RGB lighting and advanced cooling. Designed for serious gamers and enthusiasts.",
    shortDescription: "High-performance gaming laptop",
    price: 2199.99,
    category: "Electronics",
    subcategory: "Laptops",
    brand: "ASUS",
    tags: ["laptop", "gaming", "rgb", "high-performance"],
    imageUrl: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800",
    attributes: [
      { name: "Screen Size", value: "15.6 inches" },
      { name: "Processor", value: "Intel Core i9" },
      { name: "RAM", value: "32GB" },
      { name: "Graphics", value: "RTX 4070" }
    ]
  },
  {
    name: "HP Spectre x360",
    description: "Convertible laptop with 360-degree hinge and touch screen. Perfect blend of style and functionality.",
    shortDescription: "Convertible laptop with touch screen",
    price: 1599.99,
    category: "Electronics",
    subcategory: "Laptops",
    brand: "HP",
    tags: ["laptop", "convertible", "touchscreen", "2-in-1"],
    imageUrl: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800",
    attributes: [
      { name: "Screen Size", value: "13.5 inches" },
      { name: "Processor", value: "Intel Core i7" },
      { name: "RAM", value: "16GB" },
      { name: "Storage", value: "512GB SSD" }
    ]
  },

  // Electronics - Smartphones
  {
    name: "iPhone 15 Pro",
    description: "Latest iPhone with titanium design and A17 Pro chip. Features professional camera system and Action Button.",
    shortDescription: "Latest iPhone with titanium design",
    price: 1199.99,
    category: "Electronics",
    subcategory: "Smartphones",
    brand: "Apple",
    tags: ["smartphone", "iphone", "titanium", "professional"],
    imageUrl: "https://images.unsplash.com/photo-1592286499516-f8e1f4f12e63?w=800",
    hasVariants: true,
    variants: [
      { name: "Color", value: "Natural Titanium", stockQuantity: 50 },
      { name: "Color", value: "Blue Titanium", stockQuantity: 30 },
      { name: "Color", value: "White Titanium", stockQuantity: 25 }
    ]
  },
  {
    name: "Samsung Galaxy S24 Ultra",
    description: "Premium Android smartphone with S Pen and incredible camera capabilities. Perfect for productivity and creativity.",
    shortDescription: "Premium Android phone with S Pen",
    price: 1299.99,
    category: "Electronics",
    subcategory: "Smartphones",
    brand: "Samsung",
    tags: ["smartphone", "android", "s-pen", "camera"],
    imageUrl: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800",
    hasVariants: true,
    variants: [
      { name: "Color", value: "Titanium Gray", stockQuantity: 40 },
      { name: "Color", value: "Titanium Black", stockQuantity: 35 }
    ]
  },
  {
    name: "Google Pixel 8 Pro",
    description: "AI-powered smartphone with incredible computational photography and pure Android experience.",
    shortDescription: "AI-powered smartphone with great camera",
    price: 999.99,
    category: "Electronics",
    subcategory: "Smartphones",
    brand: "Google",
    tags: ["smartphone", "android", "ai", "camera", "pixel"],
    imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
    attributes: [
      { name: "Screen Size", value: "6.7 inches" },
      { name: "Processor", value: "Google Tensor G3" },
      { name: "RAM", value: "12GB" },
      { name: "Storage", value: "128GB" }
    ]
  },
  {
    name: "OnePlus 12",
    description: "Flagship killer with fast charging and smooth performance. Great value for premium features.",
    shortDescription: "Flagship phone with fast charging",
    price: 799.99,
    originalPrice: 899.99,
    category: "Electronics",
    subcategory: "Smartphones",
    brand: "OnePlus",
    tags: ["smartphone", "android", "fast-charging", "flagship"],
    imageUrl: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800",
    attributes: [
      { name: "Screen Size", value: "6.82 inches" },
      { name: "Processor", value: "Snapdragon 8 Gen 3" },
      { name: "RAM", value: "16GB" },
      { name: "Storage", value: "256GB" }
    ]
  },
  {
    name: "Xiaomi 14 Ultra",
    description: "Photography-focused smartphone with Leica cameras and premium build quality.",
    shortDescription: "Photography-focused smartphone",
    price: 1099.99,
    category: "Electronics",
    subcategory: "Smartphones",
    brand: "Xiaomi",
    tags: ["smartphone", "camera", "leica", "photography"],
    imageUrl: "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=800",
    attributes: [
      { name: "Screen Size", value: "6.73 inches" },
      { name: "Processor", value: "Snapdragon 8 Gen 3" },
      { name: "RAM", value: "16GB" },
      { name: "Camera", value: "50MP Leica" }
    ]
  },

  // Electronics - Headphones
  {
    name: "Sony WH-1000XM5",
    description: "Industry-leading noise canceling headphones with premium sound quality and all-day comfort.",
    shortDescription: "Premium noise canceling headphones",
    price: 399.99,
    category: "Electronics",
    subcategory: "Headphones",
    brand: "Sony",
    tags: ["headphones", "noise-canceling", "wireless", "premium"],
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
    attributes: [
      { name: "Battery Life", value: "30 hours" },
      { name: "Connectivity", value: "Bluetooth 5.2" },
      { name: "Noise Canceling", value: "Active" }
    ]
  },
  {
    name: "Apple AirPods Pro",
    description: "True wireless earbuds with active noise cancellation and spatial audio. Perfect for iOS users.",
    shortDescription: "True wireless earbuds with ANC",
    price: 249.99,
    category: "Electronics",
    subcategory: "Headphones",
    brand: "Apple",
    tags: ["earbuds", "wireless", "noise-canceling", "apple"],
    imageUrl: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800",
    attributes: [
      { name: "Battery Life", value: "6 hours + 24 hours case" },
      { name: "Connectivity", value: "Bluetooth 5.3" },
      { name: "Noise Canceling", value: "Active" }
    ]
  },
  {
    name: "Bose QuietComfort 45",
    description: "Comfortable over-ear headphones with world-class noise cancellation and balanced sound.",
    shortDescription: "Comfortable noise canceling headphones",
    price: 329.99,
    category: "Electronics",
    subcategory: "Headphones",
    brand: "Bose",
    tags: ["headphones", "noise-canceling", "comfortable", "balanced"],
    imageUrl: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800",
    attributes: [
      { name: "Battery Life", value: "24 hours" },
      { name: "Connectivity", value: "Bluetooth 5.1" },
      { name: "Weight", value: "238g" }
    ]
  },
  {
    name: "Sennheiser Momentum 4",
    description: "Audiophile-grade wireless headphones with exceptional sound quality and premium materials.",
    shortDescription: "Audiophile wireless headphones",
    price: 379.99,
    category: "Electronics",
    subcategory: "Headphones",
    brand: "Sennheiser",
    tags: ["headphones", "audiophile", "wireless", "premium"],
    imageUrl: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800",
    attributes: [
      { name: "Battery Life", value: "60 hours" },
      { name: "Connectivity", value: "Bluetooth 5.2" },
      { name: "Driver Size", value: "42mm" }
    ]
  },
  {
    name: "JBL Tune 760NC",
    description: "Affordable wireless headphones with active noise canceling and JBL Pure Bass sound.",
    shortDescription: "Affordable wireless headphones with ANC",
    price: 129.99,
    originalPrice: 179.99,
    category: "Electronics",
    subcategory: "Headphones",
    brand: "JBL",
    tags: ["headphones", "affordable", "wireless", "bass"],
    imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800",
    attributes: [
      { name: "Battery Life", value: "35 hours" },
      { name: "Connectivity", value: "Bluetooth 5.0" },
      { name: "Quick Charge", value: "2 hours in 5 minutes" }
    ]
  },

  // Home & Garden - Furniture
  {
    name: "Ergonomic Office Chair",
    description: "Premium office chair with lumbar support and breathable mesh back. Perfect for long work sessions.",
    shortDescription: "Premium ergonomic office chair",
    price: 549.99,
    category: "Home & Garden",
    subcategory: "Furniture",
    brand: "ErgoMax",
    tags: ["office", "chair", "ergonomic", "lumbar-support"],
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
    attributes: [
      { name: "Weight Capacity", value: "300 lbs" },
      { name: "Adjustment", value: "Height, Tilt, Armrest" },
      { name: "Material", value: "Mesh & Fabric" }
    ]
  },
  {
    name: "Standing Desk Converter",
    description: "Adjustable standing desk converter that transforms any desk into a sit-stand workstation.",
    shortDescription: "Adjustable standing desk converter",
    price: 299.99,
    category: "Home & Garden",
    subcategory: "Furniture",
    brand: "DeskRise",
    tags: ["desk", "standing", "adjustable", "ergonomic"],
    imageUrl: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=800",
    attributes: [
      { name: "Height Range", value: "6.5\" - 16.5\"" },
      { name: "Weight Capacity", value: "35 lbs" },
      { name: "Surface Area", value: "28\" x 23\"" }
    ]
  },
  {
    name: "Modern Sectional Sofa",
    description: "Comfortable L-shaped sectional sofa with premium fabric upholstery and deep seating.",
    shortDescription: "Modern L-shaped sectional sofa",
    price: 1299.99,
    category: "Home & Garden",
    subcategory: "Furniture",
    brand: "ComfortHome",
    tags: ["sofa", "sectional", "modern", "fabric"],
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
    hasVariants: true,
    variants: [
      { name: "Color", value: "Charcoal Gray", stockQuantity: 15 },
      { name: "Color", value: "Navy Blue", stockQuantity: 10 },
      { name: "Color", value: "Beige", stockQuantity: 8 }
    ]
  },
  {
    name: "Dining Table Set",
    description: "6-piece dining table set with solid wood construction and comfortable upholstered chairs.",
    shortDescription: "6-piece solid wood dining set",
    price: 899.99,
    category: "Home & Garden",
    subcategory: "Furniture",
    brand: "WoodCraft",
    tags: ["dining", "table", "chairs", "wood"],
    imageUrl: "https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=800",
    attributes: [
      { name: "Seating Capacity", value: "6 people" },
      { name: "Material", value: "Solid Oak" },
      { name: "Table Size", value: "72\" x 36\"" }
    ]
  },
  {
    name: "Memory Foam Mattress",
    description: "Queen size memory foam mattress with cooling gel layer and medium firmness for optimal comfort.",
    shortDescription: "Queen memory foam mattress",
    price: 799.99,
    originalPrice: 1199.99,
    category: "Home & Garden",
    subcategory: "Furniture",
    brand: "SleepWell",
    tags: ["mattress", "memory-foam", "cooling", "queen"],
    imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
    hasVariants: true,
    variants: [
      { name: "Size", value: "Queen", price: 799.99, stockQuantity: 20 },
      { name: "Size", value: "King", price: 999.99, stockQuantity: 15 },
      { name: "Size", value: "Full", price: 599.99, stockQuantity: 25 }
    ]
  },

  // Sports & Outdoors
  {
    name: "Professional Yoga Mat",
    description: "Non-slip yoga mat with excellent grip and cushioning. Perfect for all types of yoga and exercise.",
    shortDescription: "Non-slip professional yoga mat",
    price: 79.99,
    category: "Sports & Outdoors",
    subcategory: "Fitness",
    brand: "YogaPro",
    tags: ["yoga", "mat", "non-slip", "exercise"],
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
    hasVariants: true,
    variants: [
      { name: "Color", value: "Purple", stockQuantity: 30 },
      { name: "Color", value: "Blue", stockQuantity: 25 },
      { name: "Color", value: "Pink", stockQuantity: 20 }
    ]
  },
  {
    name: "Adjustable Dumbbells",
    description: "Space-saving adjustable dumbbells with quick-change weight system. Perfect for home workouts.",
    shortDescription: "Space-saving adjustable dumbbells",
    price: 299.99,
    category: "Sports & Outdoors",
    subcategory: "Fitness",
    brand: "FitGear",
    tags: ["dumbbells", "adjustable", "home-gym", "strength"],
    imageUrl: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=800",
    attributes: [
      { name: "Weight Range", value: "5-50 lbs per dumbbell" },
      { name: "Adjustment", value: "Quick-change dial" },
      { name: "Material", value: "Cast Iron with Rubber Coating" }
    ]
  },
  {
    name: "Resistance Bands Set",
    description: "Complete resistance bands set with different resistance levels and accessories for full-body workouts.",
    shortDescription: "Complete resistance bands set",
    price: 49.99,
    category: "Sports & Outdoors",
    subcategory: "Fitness",
    brand: "FlexFit",
    tags: ["resistance-bands", "home-workout", "portable", "full-body"],
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
    attributes: [
      { name: "Resistance Levels", value: "5 different levels" },
      { name: "Included", value: "Handles, Ankle Straps, Door Anchor" },
      { name: "Max Resistance", value: "150 lbs" }
    ]
  },
  {
    name: "Camping Tent 4-Person",
    description: "Waterproof 4-person tent with easy setup and spacious interior. Perfect for family camping trips.",
    shortDescription: "Waterproof 4-person camping tent",
    price: 199.99,
    category: "Sports & Outdoors",
    subcategory: "Camping",
    brand: "OutdoorMax",
    tags: ["tent", "camping", "4-person", "waterproof"],
    imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800",
    attributes: [
      { name: "Capacity", value: "4 people" },
      { name: "Setup Time", value: "10 minutes" },
      { name: "Waterproof Rating", value: "3000mm" }
    ]
  },
  {
    name: "Hiking Backpack",
    description: "Durable 50L hiking backpack with multiple compartments and hydration system compatibility.",
    shortDescription: "50L hiking backpack",
    price: 149.99,
    category: "Sports & Outdoors",
    subcategory: "Camping",
    brand: "TrailMaster",
    tags: ["backpack", "hiking", "50l", "hydration"],
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
    attributes: [
      { name: "Capacity", value: "50 liters" },
      { name: "Material", value: "Ripstop Nylon" },
      { name: "Weight", value: "3.2 lbs" }
    ]
  },

  // Clothing - Men
  {
    name: "Men's Casual Button-Down Shirt",
    description: "Comfortable cotton button-down shirt perfect for casual and business casual occasions.",
    shortDescription: "Men's cotton button-down shirt",
    price: 59.99,
    category: "Clothing",
    subcategory: "Men's Clothing",
    brand: "ClassicFit",
    tags: ["shirt", "men", "casual", "cotton"],
    imageUrl: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800",
    hasVariants: true,
    variants: [
      { name: "Size", value: "S", stockQuantity: 20 },
      { name: "Size", value: "M", stockQuantity: 35 },
      { name: "Size", value: "L", stockQuantity: 30 },
      { name: "Size", value: "XL", stockQuantity: 25 }
    ]
  },
  {
    name: "Men's Slim Fit Jeans",
    description: "Modern slim fit jeans with stretch fabric for comfort and mobility. Classic 5-pocket design.",
    shortDescription: "Men's slim fit stretch jeans",
    price: 89.99,
    category: "Clothing",
    subcategory: "Men's Clothing",
    brand: "DenimCo",
    tags: ["jeans", "men", "slim-fit", "stretch"],
    imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800",
    hasVariants: true,
    variants: [
      { name: "Size", value: "30x30", stockQuantity: 15 },
      { name: "Size", value: "32x32", stockQuantity: 25 },
      { name: "Size", value: "34x32", stockQuantity: 20 },
      { name: "Size", value: "36x34", stockQuantity: 10 }
    ]
  },
  {
    name: "Men's Running Shoes",
    description: "Lightweight running shoes with responsive cushioning and breathable mesh upper.",
    shortDescription: "Men's lightweight running shoes",
    price: 129.99,
    category: "Clothing",
    subcategory: "Shoes",
    brand: "SpeedRun",
    tags: ["shoes", "men", "running", "lightweight"],
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
    hasVariants: true,
    variants: [
      { name: "Size", value: "8", stockQuantity: 12 },
      { name: "Size", value: "9", stockQuantity: 18 },
      { name: "Size", value: "10", stockQuantity: 15 },
      { name: "Size", value: "11", stockQuantity: 10 }
    ]
  },
  {
    name: "Men's Wool Sweater",
    description: "Cozy merino wool sweater with classic crew neck design. Perfect for layering in cold weather.",
    shortDescription: "Men's merino wool sweater",
    price: 119.99,
    category: "Clothing",
    subcategory: "Men's Clothing",
    brand: "WoolCraft",
    tags: ["sweater", "men", "wool", "crew-neck"],
    imageUrl: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800",
    hasVariants: true,
    variants: [
      { name: "Color", value: "Navy", stockQuantity: 20 },
      { name: "Color", value: "Gray", stockQuantity: 18 },
      { name: "Color", value: "Burgundy", stockQuantity: 15 }
    ]
  },
  {
    name: "Men's Leather Jacket",
    description: "Genuine leather jacket with classic biker style. Features multiple pockets and YKK zippers.",
    shortDescription: "Men's genuine leather jacket",
    price: 299.99,
    originalPrice: 399.99,
    category: "Clothing",
    subcategory: "Men's Clothing",
    brand: "LeatherMax",
    tags: ["jacket", "men", "leather", "biker"],
    imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
    attributes: [
      { name: "Material", value: "Genuine Cowhide Leather" },
      { name: "Lining", value: "Polyester" },
      { name: "Pockets", value: "6 total" }
    ]
  },

  // Clothing - Women
  {
    name: "Women's Floral Dress",
    description: "Elegant floral print dress with flowing silhouette. Perfect for spring and summer occasions.",
    shortDescription: "Women's floral print dress",
    price: 79.99,
    category: "Clothing",
    subcategory: "Women's Clothing",
    brand: "FloralFashion",
    tags: ["dress", "women", "floral", "spring"],
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800",
    hasVariants: true,
    variants: [
      { name: "Size", value: "XS", stockQuantity: 15 },
      { name: "Size", value: "S", stockQuantity: 25 },
      { name: "Size", value: "M", stockQuantity: 30 },
      { name: "Size", value: "L", stockQuantity: 20 }
    ]
  },
  {
    name: "Women's Yoga Leggings",
    description: "High-waisted yoga leggings with moisture-wicking fabric and four-way stretch for maximum comfort.",
    shortDescription: "Women's high-waisted yoga leggings",
    price: 49.99,
    category: "Clothing",
    subcategory: "Women's Clothing",
    brand: "ActiveWear",
    tags: ["leggings", "women", "yoga", "activewear"],
    imageUrl: "https://images.unsplash.com/photo-1506629905607-e48b6930de28?w=800",
    hasVariants: true,
    variants: [
      { name: "Color", value: "Black", stockQuantity: 40 },
      { name: "Color", value: "Navy", stockQuantity: 30 },
      { name: "Color", value: "Purple", stockQuantity: 25 }
    ]
  },
  {
    name: "Women's Blazer",
    description: "Professional blazer with tailored fit and classic lapels. Perfect for business and formal occasions.",
    shortDescription: "Women's tailored blazer",
    price: 159.99,
    category: "Clothing",
    subcategory: "Women's Clothing",
    brand: "ProfessionalWear",
    tags: ["blazer", "women", "professional", "tailored"],
    imageUrl: "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800",
    hasVariants: true,
    variants: [
      { name: "Color", value: "Black", stockQuantity: 25 },
      { name: "Color", value: "Navy", stockQuantity: 20 },
      { name: "Color", value: "Gray", stockQuantity: 15 }
    ]
  },
  {
    name: "Women's Sneakers",
    description: "Comfortable everyday sneakers with cushioned sole and breathable fabric upper.",
    shortDescription: "Women's comfortable sneakers",
    price: 89.99,
    category: "Clothing",
    subcategory: "Shoes",
    brand: "ComfortStep",
    tags: ["sneakers", "women", "comfortable", "everyday"],
    imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800",
    hasVariants: true,
    variants: [
      { name: "Size", value: "6", stockQuantity: 15 },
      { name: "Size", value: "7", stockQuantity: 20 },
      { name: "Size", value: "8", stockQuantity: 18 },
      { name: "Size", value: "9", stockQuantity: 12 }
    ]
  },
]