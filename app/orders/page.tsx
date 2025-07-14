"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Package, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  Plus,
  ArrowLeft,
  Truck,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  Eye,
  X,
  User,
  Bot,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';

type Order = {
  _id: Id<"orders">;
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
  id: string;
  date: string;
  totalFormatted: string;
};

export default function OrdersDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<Id<"orders">[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedOrderId, setSelectedOrderId] = useState<Id<"orders"> | null>(null);

  // Chat interface state
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<Order | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Convex queries and mutations
  const orders = useQuery(api.order.getOrders, {
    searchQuery: searchQuery || undefined,
    statusFilter: statusFilter !== 'all' ? statusFilter : undefined
  });

  const selectedOrder = useQuery(api.order.getOrder, 
    selectedOrderId ? { id: selectedOrderId } : "skip"
  );

  // Chat query for selected order
  const orderChat = useQuery(api.order.getOrderChat, 
    selectedOrderForChat ? { orderId: selectedOrderForChat._id } : "skip"
  );

  const updateOrderStatus = useMutation(api.order.updateOrderStatus);
  const bulkUpdateStatus = useMutation(api.order.bulkUpdateStatus);
  const updateOrderDelivery = useMutation(api.order.updateOrderDelivery);

  const [editingOrderId, setEditingOrderId] = useState<Id<"orders"> | null>(null);
  const [newTracking, setNewTracking] = useState("");
  const [newFulfillment, setNewFulfillment] = useState<"Unfulfilled" | "Shipped" | "Delivered" | "Cancelled" | "Returned" | "Refunded">("Unfulfilled");

  const [fulfillModalOrder, setFulfillModalOrder] = useState<Order | null>(null);
  const [fulfillTracking, setFulfillTracking] = useState("");
  const [fulfillPayment, setFulfillPayment] = useState<"pending" | "paid" | "refunded">("paid");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      fulfilled: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    return `px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`;
  };

  const getPaymentBadge = (payment: string) => {
    const styles = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${styles[payment as keyof typeof styles]}`;
  };

  const handleOrderSelect = (orderId: Id<"orders">) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrderId(order._id);
    setViewMode('detail');
  };

  const handleStatusChange = async (orderId: Id<"orders">, newStatus: "pending" | "fulfilled" | "cancelled") => {
    await updateOrderStatus({ id: orderId, status: newStatus });
  };

  const handleBulkStatusUpdate = async (newStatus: "pending" | "fulfilled" | "cancelled") => {
    if (selectedOrders.length > 0) {
      await bulkUpdateStatus({ orderIds: selectedOrders, status: newStatus });
      setSelectedOrders([]);
    }
  };

  const handleFulfill = (order: Order) => {
    setFulfillModalOrder(order);
    setFulfillTracking(order.trackingNumber || "");
    setFulfillPayment(order.payment || "paid");
  };

  const handleFulfillSubmit = async () => {
    if (!fulfillModalOrder) return;
    await updateOrderDelivery({
      id: fulfillModalOrder._id,
      fulfillment: "Shipped",
      trackingNumber: fulfillTracking,
      payment: fulfillPayment,
    });
    setFulfillModalOrder(null);
  };

  // Chat interface helper functions
  const openChatInterface = (order: Order) => {
    setSelectedOrderForChat(order);
    setShowChatInterface(true);
  };

  const closeChatInterface = () => {
    setShowChatInterface(false);
    setSelectedOrderForChat(null);
    setSelectedImage(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatContent = (content: string) => {
    return content.replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  };

  // ChatMessage component
  const ChatMessage = ({ message }: { message: any }) => {
    const hasAttachments = message.attachments && message.attachments.length > 0;
    const imageAttachments = hasAttachments ? message.attachments.filter((att: any) => att.type === 'image') : [];

    // Helper to get correct image src
    const getImageSrc = (attachment: any) => {
      if (!attachment.url) return '';
      
      // If it's already a complete data URL, use it as-is
      if (attachment.url.startsWith('data:image')) {
        return attachment.url;
      }
      
      // If it's a regular HTTP URL, use it as-is
      if (attachment.url.startsWith('http')) {
        return attachment.url;
      }
      
      // If it's a Convex storage URL, use it directly
      if (attachment.url.includes('.convex.cloud') || attachment.url.includes('.convex.dev')) {
        return attachment.url;
      }
      
      // Check if it's base64 data without the data: prefix
      if (attachment.url.match(/^[A-Za-z0-9+/]+=*$/)) {
        const mimeType = attachment.mimeType || 'image/jpeg';
        return `data:${mimeType};base64,${attachment.url}`;
      }
      
      // Last resort: try to use the URL as-is
      return attachment.url;
    };

    return (
      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            message.role === 'user' ? 'bg-blue-500 ml-2' : 'bg-gray-500 mr-2'
          }`}>
            {message.role === 'user' ? (
              message.imageUrl ? (
                <img 
                  src={message.imageUrl} 
                  alt="User avatar" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-white" />
              )
            ) : (
              <Bot className="w-4 h-4 text-white" />
            )}
          </div>
          <div className={`rounded-lg px-4 py-2 ${
            message.role === 'user' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-800'
          }`}>
            <div className="text-xs opacity-75 mb-1 flex items-center justify-between">
              <span>
                {message.role === 'user' && (message.username || message.email) ? (
                  <span className="font-medium">
                    {message.username || `${message.firstName} ${message.lastName}`.trim() || message.email}
                  </span>
                ) : ( 
                  <span>Assistant</span>
                )}
              </span>
              <span>{formatDate(message.createdAt)}</span>
            </div>
            
            {/* Text Content */}
            {message.content && message.content.trim() && (
              <div className="whitespace-pre-wrap break-words mb-2">
                {formatContent(message.content)}
              </div>
            )}
            
            {/* Image Attachments */}
            {imageAttachments.length > 0 && (
              <div className="space-y-2">
                {imageAttachments.map((attachment: any, index: number) => {
                  const src = getImageSrc(attachment);              
                  return (
                    <div key={index} className="relative">
                      <div className="flex items-center space-x-2 mb-1">
                        <ImageIcon className="w-4 h-4 opacity-70" />
                        <span className="text-xs opacity-70">{attachment.filename}</span>
                        {attachment.size && (
                          <span className="text-xs opacity-50">
                            ({(attachment.size / 1024).toFixed(1)}KB)
                          </span>
                        )}
                      </div>
                      
                      <div className="relative group">
                        <img
                          src={attachment.url}
                          alt={attachment.filename}
                          className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-gray-300"
                          onClick={() => setSelectedImage(src)}
                          style={{ 
                            background: "#f9f9f9",
                            border: "1px solid #e5e7eb"
                          }}
                        />
                        
                        <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center pointer-events-none">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-6 h-6 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* No content indicator */}
            {!message.content?.trim() && imageAttachments.length === 0 && (
              <div className="text-xs opacity-50 italic">
                Empty message
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Image Modal Component
  const ImageModal = () => {
    if (!selectedImage) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
        <div className="relative max-w-4xl max-h-[90vh]">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full size image"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      </div>
    );
  };

  const ChatInterface = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold">
                Order Chat - {selectedOrderForChat?.id || 'Unknown Order'}
              </h3>
              <div className="text-sm text-gray-600 flex items-center space-x-2">
                <span>Customer: {selectedOrderForChat?.customer}</span>
                <span>•</span>
                <span>{selectedOrderForChat?.email}</span>
              </div>
            </div>
          </div>
          <button
            onClick={closeChatInterface}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!orderChat ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Loading chat messages...</p>
              </div>
            </div>
          ) : !orderChat.chat ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No chat found for this order</p>
              </div>
            </div>
          ) : orderChat.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No messages in this conversation</p>
              </div>
            </div>
          ) : (
            orderChat.messages.map((message) => (
              <ChatMessage key={message._id} message={message} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Order: {selectedOrderForChat?.id} • 
              Status: {selectedOrderForChat?.status} • 
              Total: {selectedOrderForChat?.totalFormatted}
            </span>
            <span>
              {orderChat?.messages?.length || 0} messages
            </span>
          </div>
        </div>
      </div>
      
      {/* Image Modal */}
      <ImageModal />
    </div>
  );

  const OrderDetailView = () => {
    if (!selectedOrder) return <div>Loading...</div>;

    return (
      <div className="bg-white">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setViewMode('list')}
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to orders
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Order {selectedOrder.id}</h1>
            <span className={getStatusBadge(selectedOrder.status)}>
              {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
            </span>
          </div>
          <div className="flex space-x-2">
            <select
              value={selectedOrder.status}
              onChange={(e) => handleStatusChange(selectedOrder._id, e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button 
              onClick={() => {
                setFulfillModalOrder(selectedOrder);
                setFulfillTracking(selectedOrder.trackingNumber || "");
                setFulfillPayment(selectedOrder.payment || "paid");
              }}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Fulfilled
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
              Print
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Products</h3>
                <div className="space-y-4">
                  {selectedOrder.products.map((product, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {product.quantity}</p>
                      </div>
                      <p className="font-medium text-gray-900">${(product.price * product.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-lg text-gray-900">{selectedOrder.totalFormatted}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Customer Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-medium text-gray-900">{selectedOrder.customer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{selectedOrder.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Shipping Address</p>
                    <p className="font-medium text-gray-900">{selectedOrder.shippingAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID</span>
                    <span className="font-medium">{selectedOrder.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="font-medium">{selectedOrder.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status</span>
                    <span className={getPaymentBadge(selectedOrder.payment)}>
                      {selectedOrder.payment.charAt(0).toUpperCase() + selectedOrder.payment.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fulfillment</span>
                    <span className="font-medium">{selectedOrder.fulfillment}</span>
                  </div>
                  {selectedOrder.trackingNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tracking</span>
                      <span className="font-medium text-blue-600">{selectedOrder.trackingNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleStatusChange(selectedOrder._id, "fulfilled")}
                    className="w-full px-4 py-2 text-left bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
                  >
                    Mark as Fulfilled
                  </button>
                  <button 
                    onClick={() => handleStatusChange(selectedOrder._id, "cancelled")}
                    className="w-full px-4 py-2 text-left bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!orders) return null;
    
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const fulfilledOrders = orders.filter(order => order.status === 'fulfilled').length;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
    const deliveredOrders = orders.filter(order => order.fulfillment === 'Delivered').length;
    const shippedOrders = orders.filter(order => order.fulfillment === 'Shipped').length;
    
    const fulfillmentRate = totalOrders > 0 ? (fulfilledOrders / totalOrders * 100).toFixed(1) : '0';
    const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0';
    const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders * 100).toFixed(1) : '0';
    
    return {
      totalOrders,
      totalRevenue,
      fulfilledOrders,
      pendingOrders,
      cancelledOrders,
      deliveredOrders,
      shippedOrders,
      fulfillmentRate,
      averageOrderValue,
      deliveryRate
    };
  }, [orders]);

  if (viewMode === 'detail' && selectedOrder) {
    return <OrderDetailView />;
  }

  if (!orders) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Package className="mx-auto w-12 h-12 text-gray-400 animate-pulse" />
        <p className="mt-2 text-gray-600">Loading orders...</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
            <div className="flex space-x-3">
              {selectedOrders.length > 0 && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkStatusUpdate("fulfilled")}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Fulfilled ({selectedOrders.length})
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate("cancelled")}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel ({selectedOrders.length})
                  </button>
                </div>
              )}
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        {kpis && (
          <div className="flex gap-6 mb-8 overflow-x-auto pb-2">
            {/* Total Orders */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-w-[280px] flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-10 w-10 text-blue-600" />
              </div>
              <div className="ml-6">
                <p className="text-base font-medium text-gray-600">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{kpis.totalOrders}</p>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-w-[280px] flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-10 w-10 text-green-600" />
              </div>
              <div className="ml-6">
                <p className="text-base font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">${kpis.totalRevenue.toFixed(2)}</p>
              </div>
            </div>

            {/* Fulfillment Rate */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-w-[280px] flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-10 w-10 text-purple-600" />
              </div>
              <div className="ml-6">
                <p className="text-base font-medium text-gray-600">Fulfillment Rate</p>
                <p className="text-3xl font-bold text-gray-900">{kpis.fulfillmentRate}%</p>
              </div>
            </div>

            {/* Average Order Value */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-w-[280px] flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-10 w-10 text-orange-600" />
              </div>
              <div className="ml-6">
                <p className="text-base font-medium text-gray-600">Avg Order Value</p>
                <p className="text-3xl font-bold text-gray-900">${kpis.averageOrderValue}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status Breakdown */}
        {kpis && (
          <div className="flex gap-6 mb-8 overflow-x-auto pb-2">
            {/* Order Status Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-w-[260px] flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Fulfilled</span>
                  <span className="text-sm font-medium text-green-600">{kpis.fulfilledOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="text-sm font-medium text-yellow-600">{kpis.pendingOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cancelled</span>
                  <span className="text-sm font-medium text-red-600">{kpis.cancelledOrders}</span>
                </div>
              </div>
            </div>

            {/* Delivery Status Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-w-[260px] flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Delivered</span>
                  <span className="text-sm font-medium text-green-600">{kpis.deliveredOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Shipped</span>
                  <span className="text-sm font-medium text-blue-600">{kpis.shippedOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Delivery Rate</span>
                  <span className="text-sm font-medium text-purple-600">{kpis.deliveryRate}%</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-w-[260px] flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
                  View Pending Orders
                </button>
                <button className="w-full text-left px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors">
                  Process Fulfillments
                </button>
                <button className="w-full text-left px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors">
                  Generate Reports
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All statuses</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4 mr-2" />
                More filters
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrders(orders.map(o => o._id));
                        } else {
                          setSelectedOrders([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chat
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => handleOrderSelect(order._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleViewOrder(order)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {order.id}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.date}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{order.customer}</p>
                        <p className="text-sm text-gray-600">{order.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(order.status)}
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order._id, e.target.value as any)}
                          className={`${getStatusBadge(order.status)} border-0 bg-transparent cursor-pointer focus:ring-0`}
                        >
                          <option value="pending">Pending</option>
                          <option value="fulfilled">Fulfilled</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getPaymentBadge(order.payment)}>
                        {order.payment.charAt(0).toUpperCase() + order.payment.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{order.totalFormatted}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.items}</td>
                    <td className="px-6 py-4">
                      {editingOrderId === order._id ? (
                        <input
                          value={newTracking}
                          onChange={e => setNewTracking(e.target.value)}
                          className="border px-2 py-1 rounded w-32"
                          placeholder="Tracking #"
                        />
                      ) : (
                        order.trackingNumber ? (
                          <span className="font-mono text-blue-700">{order.trackingNumber}</span>
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingOrderId === order._id ? (
                        <select
                          value={newFulfillment}
                          onChange={e => setNewFulfillment(e.target.value as any)}
                          className="border px-2 py-1 rounded"
                        >
                          <option value="Unfulfilled">Unfulfilled</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Returned">Returned</option>
                          <option value="Refunded">Refunded</option>
                        </select>
                      ) : (
                        <span
                          className={
                            order.fulfillment === "Delivered"
                              ? "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium"
                              : order.fulfillment === "Shipped"
                              ? "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
                              : order.fulfillment === "Unfulfilled"
                              ? "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium"
                              : order.fulfillment === "Cancelled"
                              ? "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium"
                              : order.fulfillment === "Returned"
                              ? "bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium"
                              : order.fulfillment === "Refunded"
                              ? "bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"
                              : "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"
                          }
                        >
                          {order.fulfillment}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {editingOrderId === order._id ? (
                          <>
                            <button
                              onClick={async () => {
                                await updateOrderDelivery({
                                  id: order._id,
                                  fulfillment: newFulfillment, // "Unfulfilled" | "Shipped" | "Delivered" | "Cancelled"
                                  trackingNumber: newTracking,
                                  payment: order.payment, // or another valid value
                                });
                                setEditingOrderId(null);
                              }}
                              className="text-green-600 hover:text-green-800 p-1"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingOrderId(null)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingOrderId(order._id);
                              setNewTracking(order.trackingNumber || "");
                              setNewFulfillment(order.fulfillment);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setFulfillModalOrder(order);
                            setFulfillTracking(order.trackingNumber || "");
                            setFulfillPayment(order.payment || "paid");
                          }}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Mark as fulfilled"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(order._id, "cancelled")}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Cancel order"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 p-1">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openChatInterface(order)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Chat</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto w-12 h-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Fulfill Modal */}
      {fulfillModalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Fulfill Order</h2>
            <div className="mb-2">
              <b>Order ID:</b> {fulfillModalOrder.id}
            </div>
            <div className="mb-2">
              <b>Customer:</b> {fulfillModalOrder.customer}
            </div>
            <div className="mb-2">
              <b>Products:</b>
              <ul className="list-disc ml-6">
                {fulfillModalOrder.products.map((p, i) => (
                  <li key={i}>{p.name} x {p.quantity}</li>
                ))}
              </ul>
            </div>
            <label className="block mb-2 mt-4">Tracking Number</label>
            <input
              className="border px-2 py-1 rounded w-full mb-4"
              value={fulfillTracking}
              onChange={e => setFulfillTracking(e.target.value)}
            />
            <label className="block mb-2">Payment Status</label>
            <select
              className="border px-2 py-1 rounded w-full mb-4"
              value={fulfillPayment}
              onChange={e => setFulfillPayment(e.target.value as any)}
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setFulfillModalOrder(null)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button
                onClick={async () => {
                  await updateOrderDelivery({
                    id: fulfillModalOrder._id,
                    fulfillment: "Shipped",
                    trackingNumber: fulfillTracking,
                    payment: fulfillPayment,
                  });
                  setFulfillModalOrder(null);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Fulfill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface Modal */}
      {showChatInterface && <ChatInterface />}
    </div>
  );
}