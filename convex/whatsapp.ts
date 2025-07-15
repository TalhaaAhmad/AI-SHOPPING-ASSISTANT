import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create a WhatsApp chat by contact_name
export const getOrCreateChat = mutation({
  args: { contact_name: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let chat = await ctx.db
      .query("whatsapp_chats")
      .withIndex("by_contact_name", (q) => q.eq("contact_name", args.contact_name))
      .first();
    if (!chat) {
      const chatId = await ctx.db.insert("whatsapp_chats", {
        contact_name: args.contact_name,
        createdAt: Date.now(),
        name: args.name,
      });
      return chatId;
    }
    return chat._id;
  },
});

// List all messages for a WhatsApp chat
export const listMessages = query({
  args: { chatId: v.id("whatsapp_chats") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whatsapp_messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

// Send/store a WhatsApp message
export const sendMessage = mutation({
  args: {
    chatId: v.id("whatsapp_chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("whatsapp_messages", {
      chatId: args.chatId,
      content: args.content,
      role: args.role,
      createdAt: Date.now(),
      sender_name: args.sender_name,
      message_type: args.message_type,
      direction: args.direction,
      hour: args.hour,
      my_number: args.my_number,
      media: args.media,
      keyword: args.keyword,
      filename: args.filename,
      group_flag: args.group_flag,
      scan_number: args.scan_number,
      quote_message: args.quote_message,
      quote_from: args.quote_from,
      quote_name: args.quote_name,
    });
  },
});

// Get chat by contact_name
export const getChatByContactName = query({
  args: { contact_name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whatsapp_chats")
      .withIndex("by_contact_name", (q) => q.eq("contact_name", args.contact_name))
      .first();
  },
});

// Get all WhatsApp chats
export const getAllWhatsAppChats = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("whatsapp_chats")
      .order("desc")
      .collect();
  },
}); 