import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createChat = mutation ({
  args: {
    title: v.string(),
    userAgent: v.optional(v.string()),
    timezone: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) =>  {
    console.log("🔍 [CHATS] Attempting to get user identity...");
    const identity = await ctx.auth.getUserIdentity(); 
    console.log("🔍 [CHATS] Identity result:", identity);
    
    if (!identity) {
      console.log("❌ [CHATS] No identity found - user not authenticated");
      throw new Error("Not authenticated");
    }
    
    console.log("✅ [CHATS] User ID extracted:", identity.subject);
    const chat = await ctx.db.insert("chats", {
      title: args.title,
      userId: identity.subject,
      username: typeof identity.username === 'string' ? identity.username : undefined,
      email: typeof identity.email === 'string' ? identity.email : undefined,
      firstName: typeof (identity as any).givenName === 'string' ? (identity as any).givenName : undefined,
      lastName: typeof (identity as any).familyName === 'string' ? (identity as any).familyName : undefined,
      imageUrl: typeof (identity as any).pictureUrl === 'string' ? (identity as any).pictureUrl : undefined,
      userAgent: args.userAgent,
      timezone: args.timezone,
      language: args.language,
      createdAt: Date.now(),
    });

    console.log("✅ [CHATS] Chat created with ID:", chat);
    return chat;
  }
});

export const deleteChat = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Delete all messages in the chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the chat
    await ctx.db.delete(args.id);
  }
});

export const listChats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    return chats;
  }
});

export const getChat = query({
  args: { id: v.id("chats"), userId: v.string() },
  handler: async (ctx, args) => {
    try {
      const chat = await ctx.db.get(args.id);

      // Return null if chat doesn't exist or user is not authorized
      if (!chat || chat.userId !== args.userId) {
        console.log("❌ Chat not found or unauthorized", {
          chatExists: !!chat,
          chatUserId: chat?.userId,
          requestUserId: args.userId,
        });
        return null;
      }

      console.log("✅ Chat found and authorized");
      return chat;
    } catch (error) {
      console.error("🔥 Error in getChat:", error);
      return null;
    }
  },
});
