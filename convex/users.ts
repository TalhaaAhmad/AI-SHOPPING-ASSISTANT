import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function formatUserId(n: number): string {
  return `USR${String(n).padStart(3, "0")}`;
}

export const createUser = mutation({
  args: {
    clerkUserId: v.string(), // <- Clerk user.id
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if Clerk user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Generate next USR### ID
    const lastUser = await ctx.db.query("users").order("desc").take(1);

    let nextNumber = 1;
    if (lastUser.length > 0) {
      const lastId = lastUser[0].userId; // e.g. USR007
      const lastNumber = parseInt(lastId.replace("USR", ""));
      nextNumber = lastNumber + 1;
    }

    const newUserId = formatUserId(nextNumber);

    const id = await ctx.db.insert("users", {
      userId: newUserId,
      clerkUserId: args.clerkUserId,
      email: args.email,
      name: args.name,
      createdAt: Date.now(),
    });

    return id;
  },
});
export const getUserByUserId = query({
    args: {
      userId: v.string(),
    },
    handler: async (ctx, args) => {
      return await ctx.db
        .query("users")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.userId))
        .first();
    },
  });