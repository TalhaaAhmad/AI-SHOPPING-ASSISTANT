import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

// Complaint status enum
enum ComplaintStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  REJECTED = "rejected",
  RESOLVED = "resolved",
  ESCALATED = "escalated"
}

// Resolution types
enum ResolutionType {
  FULL_REFUND = "full_refund",
  PARTIAL_REFUND = "partial_refund",
  STORE_CREDIT = "store_credit",
  REPLACEMENT = "replacement",
  EXCHANGE = "exchange",
  REPAIR = "repair",
  COMPENSATION = "compensation",
  APOLOGY = "apology",
  POLICY_EXPLANATION = "policy_explanation",
  NO_ACTION = "no_action"
}

const complaintStatusTool = new DynamicStructuredTool({
  name: "checkComplaintStatus",
  description: "Check the status of existing customer complaints by complaint ID, order ID, or customer email. Returns detailed information about complaint status, resolution, and next steps.",
  schema: z.object({
    complaintId: z.string().optional().describe("The complaint ID to look up (format: CMP-XXXXXXXX)"),
    orderId: z.string().optional().describe("The order ID to search for complaints"),
    customerEmail: z.string().email().describe("Customer email address to search for complaints"),
    searchType: z.enum(["by_id", "by_order", "by_email", "all"]).describe("Type of search to perform")
  }),
  func: async ({ 
    complaintId, 
    orderId, 
    customerEmail, 
    searchType 
  }) => {
    try {
      const convexClient = getConvexClient();
      let complaints = [];

      // Search for complaints based on search type
      switch (searchType) {
        case "by_id":
          if (!complaintId) {
            return "❌ Complaint ID is required for this search type.";
          }
          const complaint = await convexClient.query(api.complaints.getComplaintById, { 
            complaintId 
          });
          complaints = complaint ? [complaint] : [];
          break;

        case "by_order":
          if (!orderId) {
            return "❌ Order ID is required for this search type.";
          }
          complaints = await convexClient.query(api.complaints.getComplaintsByOrder, { 
            orderId 
          });
          break;

        case "by_email":
          complaints = await convexClient.query(api.complaints.getComplaintsByEmail, { 
            customerEmail 
          });
          break;

        case "all":
          // Search by all available criteria
          const allComplaints = [];
          
          if (complaintId) {
            const byId = await convexClient.query(api.complaints.getComplaintById, { complaintId });
            if (byId) allComplaints.push(byId);
          }
          
          if (orderId) {
            const byOrder = await convexClient.query(api.complaints.getComplaintsByOrder, { orderId });
            allComplaints.push(...byOrder);
          }
          
          const byEmail = await convexClient.query(api.complaints.getComplaintsByEmail, { customerEmail });
          allComplaints.push(...byEmail);
          
          // Remove duplicates based on complaintId
          const uniqueComplaints = allComplaints.filter((complaint, index, self) => 
            index === self.findIndex(c => c.complaintId === complaint.complaintId)
          );
          complaints = uniqueComplaints;
          break;
      }

      if (complaints.length === 0) {
        return `❌ **No Complaints Found**\n\nNo complaints found for the provided search criteria.\n\n**Search Details:**\n${complaintId ? `• Complaint ID: ${complaintId}\n` : ''}${orderId ? `• Order ID: ${orderId}\n` : ''}• Email: ${customerEmail}\n\nPlease verify your search criteria or contact customer support for assistance.`;
      }

      // Format response for multiple complaints
      if (complaints.length > 1) {
        let response = `📋 **Found ${complaints.length} Complaint(s)**\n\n`;
        
        complaints.forEach((complaint, index) => {
          response += `**${index + 1}. Complaint ID: ${complaint.complaintId}**\n`;
          response += `• Type: ${complaint.complaintType.replace('_', ' ').toUpperCase()}\n`;
          response += `• Status: ${complaint.status.toUpperCase()}\n`;
          response += `• Order ID: ${complaint.orderId}\n`;
          response += `• Created: ${new Date(complaint.createdAt).toLocaleDateString()}\n`;
          response += `• Priority: ${complaint.urgency}\n\n`;
        });

        response += `💡 **To get detailed information about a specific complaint, please provide the Complaint ID.**`;
        return response;
      }

      // Single complaint - provide detailed information
      const complaint = complaints[0];
      return formatComplaintStatusResponse(complaint);

    } catch (error) {
      console.error("Complaint status check failed:", error);
      return "❌ Failed to check complaint status. Please try again later or contact customer support directly.";
    }
  }
});

// Format detailed complaint status response
function formatComplaintStatusResponse(complaint: any): string {
  const statusEmoji = getStatusEmoji(complaint.status);
  const statusColor = getStatusColor(complaint.status);
  
  let response = `${statusEmoji} **Complaint Status: ${complaint.status.toUpperCase()}**\n\n`;
  
  response += `📋 **Complaint Details:**\n`;
  response += `• Complaint ID: ${complaint.complaintId}\n`;
  response += `• Type: ${complaint.complaintType.replace('_', ' ').toUpperCase()}\n`;
  response += `• Order ID: ${complaint.orderId}\n`;
  response += `• Customer Email: ${complaint.customerEmail}\n`;
  response += `• Priority: ${complaint.urgency.toUpperCase()}\n`;
  response += `• Created: ${new Date(complaint.createdAt).toLocaleDateString()}\n`;
  response += `• Last Updated: ${complaint.updatedAt ? new Date(complaint.updatedAt).toLocaleDateString() : 'N/A'}\n\n`;

  if (complaint.description) {
    response += `📝 **Description:**\n${complaint.description}\n\n`;
  }

  if (complaint.affectedProducts && complaint.affectedProducts.length > 0) {
    response += `🛍️ **Affected Products:**\n`;
    complaint.affectedProducts.forEach((product: string) => {
      response += `• ${product}\n`;
    });
    response += `\n`;
  }

  response += `🔍 **Resolution Information:**\n`;
  if (complaint.suggestedResolution) {
    response += `• Suggested Resolution: ${complaint.suggestedResolution.replace('_', ' ').toUpperCase()}\n`;
  }
  if (complaint.preferredResolution) {
    response += `• Preferred Resolution: ${complaint.preferredResolution.replace('_', ' ').toUpperCase()}\n`;
  }
  if (complaint.resolutionDetails) {
    response += `• Resolution Details: ${complaint.resolutionDetails}\n`;
  }
  if (complaint.compensationAmount && complaint.compensationAmount > 0) {
    response += `• Compensation Amount: $${complaint.compensationAmount.toFixed(2)}\n`;
  }
  response += `\n`;

  response += `📊 **Status Information:**\n`;
  response += getStatusDescription(complaint.status);
  response += `\n`;

  response += `📞 **Next Steps:**\n`;
  response += getNextStepsForStatus(complaint.status, complaint.suggestedResolution);
  response += `\n`;

  response += `📧 **Contact Information:**\n`;
  response += `• Email: support@harshaay.com\n`;
  response += `• Phone: 1-800-SUPPORT\n`;
  response += `• Reference: ${complaint.complaintId}\n\n`;

  if (complaint.internalNotes) {
    response += `📝 **Internal Notes:**\n${complaint.internalNotes}\n\n`;
  }

  return response;
}

// Get status emoji
function getStatusEmoji(status: string): string {
  switch (status) {
    case ComplaintStatus.DRAFT: return "📝";
    case ComplaintStatus.SUBMITTED: return "📤";
    case ComplaintStatus.UNDER_REVIEW: return "🔍";
    case ComplaintStatus.APPROVED: return "✅";
    case ComplaintStatus.REJECTED: return "❌";
    case ComplaintStatus.RESOLVED: return "🎉";
    case ComplaintStatus.ESCALATED: return "⚠️";
    default: return "📋";
  }
}

// Get status color (for future UI implementation)
function getStatusColor(status: string): string {
  switch (status) {
    case ComplaintStatus.DRAFT: return "gray";
    case ComplaintStatus.SUBMITTED: return "blue";
    case ComplaintStatus.UNDER_REVIEW: return "yellow";
    case ComplaintStatus.APPROVED: return "green";
    case ComplaintStatus.REJECTED: return "red";
    case ComplaintStatus.RESOLVED: return "green";
    case ComplaintStatus.ESCALATED: return "orange";
    default: return "gray";
  }
}

// Get status description
function getStatusDescription(status: string): string {
  switch (status) {
    case ComplaintStatus.DRAFT:
      return "Your complaint is saved as a draft. Please complete all required information to submit it for review.";
    case ComplaintStatus.SUBMITTED:
      return "Your complaint has been successfully submitted and is awaiting review by our customer service team.";
    case ComplaintStatus.UNDER_REVIEW:
      return "Our customer service team is currently reviewing your complaint. This typically takes 24-48 hours.";
    case ComplaintStatus.APPROVED:
      return "Your complaint has been approved and the resolution is being processed.";
    case ComplaintStatus.REJECTED:
      return "Your complaint has been reviewed but could not be approved. Please contact customer support for more information.";
    case ComplaintStatus.RESOLVED:
      return "Your complaint has been successfully resolved. If you have any questions, please contact customer support.";
    case ComplaintStatus.ESCALATED:
      return "Your complaint has been escalated to senior management for further review.";
    default:
      return "Status information is not available.";
  }
}

// Get next steps based on status
function getNextStepsForStatus(status: string, suggestedResolution?: string): string {
  switch (status) {
    case ComplaintStatus.DRAFT:
      return "• Complete all required information\n• Submit the complaint for review\n• Contact support if you need assistance";
      
    case ComplaintStatus.SUBMITTED:
      return "• Wait for review (24-48 hours)\n• Check your email for updates\n• Contact support if urgent";
      
    case ComplaintStatus.UNDER_REVIEW:
      return "• Wait for review completion\n• Check your email for updates\n• Contact support if you have questions";
      
    case ComplaintStatus.APPROVED:
      if (suggestedResolution === ResolutionType.REPLACEMENT) {
        return "• Replacement will be shipped within 1-2 business days\n• You'll receive tracking information\n• Return the original item within 30 days";
      } else if (suggestedResolution === ResolutionType.FULL_REFUND || suggestedResolution === ResolutionType.PARTIAL_REFUND) {
        return "• Refund will be processed within 5-7 business days\n• Check your original payment method\n• Return the item using provided label";
      } else if (suggestedResolution === ResolutionType.STORE_CREDIT) {
        return "• Store credit will be applied within 24 hours\n• Credit can be used for future purchases\n• Credit never expires";
      } else {
        return "• Resolution is being processed\n• You'll receive confirmation via email\n• Contact support if you have questions";
      }
      
    case ComplaintStatus.REJECTED:
      return "• Contact customer support for explanation\n• You may appeal the decision\n• Consider alternative resolution options";
      
    case ComplaintStatus.RESOLVED:
      return "• No further action required\n• Contact support if you have questions\n• Consider leaving feedback about your experience";
      
    case ComplaintStatus.ESCALATED:
      return "• Senior management is reviewing your case\n• You'll be contacted within 48 hours\n• Contact support if urgent";
      
    default:
      return "• Contact customer support for assistance\n• Provide your complaint ID when contacting support";
  }
}

export { complaintStatusTool }; 