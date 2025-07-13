import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
} from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import SYSTEM_MESSAGE from "@/constants/systemMessage";
import productSearchTool from "@/tools/productSearchTool";
import orderTakingTool from "@/tools/orderTakingTool";
import complaintHandlingTool from "@/tools/complaintHandlingTool";
import { 
  orderStatusTool, 
  cancelOrderTool, 
  updateOrderTool, 
  updateOrderQuantitiesTool, 
  updateShippingAddressTool 
} from "@/tools/orderManagementTools";

// Trim the messages to manage conversation history
const trimmer = trimMessages({
  maxTokens: 10,
  strategy: "last",
  tokenCounter: (msgs) => msgs.length,
  includeSystem: true,
  allowPartial: false,
  startOn: "human",
});

// Interface for image attachments
interface ImageAttachment {
  type: "image";
  url: string;
  filename: string;
  size?: number;
  mimeType?: string;
}

// Interface for message content items - Updated to match LangChain expectations
interface MessageContentItem {
  type: "text" | "image";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
  cache_control?: {
    type: "ephemeral";
  };
}

// Type for LangChain compatible content
type LangChainMessageContent = string | Array<{
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
} | {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
}>;

// Retrieve the tools
const tools = [
  updateOrderQuantitiesTool,
  updateShippingAddressTool,
  productSearchTool,
  orderTakingTool,
  orderStatusTool,
  cancelOrderTool,
  updateOrderTool,
  complaintHandlingTool,
];
const toolNode = new ToolNode(tools);

// Connect to the LLM provider with better tool instructions
const initialiseModel = () => {
  const model = new ChatAnthropic({
    modelName: "claude-3-5-sonnet-20241022",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0.7,
    maxTokens: 4096,
    streaming: true,
    clientOptions: {
      defaultHeaders: {
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
    },
  }).bindTools(tools);

  return model;
};

// Helper function to convert image attachments to Claude's format
function convertImageAttachments(attachments?: ImageAttachment[]): Array<{
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
}> {
  if (!attachments || attachments.length === 0) return [];
  
  return attachments.map(attachment => {
    // Extract base64 data from data URL
    const base64Data = attachment.url.includes(',') ? attachment.url.split(',')[1] : attachment.url;
    
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: attachment.mimeType || "image/jpeg",
        data: base64Data,
      }
    };
  });
}

// Helper function to extract text content from message
function extractTextContent(content: any): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    const textItem = content.find(item => item.type === 'text');
    if (textItem) {
      if (typeof textItem.text === 'string') {
        return textItem.text;
      }
      if (textItem.text && typeof textItem.text.text === 'string') {
        return textItem.text.text;
      }
    }
    return '';
  }
  
  return String(content || '');
}

// Helper function to create properly formatted message content
function createMessageContent(textContent: string, imageAttachments?: Array<{
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
}>): LangChainMessageContent {
  // Ensure we have some content
  if (!textContent && (!imageAttachments || imageAttachments.length === 0)) {
    return ""; // Return empty string as fallback
  }
  
  if (!imageAttachments || imageAttachments.length === 0) {
    return textContent || "";
  }
  
  // Create content array with text first, then images
  const content = [
    { type: "text" as const, text: textContent || "" },
    ...imageAttachments
  ];
  
  return content;
}

// Fixed addCachingHeaders function
function addCachingHeaders(messages: BaseMessage[]): BaseMessage[] {
  if (!messages.length) return messages;

  // Create a copy of messages to avoid mutating the original
  const cachedMessages = messages.map(msg => {
    try {
      const additionalKwargs = msg.additional_kwargs || {};
      let contentCopy: LangChainMessageContent;
      
      if (typeof msg.content === 'string') {
        contentCopy = msg.content;
      } else if (Array.isArray(msg.content)) {
        contentCopy = msg.content.map(item => {
          if (typeof item === 'object' && item !== null) {
            return { ...item };
          }
          return item;
        }) as LangChainMessageContent;
      } else {
        contentCopy = String(msg.content || '');
      }

      // Create new message instance
      if (msg instanceof HumanMessage) {
        return new HumanMessage({
          content: contentCopy,
          additional_kwargs: additionalKwargs
        });
      } else if (msg instanceof AIMessage) {
        return new AIMessage({
          content: contentCopy,
          additional_kwargs: additionalKwargs
        });
      } else if (msg instanceof SystemMessage) {
        return new SystemMessage({
          content: contentCopy,
          additional_kwargs: additionalKwargs
        });
      }
      
      return msg;
    } catch (error) {
      console.error('Error copying message:', error);
      return msg;
    }
  });

  // Helper to add cache control
  const addCache = (message: BaseMessage) => {
    try {
      if (typeof message.content === "string" && message.content.trim()) {
        message.content = [
          {
            type: "text",
            text: message.content,
            cache_control: { type: "ephemeral" },
          },
        ] as LangChainMessageContent;
      } else if (Array.isArray(message.content)) {
        message.content = message.content.map(item => {
          if (item.type === "text" && typeof item.text === "string" && item.text.trim()) {
            return {
              ...item,
              cache_control: { type: "ephemeral" },
            };
          }
          return item;
        }) as LangChainMessageContent;
      }
    } catch (error) {
      console.error('Error adding cache control:', error);
    }
  };

  // Cache the last message
  const lastMessage = cachedMessages[cachedMessages.length - 1];
  if (lastMessage) {
    addCache(lastMessage);
  }

  // Find and cache the second-to-last human message
  let humanCount = 0;
  for (let i = cachedMessages.length - 1; i >= 0; i--) {
    if (cachedMessages[i] instanceof HumanMessage) {
      humanCount++;
      if (humanCount === 2) {
        addCache(cachedMessages[i]);
        break;
      }
    }
  }

  return cachedMessages;
}

// Define the function that determines whether to continue or not
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  if (lastMessage.content && lastMessage._getType() === "tool") {
    return "agent";
  }

  return END;
}

// Define a new graph
const createWorkflow = () => {
  const model = initialiseModel();

  return new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state) => {
      try {
        const systemContent = SYSTEM_MESSAGE;

        const promptTemplate = ChatPromptTemplate.fromMessages([
          new SystemMessage(systemContent, {
            cache_control: { type: "ephemeral" },
          }),
          new MessagesPlaceholder("messages"),
        ]);

        const trimmedMessages = await trimmer.invoke(state.messages);

        const prompt = await promptTemplate.invoke({ messages: trimmedMessages });

        const response = await model.invoke(prompt);

        return { messages: [response] };
      } catch (error) {
        console.error('Error in agent node:', error);
        const errorMessage = new AIMessage("I apologize, but I encountered an error processing your request. Please try again.");
        return { messages: [errorMessage] };
      }
    })
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");
};

// Enhanced message validation
function validateMessageStructure(messages: BaseMessage[]): boolean {
  try {
    if (!messages || messages.length === 0) {
      console.error('No messages provided');
      return false;
    }

    for (const message of messages) {
      // Check if content exists and is not undefined/null
      if (message.content === undefined || message.content === null) {
        console.error('Message has undefined/null content:', message);
        return false;
      }
      
      // Check if content is empty string AND no other content
      if (message.content === '' && !Array.isArray(message.content)) {
        console.error('Message has empty string content:', message);
        return false;
      }
      
      if (Array.isArray(message.content)) {
        // Check if array is empty
        if (message.content.length === 0) {
          console.error('Message has empty content array:', message);
          return false;
        }
        
        for (const item of message.content) {
          if (!item || typeof item !== 'object') {
            console.error('Invalid content item:', item);
            return false;
          }
          
          if (item.type === 'text' && (!item.text || typeof item.text !== 'string')) {
            console.error('Invalid text content:', item);
            return false;
          }
          
          if (item.type === 'image' && !item.source) {
            console.error('Invalid image content:', item);
            return false;
          }
        }
      } else if (typeof message.content !== 'string') {
        console.error('Invalid message content type:', typeof message.content, message.content);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error validating message structure:', error);
    return false;
  }
}

// Main export function with robust image handling
export async function submitQuestion(
  messages: BaseMessage[], 
  chatId: string, 
  attachments?: ImageAttachment[]
) {
  try {
    // Validate input
    if (!messages || messages.length === 0) {
      throw new Error('No messages provided');
    }

    if (!chatId) {
      throw new Error('Chat ID is required');
    }

    // Start with a copy of the messages
    let processedMessages = [...messages];

    // Ensure all messages have proper additional_kwargs
    processedMessages = processedMessages.map(msg => {
      if (!msg.additional_kwargs) {
        if (msg instanceof HumanMessage) {
          return new HumanMessage({
            content: msg.content,
            additional_kwargs: {}
          });
        } else if (msg instanceof AIMessage) {
          return new AIMessage({
            content: msg.content,
            additional_kwargs: {}
          });
        } else if (msg instanceof SystemMessage) {
          return new SystemMessage({
            content: msg.content,
            additional_kwargs: {}
          });
        }
      }
      return msg;
    });

    // Handle image attachments for the last message
    if (attachments && attachments.length > 0 && processedMessages.length > 0) {
      const lastMessage = processedMessages[processedMessages.length - 1];
      if (lastMessage instanceof HumanMessage) {
        const textContent = extractTextContent(lastMessage.content);
        const imageAttachments = convertImageAttachments(attachments);
        const messageContent = createMessageContent(textContent, imageAttachments);
        
        // Replace the last message with the new one that includes images
        processedMessages[processedMessages.length - 1] = new HumanMessage({
          content: messageContent,
          additional_kwargs: lastMessage.additional_kwargs || {}
        });
      }
    }

    // Filter out any messages with truly empty content
    const validMessages = processedMessages.filter(msg => {
      if (!msg.content) return false;
      
      if (typeof msg.content === 'string' && msg.content.trim() === '') {
        return false;
      }
      
      if (Array.isArray(msg.content) && msg.content.length === 0) {
        return false;
      }
      
      return true;
    });

    // Ensure we have at least one valid message
    if (validMessages.length === 0) {
      throw new Error('No valid messages after filtering');
    }

    // Add caching headers
    const cachedMessages = addCachingHeaders(validMessages);

    // Final validation
    if (!validateMessageStructure(cachedMessages)) {
      console.error('Message validation failed after processing');
      throw new Error('Invalid message structure');
    }

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Final processed messages:', cachedMessages.map(msg => ({
        type: msg.constructor.name,
        content: typeof msg.content === 'string' ? msg.content.substring(0, 100) + '...' : 'Array content',
        hasContent: !!msg.content
      })));
    }

    // Create workflow
    const workflow = createWorkflow();
    const checkpointer = new MemorySaver();
    const app = workflow.compile({ checkpointer });

    const stream = await app.streamEvents(
      { messages: cachedMessages },
      {
        version: "v2",
        configurable: { thread_id: chatId },
        streamMode: "messages",
        runId: chatId,
      }
    );

    return stream;
  } catch (error) {
    console.error('Error in submitQuestion:', error);
    throw error;
  }
}

// Helper function to create a simple text message
export function createHumanMessage(text: string): HumanMessage {
  return new HumanMessage({
    content: text,
    additional_kwargs: {}
  });
}

// Helper function to create a system message
export function createSystemMessage(text: string): SystemMessage {
  return new SystemMessage({
    content: text,
    additional_kwargs: {}
  });
}

// Helper function to format error messages
export function createErrorMessage(error: string): AIMessage {
  return new AIMessage({
    content: `I apologize, but I encountered an error: ${error}. Please try again.`,
    additional_kwargs: {}
  });
}

// Export types for use in other files
export type { ImageAttachment, LangChainMessageContent };