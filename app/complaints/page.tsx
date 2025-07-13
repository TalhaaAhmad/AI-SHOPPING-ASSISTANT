"use client";
import { useState } from "react";
import { Search, Filter, Eye, ChevronLeft, ChevronRight, X, Save, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Types matching your Convex schema
type ComplaintStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "resolved"
  | "escalated";

type ComplaintType = 
  | "return"
  | "exchange"
  | "refund"
  | "damaged_item"
  | "wrong_item"
  | "missing_item"
  | "defective_item"
  | "late_delivery"
  | "poor_quality"
  | "warranty_claim"
  | "billing_issue"
  | "shipping_issue"
  | "customer_service"
  | "other";

type ResolutionType = 
  | "full_refund"
  | "partial_refund"
  | "store_credit"
  | "replacement"
  | "exchange"
  | "repair"
  | "compensation"
  | "apology"
  | "policy_explanation"
  | "no_action";

type UrgencyLevel = "low" | "medium" | "high" | "critical";

type Complaint = {
  _id: string;
  complaintId: string;
  orderId: string;
  customerEmail: string;
  complaintType: ComplaintType;
  description: string;
  affectedProducts: string[];
  hasEvidence: boolean;
  preferredResolution?: ResolutionType;
  suggestedResolution: ResolutionType;
  status: ComplaintStatus;
  urgency: UrgencyLevel;
  resolutionDetails: string;
  compensationAmount: number;
  resolvedAt?: number;
  resolutionNotes?: string;
  assignedTo?: string;
  customerNotified?: boolean;
  internalNotes?: string;
  evidenceUrls?: string[];
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
};

// Enhanced Table Component
function ComplaintTable({ onSelectComplaint }: { onSelectComplaint: (complaint: Complaint) => void }) {
  const [status, setStatus] = useState("all");
  const [urgency, setUrgency] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [limit] = useState(20);

  // Fetch complaints from Convex
  const complaints = useQuery(api.complaints.getAllComplaints, { 
    limit: limit, 
    offset: page * limit 
  });

  const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "under_review", label: "Under Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "resolved", label: "Resolved" },
    { value: "escalated", label: "Escalated" }
  ];

  const URGENCY_OPTIONS = [
    { value: "all", label: "All Urgencies" },
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" }
  ];

  // Filter complaints based on current filters
  const filtered = complaints?.filter(c => {
    const matchesStatus = status === "all" || c.status === status;
    const matchesUrgency = urgency === "all" || c.urgency === urgency;
    const matchesSearch = search === "" ||
      c.complaintId.toLowerCase().includes(search.toLowerCase()) ||
      c.orderId.toLowerCase().includes(search.toLowerCase()) ||
      c.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    
    return matchesStatus && matchesUrgency && matchesSearch;
  }) || [];

  const getStatusColor = (status: ComplaintStatus) => {
    const colors = {
      draft: "bg-gray-100 text-gray-700",
      submitted: "bg-blue-100 text-blue-700",
      under_review: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      resolved: "bg-green-100 text-green-700",
      escalated: "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      low: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-orange-100 text-orange-700",
      critical: "bg-red-100 text-red-700"
    };
    return colors[urgency as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  const getStatusIcon = (status: ComplaintStatus) => {
    const icons = {
      draft: <Clock className="w-4 h-4" />,
      submitted: <AlertCircle className="w-4 h-4" />,
      under_review: <Clock className="w-4 h-4" />,
      approved: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
      resolved: <CheckCircle className="w-4 h-4" />,
      escalated: <AlertCircle className="w-4 h-4" />
    };
    return icons[status] || <Clock className="w-4 h-4" />;
  };

  const formatComplaintType = (type: ComplaintType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (complaints === undefined) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading complaints...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Search complaints by ID, order, email, or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)} 
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <select 
              value={urgency} 
              onChange={e => setUrgency(e.target.value)} 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {URGENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-6 font-medium text-gray-700">Complaint ID</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Order ID</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Customer</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Type</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Status</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Urgency</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Created</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(complaint => (
              <tr key={complaint._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 font-medium text-gray-900">{complaint.complaintId}</td>
                <td className="py-4 px-6 text-gray-700">{complaint.orderId}</td>
                <td className="py-4 px-6 text-gray-700">{complaint.customerEmail}</td>
                <td className="py-4 px-6 text-gray-700">{formatComplaintType(complaint.complaintType)}</td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                    {getStatusIcon(complaint.status)}
                    {complaint.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(complaint.urgency)}`}>
                    {complaint.urgency}
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-700">
                  {new Date(complaint.createdAt).toLocaleDateString()}
                </td>
                <td className="py-4 px-6">
                  <button
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    onClick={() => onSelectComplaint(complaint)}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-gray-300" />
                    <p>No complaints found matching your criteria.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-6 border-t border-gray-200">
        <div className="text-sm text-gray-700">
          Showing {filtered.length} of {complaints.length} complaints
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="px-3 py-2 text-sm font-medium text-gray-700">
            Page {page + 1}
          </span>
          <button
            className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(p => p + 1)}
            disabled={filtered.length < limit}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Enhanced Modal Component
function ComplaintDetailsModal({ complaint, onClose }: { complaint: Complaint; onClose: () => void }) {
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [urgency, setUrgency] = useState<UrgencyLevel>(complaint.urgency);
  const [internalNotes, setInternalNotes] = useState(complaint.internalNotes || "");
  const [resolutionNotes, setResolutionNotes] = useState(complaint.resolutionNotes || "");
  const [assignedTo, setAssignedTo] = useState(complaint.assignedTo || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const updateComplaintStatus = useMutation(api.complaints.updateComplaintStatus);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateComplaintStatus({
        complaintId: complaint.complaintId,
        status,
        resolutionNotes: resolutionNotes || undefined,
        assignedTo: assignedTo || undefined,
        internalNotes: internalNotes || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Error updating complaint:", error);
      alert("Failed to update complaint. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: ComplaintStatus) => {
    const colors = {
      draft: "bg-gray-100 text-gray-700",
      submitted: "bg-blue-100 text-blue-700",
      under_review: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      resolved: "bg-green-100 text-green-700",
      escalated: "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const formatComplaintType = (type: ComplaintType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Complaint Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Complaint ID</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900 font-medium">
                {complaint.complaintId}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                {complaint.orderId}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                {complaint.customerEmail}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Complaint Type</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                {formatComplaintType(complaint.complaintType)}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <div className="px-3 py-3 bg-gray-50 rounded-lg text-gray-900 leading-relaxed">
              {complaint.description}
            </div>
          </div>

          {/* Affected Products */}
          {complaint.affectedProducts && complaint.affectedProducts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Affected Products</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                {complaint.affectedProducts.join(', ')}
              </div>
            </div>
          )}

          {/* Status and Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value as ComplaintStatus)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
              <select 
                value={urgency} 
                onChange={e => setUrgency(e.target.value as UrgencyLevel)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              placeholder="Enter staff member name or ID"
            />
          </div>

          {/* Resolution Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Details</label>
            <div className="px-3 py-3 bg-gray-50 rounded-lg text-gray-900 leading-relaxed">
              {complaint.resolutionDetails}
            </div>
          </div>

          {/* Compensation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compensation Amount</label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
              ${complaint.compensationAmount.toFixed(2)}
            </div>
          </div>

          {/* Evidence */}
          {complaint.hasEvidence && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Evidence</label>
              <div className="px-3 py-2 bg-blue-50 rounded-lg text-blue-900">
                Evidence files are attached to this complaint
              </div>
            </div>
          )}

          {/* Resolution Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows={3}
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              placeholder="Add notes about the resolution..."
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows={4}
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              placeholder="Add internal notes about this complaint..."
            />
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                {new Date(complaint.createdAt).toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                {new Date(complaint.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Resolution Date */}
          {complaint.resolvedAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolved At</label>
              <div className="px-3 py-2 bg-green-50 rounded-lg text-green-900">
                {new Date(complaint.resolvedAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button 
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button 
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function ComplaintsDashboard() {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  
  // Fetch complaint statistics
  const stats = useQuery(api.complaints.getComplaintStats);
  const complaints = useQuery(api.complaints.getAllComplaints, {});

  const getStatValue = (key: 'total' | 'pending' | 'resolved') => {
    if (!stats) return 0;
    return stats[key];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complaints Dashboard</h1>
          <p className="text-gray-600">Manage and track customer complaints efficiently</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Complaints</p>
                <p className="text-2xl font-bold text-gray-900">{getStatValue('total')}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{getStatValue('pending')}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{getStatValue('resolved')}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.byUrgency?.critical || 0}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <ComplaintTable onSelectComplaint={setSelectedComplaint} />

        {/* Modal */}
        {selectedComplaint && (
          <ComplaintDetailsModal
            complaint={selectedComplaint}
            onClose={() => setSelectedComplaint(null)}
          />
        )}
      </div>
    </div>
  );
}