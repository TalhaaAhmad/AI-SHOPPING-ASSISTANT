// admin.ts - Add this to your convex folder

import { query } from "./_generated/server";
import { v } from "convex/values";

// List of admin user IDs - configure this based on your auth system
const ADMIN_USER_IDS = [
  "user_2zJ2jWXawy5yFT2GkYTUeQUhdmF",
];

// Helper function to check if user is admin
const isAdmin = (userId: string) => {
  return ADMIN_USER_IDS.includes(userId);
};

export const getAllChats = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity || !isAdmin(identity.subject)) {
      throw new Error("Admin access required");
    }

    const limit = args.limit || 50;
    
    const chats = await ctx.db
      .query("chats")
      .order("desc")
      .paginate({
        numItems: limit,
        cursor: args.cursor ?? null,
      });

    return chats;
  },
});

export const getAllMessages = query({
  args: {
    chatId: v.optional(v.id("chats")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity || !isAdmin(identity.subject)) {
      throw new Error("Admin access required");
    }

    const limit = args.limit || 100;
    
    const messages = args.chatId 
      ? await ctx.db
          .query("messages")
          .withIndex("by_chat", (q) => q.eq("chatId", args.chatId!))
          .order("desc")
          .paginate({
            numItems: limit,
            cursor: args.cursor ?? null,
          })
      : await ctx.db
          .query("messages")
          .order("desc")
          .paginate({
            numItems: limit,
            cursor: args.cursor ?? null,
          });

    return messages;
  },
});

export const getConversationStats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity || !isAdmin(identity.subject)) {
      throw new Error("Admin access required");
    }

    const [chats, messages] = await Promise.all([
      ctx.db.query("chats").collect(),
      ctx.db.query("messages").collect()
    ]);

    const userStats = chats.reduce((acc, chat) => {
      acc[chat.userId] = (acc[chat.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const messageStats = messages.reduce((acc, message) => {
      if (message.role === "user") {
        acc.userMessages++;
      } else {
        acc.assistantMessages++;
      }
      return acc;
    }, { userMessages: 0, assistantMessages: 0 });

    // Get activity by day (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentChats = chats.filter(chat => chat.createdAt > thirtyDaysAgo);
    
    const dailyActivity = recentChats.reduce((acc, chat) => {
      const date = new Date(chat.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalChats: chats.length,
      totalMessages: messages.length,
      totalUsers: Object.keys(userStats).length,
      messageStats,
      userStats,
      dailyActivity: Object.entries(dailyActivity)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
    };
  },
});

export const searchConversations = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity || !isAdmin(identity.subject)) {
      throw new Error("Admin access required");
    }

    const limit = args.limit || 50;
    const searchTerm = args.searchTerm.toLowerCase();

    // Search in chat titles
    const chats = await ctx.db.query("chats").collect();
    const matchingChats = chats.filter(chat => 
      chat.title.toLowerCase().includes(searchTerm)
    ).slice(0, limit);

    // Search in message content
    const messages = await ctx.db.query("messages").collect();
    const matchingMessages = messages.filter(message => 
      message.content.toLowerCase().includes(searchTerm)
    ).slice(0, limit);

    return {
      chats: matchingChats,
      messages: matchingMessages,
    };
  },
});

export const getUserActivity = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity || !isAdmin(identity.subject)) {
      throw new Error("Admin access required");
    }

    const userChats = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const chatIds = userChats.map(chat => chat._id);
    const allMessages = await ctx.db.query("messages").collect();
    
    const userMessages = allMessages.filter(message => 
      chatIds.includes(message.chatId)
    );

    const messagesByChat = userMessages.reduce((acc, message) => {
      if (!acc[message.chatId]) {
        acc[message.chatId] = [];
      }
      acc[message.chatId].push(message);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      user: args.userId,
      totalChats: userChats.length,
      totalMessages: userMessages.length,
      chats: userChats.map(chat => ({
        ...chat,
        messageCount: messagesByChat[chat._id]?.length || 0,
        lastActivity: messagesByChat[chat._id]?.[0]?.createdAt || chat.createdAt,
      })),
    };
  },
});