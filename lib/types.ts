import { Id } from "@/convex/_generated/dataModel";

// SSE Constants
export const SSE_DATA_PREFIX = "data: " as const;
export const SSE_DONE_MESSAGE = "[DONE]" as const;
export const SSE_LINE_DELIMITER = "\n\n" as const;

export type MessageRole = "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
  attachments?: Array<{
    type: "image";
    url: string;
    filename: string;
    size?: number;
    mimeType?: string;
  }>;
}

export enum StreamMessageType {
  Token = "token",
  Error = "error",
  Connected = "connected",
  Done = "done",
  ToolStart = "tool_start",
  ToolEnd = "tool_end",
}

export interface BaseStreamMessage {
  type: StreamMessageType;
}

export interface TokenMessage extends BaseStreamMessage {
  type: StreamMessageType.Token;
  token: string;
}

export interface ErrorMessage extends BaseStreamMessage {
  type: StreamMessageType.Error;
  error: string;
}

export interface ConnectedMessage extends BaseStreamMessage {
  type: StreamMessageType.Connected;
}

export interface DoneMessage extends BaseStreamMessage {
  type: StreamMessageType.Done;
}

export interface ToolStartMessage extends BaseStreamMessage {
  type: StreamMessageType.ToolStart;
  tool: string;
  input: unknown;
}

export interface ToolEndMessage extends BaseStreamMessage {
  type: StreamMessageType.ToolEnd;
  tool: string;
  output: unknown;
}

export type StreamMessage =
  | TokenMessage
  | ErrorMessage
  | ConnectedMessage
  | DoneMessage
  | ToolStartMessage
  | ToolEndMessage;

export interface ChatRequestBody {
  messages: Message[];
  newMessage: string;
  chatId: Id<"chats">;
  attachments?: Array<{
    type: "image";
    url: string;
    filename: string;
    size?: number;
    mimeType?: string;
  }>;
}

export interface Order {
  _id: string; // or Id<"orders"> if you want to be more specific
  orderIdFormatted: string;
  customer: string;
  email: string;
  status: "pending" | "fulfilled" | "cancelled";
  payment: "pending" | "paid" | "refunded";
  total: number;
  items: number;
  fulfillment: "Unfulfilled" | "Shipped" | "Delivered" | "Cancelled" | "Returned" | "Refunded";
  shippingAddress: string;
  trackingNumber?: string;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export type ComplaintStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "resolved"
  | "escalated";

export type Complaint = {
  complaintId: string;
  orderId: string;
  customerEmail: string;
  complaintType: string;
  description: string;
  status: ComplaintStatus;
  urgency: string;
  internalNotes?: string;
  createdAt: number;
  // Add other fields as needed
};