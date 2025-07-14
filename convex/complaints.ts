// Create this file: convex/complaints.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { complaintStatus, complaintType, resolutionType, urgencyLevel } from "./schema";

// Helper function to generate complaint ID in CMP-XXXX format
async function generateComplaintId(ctx: any): Promise<string> {
  // Get the count of existing complaints to determine the next number
  const existingComplaints = await ctx.db.query("complaints").collect();
  const nextNumber = existingComplaints.length + 1;
  
  // Format as CMP-XXXX (pad with zeros)
  const complaintId = `CMP-${nextNumber.toString().padStart(4, '0')}`;
  
  // Check if this ID already exists (safety check)
  const existing = await ctx.db
    .query("complaints")
    .withIndex("by_complaint_id", (q: any) => q.eq("complaintId", complaintId))
    .first();
  
  if (existing) {
    // If it exists, try the next number
    const fallbackId = `CMP-${(nextNumber + 1).toString().padStart(4, '0')}`;
    return fallbackId;
  }
  
  return complaintId;
}

// Create a new complaint (complaintId is now auto-generated)
export const createComplaint = mutation({
  args: {
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
    evidenceUrls: v.optional(v.array(v.string())),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Auto-generate complaint ID in CMP-XXXX format
    const complaintId = await generateComplaintId(ctx);
    
    const now = Date.now();
    
    // Create the complaint with auto-generated ID
    const newComplaintId = await ctx.db.insert("complaints", {
      ...args,
      complaintId,
      createdAt: now,
      updatedAt: now,
      customerNotified: false,
    });

    return {
      _id: newComplaintId,
      complaintId: complaintId,
      message: "Complaint created successfully"
    };
  },
});

// Alternative: Create complaint with custom ID (if you want to allow manual IDs)
export const createComplaintWithCustomId = mutation({
  args: {
    complaintId: v.string(), // Must be in CMP-XXXX format
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
    evidenceUrls: v.optional(v.array(v.string())),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate complaint ID format
    if (!args.complaintId.match(/^CMP-\d{4}$/)) {
      throw new Error("Complaint ID must be in CMP-XXXX format (e.g., CMP-0001)");
    }
    
    // Check if complaint with same ID already exists
    const existingComplaint = await ctx.db
      .query("complaints")
      .withIndex("by_complaint_id", (q) => q.eq("complaintId", args.complaintId))
      .first();

    if (existingComplaint) {
      throw new Error("Complaint with this ID already exists");
    }

    const now = Date.now();
    
    // Create the complaint
    const newComplaintId = await ctx.db.insert("complaints", {
      ...args,
      createdAt: now,
      updatedAt: now,
      customerNotified: false,
    });

    return {
      _id: newComplaintId,
      complaintId: args.complaintId,
      message: "Complaint created successfully"
    };
  },
});

// Get complaint by complaint ID
export const getComplaintById = query({
  args: { complaintId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complaints")
      .withIndex("by_complaint_id", (q) => q.eq("complaintId", args.complaintId))
      .first();
  },
});

// Get all complaints for a customer
export const getComplaintsByCustomer = query({
  args: { customerEmail: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complaints")
      .withIndex("by_customer", (q) => q.eq("customerEmail", args.customerEmail))
      .order("desc")
      .collect();
  },
});

// Get all complaints for an order
export const getComplaintsByOrder = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complaints")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
  },
});

// Update complaint status
export const updateComplaintStatus = mutation({
  args: {
    complaintId: v.string(),
    status: complaintStatus,
    resolutionNotes: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const complaint = await ctx.db
      .query("complaints")
      .withIndex("by_complaint_id", (q) => q.eq("complaintId", args.complaintId))
      .first();

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const updateData: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.resolutionNotes) {
      updateData.resolutionNotes = args.resolutionNotes;
    }

    if (args.assignedTo) {
      updateData.assignedTo = args.assignedTo;
    }

    if (args.internalNotes) {
      updateData.internalNotes = args.internalNotes;
    }

    // If status is resolved, add resolved timestamp
    if (args.status === "resolved") {
      updateData.resolvedAt = Date.now();
    }

    await ctx.db.patch(complaint._id, updateData);

    return { success: true, message: "Complaint status updated successfully" };
  },
});

// Add evidence to complaint
export const addEvidenceToComplaint = mutation({
  args: {
    complaintId: v.string(),
    evidenceUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const complaint = await ctx.db
      .query("complaints")
      .withIndex("by_complaint_id", (q) => q.eq("complaintId", args.complaintId))
      .first();

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const existingUrls = complaint.evidenceUrls || [];
    const updatedUrls = [...existingUrls, ...args.evidenceUrls];

    await ctx.db.patch(complaint._id, {
      evidenceUrls: updatedUrls,
      hasEvidence: true,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Evidence added successfully" };
  },
});

// Get complaints by status
export const getComplaintsByStatus = query({
  args: { status: complaintStatus },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complaints")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

export const getExistingComplaint = query({
    args: {
      orderId: v.string(),
      customerEmail: v.string(),
      complaintType: complaintType,
    },
    handler: async (ctx, args) => {
      const complaints = await ctx.db
        .query("complaints")
        .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
        .collect();
  
      return complaints.find(
        (complaint) =>
          complaint.customerEmail === args.customerEmail &&
          complaint.complaintType === args.complaintType &&
          complaint.status !== "draft"
      );
    },
  });

  export const updateComplaint = mutation({
    args: {
      complaintId: v.string(),
      status: complaintStatus,
      description: v.optional(v.string()),
      affectedProducts: v.optional(v.array(v.string())),
      hasEvidence: v.optional(v.boolean()),
      evidenceDescription: v.optional(v.string()),
      preferredResolution: v.optional(resolutionType),
      suggestedResolution: v.optional(resolutionType),
      urgency: v.optional(urgencyLevel),
      resolutionDetails: v.optional(v.string()),
      compensationAmount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const complaint = await ctx.db
        .query("complaints")
        .withIndex("by_complaint_id", (q) => q.eq("complaintId", args.complaintId))
        .first();
  
      if (!complaint) throw new Error("Complaint not found");
  
      const { complaintId, ...updateData } = args;
  
      await ctx.db.patch(complaint._id, {
        ...updateData,
        updatedAt: Date.now(),
      });
  
      return { success: true, message: "Complaint updated successfully" };
    },
  });


export const getDraftComplaint = query({
  args: {
    orderId: v.string(),
    customerEmail: v.string(),
    complaintType: complaintType,
  },
  handler: async (ctx, args) => {
    const complaints = await ctx.db
      .query("complaints")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    return complaints.find(
      (complaint) =>
        complaint.customerEmail === args.customerEmail &&
        complaint.complaintType === args.complaintType &&
        complaint.status === "draft"
    );
  },
});

// Get complaints by type
export const getComplaintsByType = query({
  args: { complaintType: complaintType },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complaints")
      .withIndex("by_type", (q) => q.eq("complaintType", args.complaintType))
      .order("desc")
      .collect();
  },
});

// Get complaints by urgency
export const getComplaintsByUrgency = query({
  args: { urgency: urgencyLevel },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complaints")
      .withIndex("by_urgency", (q) => q.eq("urgency", args.urgency))
      .order("desc")
      .collect();
  },
});

// Get all complaints (for admin dashboard)
export const getAllComplaints = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("complaints").order("desc");
    
    if (args.offset) {
      // Skip items for pagination
      const allComplaints = await query.collect();
      return allComplaints.slice(args.offset, args.offset + (args.limit || 50));
    }
    
    if (args.limit) {
      return await query.take(args.limit);
    }
    
    return await query.collect();
  },
});

// Search complaints
export const searchComplaints = query({
  args: {
    searchTerm: v.string(),
    complaintType: v.optional(complaintType),
    status: v.optional(complaintStatus),
    urgency: v.optional(urgencyLevel),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("complaints")
      .withSearchIndex("search_complaints", (q) => {
        let query = q.search("description", args.searchTerm);
        if (args.complaintType) {
          query = query.eq("complaintType", args.complaintType);
        }
        if (args.status) {
          query = query.eq("status", args.status);
        }
        if (args.urgency) {
          query = query.eq("urgency", args.urgency);
        }
        return query;
      })
      .collect();

    return results;
  },
});

// Get complaint statistics
export const getComplaintStats = query({
  args: {},
  handler: async (ctx) => {
    const allComplaints = await ctx.db.query("complaints").collect();
    
    const stats = {
      total: allComplaints.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byUrgency: {} as Record<string, number>,
      resolved: 0,
      pending: 0,
      avgResolutionTime: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    allComplaints.forEach(complaint => {
      // Count by status
      stats.byStatus[complaint.status] = (stats.byStatus[complaint.status] || 0) + 1;
      
      // Count by type
      stats.byType[complaint.complaintType] = (stats.byType[complaint.complaintType] || 0) + 1;
      
      // Count by urgency
      stats.byUrgency[complaint.urgency] = (stats.byUrgency[complaint.urgency] || 0) + 1;
      
      // Count resolved vs pending
      if (complaint.status === "resolved") {
        stats.resolved++;
        if (complaint.resolvedAt) {
          totalResolutionTime += complaint.resolvedAt - complaint.createdAt;
          resolvedCount++;
        }
      } else {
        stats.pending++;
      }
    });

    // Calculate average resolution time in hours
    if (resolvedCount > 0) {
      stats.avgResolutionTime = Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60));
    }

    return stats;
  },
});

// Mark complaint as customer notified
export const markCustomerNotified = mutation({
  args: { complaintId: v.string() },
  handler: async (ctx, args) => {
    const complaint = await ctx.db
      .query("complaints")
      .withIndex("by_complaint_id", (q) => q.eq("complaintId", args.complaintId))
      .first();

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    await ctx.db.patch(complaint._id, {
      customerNotified: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get next available complaint ID (utility function)
export const getNextComplaintId = query({
  args: {},
  handler: async (ctx) => {
    const existingComplaints = await ctx.db.query("complaints").collect();
    const nextNumber = existingComplaints.length + 1;
    return `CMP-${nextNumber.toString().padStart(4, '0')}`;
  },
});

export const getComplaintsByEmail = query({
  args: { customerEmail: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complaints")
      .withIndex("by_customer", (q) => q.eq("customerEmail", args.customerEmail))
      .order("desc")
      .collect();
  },
});