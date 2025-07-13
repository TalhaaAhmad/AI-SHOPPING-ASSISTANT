import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

// Store policies configuration
const STORE_POLICIES = {
  returns: {
    timeLimit: 30, // days
    eligibleStatuses: ["delivered"],
    nonReturnableCategories: ["electronics", "software", "perishables"],
    conditionRequired: "unused",
    originalPackaging: true,
    restockingFee: 0.15, // 15% for certain categories
    restockingFeeCategories: ["electronics", "appliances"]
  },
  refunds: {
    processingTime: "5-7 business days",
    methods: ["original_payment", "store_credit"],
    fullRefundTimeLimit: 14, // days
    partialRefundAfter: 30 // days
  },
  exchanges: {
    timeLimit: 30, // days
    sameCategoryOnly: false,
    priceDifferencePolicy: "pay_difference_or_store_credit"
  },
  damages: {
    reportTimeLimit: 7, // days after delivery
    photoEvidenceRequired: true,
    replacementFirst: true, // try replacement before refund
    shippingCoverage: true
  },
  warranties: {
    manufacturerWarranty: true,
    storeWarranty: 90, // days
    extendedWarrantyAvailable: true
  }
};

// Complaint types enum
enum ComplaintType {
  RETURN = "return",
  EXCHANGE = "exchange",
  REFUND = "refund",
  DAMAGED_ITEM = "damaged_item",
  WRONG_ITEM = "wrong_item",
  MISSING_ITEM = "missing_item",
  DEFECTIVE_ITEM = "defective_item",
  LATE_DELIVERY = "late_delivery",
  POOR_QUALITY = "poor_quality",
  WARRANTY_CLAIM = "warranty_claim",
  BILLING_ISSUE = "billing_issue",
  SHIPPING_ISSUE = "shipping_issue",
  CUSTOMER_SERVICE = "customer_service",
  OTHER = "other"
}

// Complaint status enum
enum ComplaintStatus {
  DRAFT = "draft", // New status for incomplete complaints
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

interface ComplaintValidationResult {
  isValid: boolean;
  message: string;
  suggestedResolution?: ResolutionType;
  additionalInfo?: string;
  missingInfo?: string[];
}

interface ComplaintRequirements {
  complaintType: ComplaintType;
  requiredFields: string[];
  conditionalRequirements: {
    field: string;
    condition: any;
    requiredFields: string[];
  }[];
}

// Define requirements for each complaint type
const COMPLAINT_REQUIREMENTS: { [key in ComplaintType]: ComplaintRequirements } = {
  [ComplaintType.RETURN]: {
    complaintType: ComplaintType.RETURN,
    requiredFields: ["orderId", "customerEmail", "description", "affectedProducts"],
    conditionalRequirements: []
  },
  [ComplaintType.EXCHANGE]: {
    complaintType: ComplaintType.EXCHANGE,
    requiredFields: ["orderId", "customerEmail", "description", "affectedProducts"],
    conditionalRequirements: []
  },
  [ComplaintType.REFUND]: {
    complaintType: ComplaintType.REFUND,
    requiredFields: ["orderId", "customerEmail", "description", "affectedProducts"],
    conditionalRequirements: []
  },
  [ComplaintType.DAMAGED_ITEM]: {
    complaintType: ComplaintType.DAMAGED_ITEM,
    requiredFields: ["orderId", "customerEmail", "description", "affectedProducts", "hasEvidence"],
    conditionalRequirements: [
      {
        field: "hasEvidence",
        condition: false,
        requiredFields: ["evidenceDescription"]
      }
    ]
  },
  [ComplaintType.WRONG_ITEM]: {
    complaintType: ComplaintType.WRONG_ITEM,
    requiredFields: ["orderId", "customerEmail", "description", "affectedProducts"],
    conditionalRequirements: []
  },
  [ComplaintType.MISSING_ITEM]: {
    complaintType: ComplaintType.MISSING_ITEM,
    requiredFields: ["orderId", "customerEmail", "description", "affectedProducts"],
    conditionalRequirements: []
  },
  [ComplaintType.DEFECTIVE_ITEM]: {
    complaintType: ComplaintType.DEFECTIVE_ITEM,
    requiredFields: ["orderId", "customerEmail", "description", "affectedProducts"],
    conditionalRequirements: []
  },
  [ComplaintType.LATE_DELIVERY]: {
    complaintType: ComplaintType.LATE_DELIVERY,
    requiredFields: ["orderId", "customerEmail", "description"],
    conditionalRequirements: []
  },
  [ComplaintType.POOR_QUALITY]: {
    complaintType: ComplaintType.POOR_QUALITY,
    requiredFields: ["orderId", "customerEmail", "description", "affectedProducts"],
    conditionalRequirements: []
  },
  [ComplaintType.WARRANTY_CLAIM]: {
    complaintType: ComplaintType.WARRANTY_CLAIM,
    requiredFields: ["orderId", "customerEmail", "description", "affectedProducts"],
    conditionalRequirements: []
  },
  [ComplaintType.BILLING_ISSUE]: {
    complaintType: ComplaintType.BILLING_ISSUE,
    requiredFields: ["orderId", "customerEmail", "description"],
    conditionalRequirements: []
  },
  [ComplaintType.SHIPPING_ISSUE]: {
    complaintType: ComplaintType.SHIPPING_ISSUE,
    requiredFields: ["orderId", "customerEmail", "description"],
    conditionalRequirements: []
  },
  [ComplaintType.CUSTOMER_SERVICE]: {
    complaintType: ComplaintType.CUSTOMER_SERVICE,
    requiredFields: ["customerEmail", "description"],
    conditionalRequirements: []
  },
  [ComplaintType.OTHER]: {
    complaintType: ComplaintType.OTHER,
    requiredFields: ["orderId", "customerEmail", "description"],
    conditionalRequirements: []
  }
};

const complaintHandlingTool = new DynamicStructuredTool({
  name: "handleComplaint",
  description: "Handles customer complaints including returns, exchanges, refunds, damages, and other e-commerce issues. Creates complaint only when all required information is complete.",
  schema: z.object({
    orderId: z.string().optional().describe("The order ID associated with the complaint"),
    customerEmail: z.string().email().describe("Customer email address"),
    complaintType: z.enum([
      "return", "exchange", "refund", "damaged_item", "wrong_item", 
      "missing_item", "defective_item", "late_delivery", "poor_quality", 
      "warranty_claim", "billing_issue", "shipping_issue", "customer_service", "other"
    ]).describe("Type of complaint"),
    description: z.string().optional().describe("Detailed description of the complaint"),
    affectedProducts: z.array(z.string()).optional().describe("Names of products affected by the complaint"),
    hasEvidence: z.boolean().optional().describe("Whether customer has provided evidence (photos, videos, etc.)"),
    evidenceDescription: z.string().optional().describe("Description of evidence provided for damage claims"),
    preferredResolution: z.enum([
      "full_refund", "partial_refund", "store_credit", "replacement", 
      "exchange", "repair", "compensation", "apology", "policy_explanation", "no_action"
    ]).optional().describe("Customer's preferred resolution"),
    urgency: z.enum(["low", "medium", "high", "critical"]).optional().describe("Urgency level of the complaint"),
    createComplaint: z.boolean().optional().describe("Whether to create the complaint record (only when all info is complete)")
  }),
  func: async ({ 
    orderId, 
    customerEmail, 
    complaintType, 
    description, 
    affectedProducts = [], 
    hasEvidence = false,
    evidenceDescription,
    preferredResolution,
    urgency = "medium",
    createComplaint = false
  }) => {
    try {
      const convexClient = getConvexClient();
      
      // First, check if we have an existing draft complaint to avoid duplicates
      let existingDraft = null;
      if (orderId) {
        existingDraft = await convexClient.query(api.complaints.getDraftComplaint, {
          orderId,
          customerEmail,
          complaintType: complaintType as ComplaintType
        });
      }

      // Validate order if orderId is provided
      let order = null;
      if (orderId) {
        order = await convexClient.query(api.orders.getOrderByFormattedId, { 
          orderIdFormatted: orderId 
        });

        if (!order) {
          return "❌ Order not found. Please verify the order ID and try again.";
        }

        // Verify customer email matches order
        if (order.email.toLowerCase() !== customerEmail.toLowerCase()) {
          return "❌ Email address does not match the order. Please verify your email and try again.";
        }
      }

      // Check if all required information is complete
      const completenessCheck = checkComplaintCompleteness(
        complaintType as ComplaintType,
        { orderId, customerEmail, description, affectedProducts, hasEvidence, evidenceDescription }
      );

      if (!completenessCheck.isComplete) {
        // Information is incomplete - guide user to provide missing info
        let response = `📋 **Complaint Information Gathering**\n\n`;
        response += `We need some additional information to process your ${complaintType.replace('_', ' ')} complaint:\n\n`;
        
        if (completenessCheck.missingInfo && completenessCheck.missingInfo.length > 0) {
          response += `**Missing Information:**\n`;
          completenessCheck.missingInfo.forEach(info => {
            response += `• ${formatFieldName(info)}\n`;
          });
        }

        if (completenessCheck.guidance) {
          response += `\n**Guidance:**\n${completenessCheck.guidance}\n`;
        }

        response += `\n💡 **Next Steps:**\n`;
        response += `Please provide the missing information above, and I'll process your complaint once all details are complete.\n\n`;
        
        if (existingDraft) {
          response += `📝 **Note:** We have your partial complaint saved and will update it once you provide the complete information.`;
        }

        return response;
      }

      // All information is complete - proceed with validation and creation
      if (!createComplaint) {
        // Show preview before creating
        const validation = validateComplaint(complaintType as ComplaintType, order, hasEvidence, description || "");
        const resolution = determineResolution(
          complaintType as ComplaintType,
          order,
          validation,
          preferredResolution as ResolutionType,
          affectedProducts
        );

        let response = `✅ **Complaint Preview - ${complaintType.replace('_', ' ').toUpperCase()}**\n\n`;
        response += `📋 **Complaint Details:**\n`;
        response += `• Order ID: ${orderId}\n`;
        response += `• Type: ${complaintType.replace('_', ' ')}\n`;
        response += `• Description: ${description}\n`;
        if (affectedProducts.length > 0) {
          response += `• Affected Products: ${affectedProducts.join(', ')}\n`;
        }
        response += `• Priority: ${urgency}\n\n`;

        response += `🔍 **Policy Review:**\n`;
        response += `${validation.message}\n\n`;

        if (validation.isValid) {
          response += `💡 **Proposed Resolution:**\n`;
          response += `• Action: ${resolution.type.replace('_', ' ').toUpperCase()}\n`;
          response += `• Details: ${resolution.details}\n`;
          
          if ((resolution.compensation ?? 0) > 0) {
            response += `• Compensation: $${(resolution.compensation ?? 0).toFixed(2)}\n`;
          }
          
          response += `\n✅ **Ready to Submit:**\n`;
          response += `Your complaint is complete and ready to be submitted. I'll create the official complaint record now.\n`;
        } else {
          response += `❌ **Cannot Process:**\n`;
          response += `${validation.message}\n`;
          return response;
        }

        // Auto-create the complaint since all info is complete
        createComplaint = true;
      }

      if (createComplaint) {
        // Validate complaint against store policies
        const validation = validateComplaint(complaintType as ComplaintType, order, hasEvidence, description || "");
        
        if (!validation.isValid) {
          return `❌ ${validation.message}`;
        }

        // Check for existing complaint to prevent duplicates
        const existingComplaint = await convexClient.query(api.complaints.getExistingComplaint, {
          orderId: orderId || "",
          customerEmail,
          complaintType: complaintType as ComplaintType
        });

        if (existingComplaint && existingComplaint.status !== ComplaintStatus.DRAFT) {
          return `⚠️ **Duplicate Complaint Detected**\n\nYou already have a ${complaintType.replace('_', ' ')} complaint (ID: ${existingComplaint.complaintId}) for this order.\n\n**Current Status:** ${existingComplaint.status}\n\nIf you need to update this complaint, please reference the existing complaint ID or contact customer support.`;
        }

        // Generate complaint ID
        const complaintId = `CMP-${Date.now()}`;

        // Determine resolution based on policy compliance
        const resolution = determineResolution(
          complaintType as ComplaintType,
          order,
          validation,
          preferredResolution as ResolutionType,
          affectedProducts
        );

        // Create or update complaint record in Convex
        const complaintRecord = existingDraft 
          ? await convexClient.mutation(api.complaints.updateComplaint, {
              complaintId: existingDraft.complaintId,
              status: ComplaintStatus.SUBMITTED,
              description: description || "",
              affectedProducts,
              hasEvidence,
              evidenceDescription,
              preferredResolution: preferredResolution as ResolutionType,
              suggestedResolution: resolution.type,
              urgency,
              resolutionDetails: resolution.details,
              compensationAmount: resolution.compensation || 0
            })
          : await convexClient.mutation(api.complaints.createComplaint, {
              orderId: orderId || "",
              customerEmail,
              complaintType: complaintType as ComplaintType,
              description: description || "",
              affectedProducts,
              hasEvidence,
              preferredResolution: preferredResolution as ResolutionType,
              suggestedResolution: resolution.type,
              status: ComplaintStatus.SUBMITTED,
              urgency,
              resolutionDetails: resolution.details,
              compensationAmount: resolution.compensation || 0
            });

        // Format response based on resolution
        return formatComplaintResponse(complaintRecord, resolution, order, validation);
      }

      return "❌ Unexpected error occurred. Please try again.";

    } catch (error) {
      console.error("Complaint handling failed:", error);
      return "❌ Failed to process your complaint. Please try again later or contact customer support directly.";
    }
  }
});

// Check if complaint has all required information
function checkComplaintCompleteness(
  complaintType: ComplaintType,
  data: any
): { isComplete: boolean; missingInfo?: string[]; guidance?: string } {
  const requirements = COMPLAINT_REQUIREMENTS[complaintType];
  const missingInfo: string[] = [];
  
  // Check required fields
  requirements.requiredFields.forEach(field => {
    if (!data[field] || (Array.isArray(data[field]) && data[field].length === 0)) {
      missingInfo.push(field);
    }
  });

  // Check conditional requirements
  requirements.conditionalRequirements.forEach(({ field, condition, requiredFields }) => {
    if (data[field] === condition) {
      requiredFields.forEach(reqField => {
        if (!data[reqField]) {
          missingInfo.push(reqField);
        }
      });
    }
  });

  // Special guidance for specific complaint types
  let guidance = "";
  switch (complaintType) {
    case ComplaintType.DAMAGED_ITEM:
      if (!data.hasEvidence) {
        guidance = "For damage claims, photos are required. Please prepare photos of the damaged item before submitting.";
      }
      break;
    case ComplaintType.RETURN:
      guidance = "Please specify which products you want to return and ensure they are in original condition.";
      break;
    case ComplaintType.EXCHANGE:
      guidance = "Please specify which products you want to exchange and what you'd like to exchange them for.";
      break;
  }

  return {
    isComplete: missingInfo.length === 0,
    missingInfo: missingInfo.length > 0 ? missingInfo : undefined,
    guidance: guidance || undefined
  };
}

// Format field names for user display
function formatFieldName(field: string): string {
  const fieldLabels: { [key: string]: string } = {
    orderId: "Order ID",
    customerEmail: "Customer Email",
    description: "Detailed description of the issue",
    affectedProducts: "Names of affected products",
    hasEvidence: "Whether you have photos/evidence",
    evidenceDescription: "Description of evidence provided"
  };
  
  return fieldLabels[field] || field.replace(/([A-Z])/g, ' $1').toLowerCase();
}

// Validate complaint against store policies
function validateComplaint(
  complaintType: ComplaintType,
  order: any,
  hasEvidence: boolean,
  description: string
): ComplaintValidationResult {
  if (!order) {
    return {
      isValid: false,
      message: "Order information is required for this complaint type."
    };
  }

  const daysSinceOrder = Math.floor((Date.now() - order.createdAt) / (1000 * 60 * 60 * 24));
  
  switch (complaintType) {
    case ComplaintType.RETURN:
      if (daysSinceOrder > STORE_POLICIES.returns.timeLimit) {
        return {
          isValid: false,
          message: `Return window has expired. Returns must be initiated within ${STORE_POLICIES.returns.timeLimit} days of delivery.`
        };
      }
      if (!STORE_POLICIES.returns.eligibleStatuses.includes(order.fulfillment?.toLowerCase())) {
        return {
          isValid: false,
          message: `Returns are only available for delivered orders. Current status: ${order.fulfillment}`
        };
      }
      return {
        isValid: true,
        message: "Return request is within policy guidelines.",
        suggestedResolution: ResolutionType.FULL_REFUND
      };

    case ComplaintType.EXCHANGE:
      if (daysSinceOrder > STORE_POLICIES.exchanges.timeLimit) {
        return {
          isValid: false,
          message: `Exchange window has expired. Exchanges must be initiated within ${STORE_POLICIES.exchanges.timeLimit} days of delivery.`
        };
      }
      return {
        isValid: true,
        message: "Exchange request is within policy guidelines.",
        suggestedResolution: ResolutionType.EXCHANGE
      };

    case ComplaintType.DAMAGED_ITEM:
      if (daysSinceOrder > STORE_POLICIES.damages.reportTimeLimit) {
        return {
          isValid: false,
          message: `Damage reports must be filed within ${STORE_POLICIES.damages.reportTimeLimit} days of delivery.`
        };
      }
      if (!hasEvidence && STORE_POLICIES.damages.photoEvidenceRequired) {
        return {
          isValid: false,
          message: "Photo evidence is required for damage claims. Please provide photos of the damaged item."
        };
      }
      return {
        isValid: true,
        message: "Damage claim meets policy requirements.",
        suggestedResolution: STORE_POLICIES.damages.replacementFirst ? ResolutionType.REPLACEMENT : ResolutionType.FULL_REFUND
      };

    case ComplaintType.WRONG_ITEM:
    case ComplaintType.MISSING_ITEM:
      return {
        isValid: true,
        message: "Order accuracy issue will be resolved promptly.",
        suggestedResolution: ResolutionType.REPLACEMENT
      };

    case ComplaintType.DEFECTIVE_ITEM:
      if (daysSinceOrder <= STORE_POLICIES.warranties.storeWarranty) {
        return {
          isValid: true,
          message: "Item is within store warranty period.",
          suggestedResolution: ResolutionType.REPLACEMENT
        };
      }
      return {
        isValid: true,
        message: "Item may be covered under manufacturer warranty.",
        suggestedResolution: ResolutionType.REPAIR,
        additionalInfo: "Please check with manufacturer for warranty coverage."
      };

    case ComplaintType.LATE_DELIVERY:
      return {
        isValid: true,
        message: "Late delivery complaint acknowledged.",
        suggestedResolution: ResolutionType.COMPENSATION
      };

    case ComplaintType.REFUND:
      if (daysSinceOrder <= STORE_POLICIES.refunds.fullRefundTimeLimit) {
        return {
          isValid: true,
          message: "Eligible for full refund.",
          suggestedResolution: ResolutionType.FULL_REFUND
        };
      } else if (daysSinceOrder <= STORE_POLICIES.refunds.partialRefundAfter) {
        return {
          isValid: true,
          message: "Eligible for partial refund or store credit.",
          suggestedResolution: ResolutionType.PARTIAL_REFUND
        };
      }
      return {
        isValid: false,
        message: "Refund window has expired. Please check our return policy."
      };

    default:
      return {
        isValid: true,
        message: "Complaint will be reviewed by our customer service team.",
        suggestedResolution: ResolutionType.POLICY_EXPLANATION
      };
  }
}

// Determine resolution based on policies and complaint details
function determineResolution(
  complaintType: ComplaintType,
  order: any,
  validation: ComplaintValidationResult,
  preferredResolution?: ResolutionType,
  affectedProducts: string[] = []
): { type: ResolutionType; details: string; compensation?: number } {
  const baseResolution = validation.suggestedResolution || ResolutionType.POLICY_EXPLANATION;
  
  // Calculate potential compensation
  const orderTotal = order?.total || 0;
  const affectedValue = affectedProducts.length > 0 && order
    ? calculateAffectedProductsValue(order.products, affectedProducts)
    : orderTotal;

  switch (complaintType) {
    case ComplaintType.RETURN:
      const hasRestockingFee = order?.products?.some((p: any) => 
        STORE_POLICIES.returns.restockingFeeCategories.includes(p.category?.toLowerCase())
      );
      const restockingAmount = hasRestockingFee ? affectedValue * STORE_POLICIES.returns.restockingFee : 0;
      
      return {
        type: ResolutionType.FULL_REFUND,
        details: `Full refund of $${affectedValue.toFixed(2)}${restockingAmount > 0 ? ` minus restocking fee of $${restockingAmount.toFixed(2)}` : ''}`,
        compensation: affectedValue - restockingAmount
      };

    case ComplaintType.DAMAGED_ITEM:
      return {
        type: ResolutionType.REPLACEMENT,
        details: `Free replacement of damaged item(s). We'll also cover return shipping costs.`,
        compensation: 0
      };

    case ComplaintType.WRONG_ITEM:
      return {
        type: ResolutionType.REPLACEMENT,
        details: `We'll send the correct item and provide a prepaid return label for the wrong item.`,
        compensation: 0
      };

    case ComplaintType.MISSING_ITEM:
      return {
        type: ResolutionType.REPLACEMENT,
        details: `We'll immediately ship the missing item(s) at no additional cost.`,
        compensation: 0
      };

    case ComplaintType.LATE_DELIVERY:
      return {
        type: ResolutionType.COMPENSATION,
        details: `We apologize for the delay. You'll receive a store credit as compensation.`,
        compensation: Math.min(orderTotal * 0.1, 25) // 10% of order or $25, whichever is less
      };

    case ComplaintType.DEFECTIVE_ITEM:
      return {
        type: ResolutionType.REPLACEMENT,
        details: `We'll replace the defective item under our quality guarantee.`,
        compensation: 0
      };

    case ComplaintType.EXCHANGE:
      return {
        type: ResolutionType.EXCHANGE,
        details: `We'll process your exchange. Any price difference will be charged or credited to your account.`,
        compensation: 0
      };

    default:
      return {
        type: ResolutionType.POLICY_EXPLANATION,
        details: `Your complaint will be reviewed by our customer service team within 24-48 hours.`,
        compensation: 0
      };
  }
}

// Calculate value of affected products
function calculateAffectedProductsValue(orderProducts: any[], affectedProductNames: string[]): number {
  return orderProducts
    .filter(product => affectedProductNames.some(name => 
      product.name.toLowerCase().includes(name.toLowerCase())
    ))
    .reduce((total, product) => total + (product.price * product.quantity), 0);
}

// Format the response message
function formatComplaintResponse(
  complaint: any,
  resolution: any,
  order: any,
  validation: ComplaintValidationResult
): string {
  const complaintTypeFormatted = complaint.complaintType.replace('_', ' ').toUpperCase();
  
  let response = `✅ **Complaint Submitted - ${complaintTypeFormatted}**\n\n`;
  response += `📋 **Complaint Details:**\n`;
  response += `• Complaint ID: ${complaint.complaintId}\n`;
  response += `• Order ID: ${complaint.orderId}\n`;
  response += `• Status: ${complaint.status}\n`;
  response += `• Priority: ${complaint.urgency}\n\n`;

  response += `🔍 **Policy Review:**\n`;
  response += `${validation.message}\n\n`;

  response += `💡 **Approved Resolution:**\n`;
  response += `• Action: ${resolution.type.replace('_', ' ').toUpperCase()}\n`;
  response += `• Details: ${resolution.details}\n`;
  
  if ((resolution.compensation ?? 0) > 0) {
    response += `• Compensation: $${(resolution.compensation ?? 0).toFixed(2)}\n`;
  }
  
  response += `\n📞 **Next Steps:**\n`;
  
  switch (resolution.type) {
    case ResolutionType.REPLACEMENT:
      response += `• We'll process your replacement within 1-2 business days\n`;
      response += `• You'll receive tracking information via email\n`;
      response += `• Return label will be provided for the original item\n`;
      break;
      
    case ResolutionType.FULL_REFUND:
    case ResolutionType.PARTIAL_REFUND:
      response += `• Refund will be processed within ${STORE_POLICIES.refunds.processingTime}\n`;
      response += `• Refund will be issued to your original payment method\n`;
      response += `• Please return the item using the provided return label\n`;
      break;
      
    case ResolutionType.EXCHANGE:
      response += `• Contact our customer service to select your exchange item\n`;
      response += `• We'll process the exchange once we receive your return\n`;
      break;
      
    case ResolutionType.STORE_CREDIT:
      response += `• Store credit will be applied to your account within 24 hours\n`;
      response += `• Credit can be used for future purchases\n`;
      break;
      
    case ResolutionType.COMPENSATION:
      response += `• Compensation will be processed as store credit\n`;
      response += `• You'll receive a confirmation email with the credit amount\n`;
      break;
      
    default:
      response += `• Our customer service team will contact you within 24-48 hours\n`;
      response += `• Please keep your complaint ID for reference\n`;
  }

  response += `\n📧 **Contact Information:**\n`;
  response += `• Email: support@yourstore.com\n`;
  response += `• Phone: 1-800-SUPPORT\n`;
  response += `• Live Chat: Available 24/7 on our website\n\n`;
  
  response += `Thank you for bringing this to our attention. We're committed to resolving this matter promptly and to your satisfaction.`;

  return response;
}

export default complaintHandlingTool;