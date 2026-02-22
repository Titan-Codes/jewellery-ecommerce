'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
    RotateCcw, 
    Loader2, 
    CheckCircle2,
    Clock,
    Package,
    Truck,
    XCircle,
    CreditCard,
    User,
    Calendar,
    AlertCircle,
    Search,
    Filter,
    Mail,
    Phone,
    MapPin,
    ChevronDown,
    ChevronUp,
    DollarSign
} from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';

const statusConfig = {
    requested: { color: 'bg-blue-100 text-blue-800', icon: Package, label: 'Requested' },
    pickup_scheduled: { color: 'bg-purple-100 text-purple-800', icon: Package, label: 'Pickup Scheduled' },
    in_transit: { color: 'bg-yellow-100 text-yellow-800', icon: Package, label: 'In Transit' },
    returned_to_seller: { color: 'bg-orange-100 text-orange-800', icon: Package, label: 'Received at Warehouse' },
    received: { color: 'bg-[#D4AF76] text-[#8B6B4C]', icon: CheckCircle2, label: 'Received & Verified' },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Cancelled' },
};

export default function AdminReturnsPage() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingRefund, setProcessingRefund] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedReturn, setExpandedReturn] = useState(null);
    const ITEMS_PER_PAGE = 20;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchReturns();
    }, [page, statusFilter]);

    const fetchReturns = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: ITEMS_PER_PAGE.toString(),
            });

            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }

            if (searchTerm) {
                params.append('search', searchTerm);
            }

            const res = await fetch(`/api/admin/returns?${params}`);
            const data = await res.json();
            if (res.ok) {
                setReturns(data.returns || []);
                setTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error('Error fetching returns:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchReturns();
    };

    const handleMarkRefundComplete = async (returnId) => {
        if (!confirm('Are you sure you want to mark this refund as complete? This action cannot be undone.')) {
            return;
        }

        setProcessingRefund(returnId);
        try {
            const res = await fetch(`/api/admin/returns/${returnId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'markRefundComplete' })
            });

            const data = await res.json();
            if (res.ok) {
                fetchReturns(); // Refresh list
            } else {
                toast.error(data.error || 'Failed to mark refund complete');
            }
        } catch (err) {
            console.error('Error marking refund complete:', err);
            toast.error('Something went wrong');
        } finally {
            setProcessingRefund(null);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                    <div>
                        <div className="h-8 w-52 bg-gray-200 rounded shimmer"></div>
                        <div className="h-4 w-72 bg-gray-100 rounded mt-2 shimmer"></div>
                    </div>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 space-y-3">
                            <div className="flex justify-between">
                                <div className="h-4 w-28 bg-gray-200 rounded shimmer"></div>
                                <div className="h-6 w-20 bg-gray-200 rounded-full shimmer"></div>
                            </div>
                            <div className="h-4 w-48 bg-gray-100 rounded shimmer"></div>
                            <div className="h-3 w-36 bg-gray-100 rounded shimmer"></div>
                        </div>
                    ))}
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Returns Management</h1>
                    <p className="text-gray-600 mt-1">Manage and process customer return requests</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Search */}
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by return number, name, or phone..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF76] focus:border-transparent"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-[#D4AF76] text-white rounded-lg hover:bg-[#8B6B4C] transition"
                            >
                                Search
                            </button>
                        </form>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF76] focus:border-transparent"
                            >
                                <option value="all">All Status</option>
                                <option value="requested">Requested</option>
                                <option value="pickup_scheduled">Pickup Scheduled</option>
                                <option value="in_transit">In Transit</option>
                                <option value="returned_to_seller">Received at Warehouse</option>
                                <option value="received">Received & Verified</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Returns List */}
                {returns.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <RotateCcw className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Returns Yet</h2>
                        <p className="text-gray-600">Return requests will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {returns.map((returnItem) => {
                            const isExpanded = expandedReturn === returnItem._id;
                            const StatusIcon = statusConfig[returnItem.status]?.icon || Clock;

                            return (
                                <motion.div
                                    key={returnItem._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl shadow-sm overflow-hidden"
                                >
                                    {/* Return Header - Clickable Card */}
                                    <div 
                                        className="p-6 cursor-pointer hover:bg-gray-50 transition"
                                        onClick={() => setExpandedReturn(isExpanded ? null : returnItem._id)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 mb-1">
                                                        {returnItem.returnNumber || 'Return Request'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(returnItem.createdAt)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                                        <User className="w-4 h-4" />
                                                        {returnItem.userId?.name || 'N/A'}
                                                    </p>
                                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                                        <Mail className="w-4 h-4" />
                                                        {returnItem.userId?.email || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-lg font-bold text-[#D4AF76]">
                                                        ₹{returnItem.refundAmount?.toLocaleString() || '0'}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        {returnItem.items?.length || 0} item(s)
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[returnItem.status]?.color}`}>
                                                    {statusConfig[returnItem.status]?.label || returnItem.status}
                                                </span>
                                                {returnItem.refundSucceeded && (
                                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Refunded
                                                    </span>
                                                )}
                                                {isExpanded ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="border-t border-gray-200"
                                        >
                                            <div className="p-6 space-y-6">
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    {/* Customer Info */}
                                            <div className="space-y-4">
                                                <div className="p-4 bg-gray-50 rounded-lg">
                                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-600" />
                                                        Customer Details
                                                    </h4>
                                                    <p className="text-sm text-gray-700">
                                                        <span className="font-medium">Name:</span> {returnItem.userId?.name || 'N/A'}
                                                    </p>
                                                    <p className="text-sm text-gray-700 mt-1">
                                                        <span className="font-medium">Email:</span> {returnItem.userId?.email || 'N/A'}
                                                    </p>
                                                </div>

                                                {/* Bank Details */}
                                                {returnItem.refundDetails && (
                                                    <div className="p-4 bg-blue-50 rounded-lg">
                                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                            <CreditCard className="w-4 h-4 text-blue-600" />
                                                            Refund Bank Details
                                                        </h4>
                                                        <div className="space-y-1 text-sm text-gray-700">
                                                            <p><span className="font-medium">Account Name:</span> {returnItem.refundDetails.accountName}</p>
                                                            <p><span className="font-medium">Account Number:</span> {returnItem.refundDetails.accountNumber}</p>
                                                            <p><span className="font-medium">IFSC:</span> {returnItem.refundDetails.ifsc}</p>
                                                            <p><span className="font-medium">Bank:</span> {returnItem.refundDetails.bankName}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Return Info */}
                                            <div className="space-y-4">
                                                {/* Items */}
                                                <div className="p-4 bg-[#F5E6D3] rounded-lg">
                                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                        <Package className="w-4 h-4 text-[#D4AF76]" />
                                                        Return Items
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {returnItem.items?.map((item, idx) => (
                                                            <div key={idx} className="text-sm text-gray-700">
                                                                <p className="font-medium">{item.name}</p>
                                                                <p className="text-xs text-gray-600">
                                                                    Qty: {item.quantity} {item.reason && `• Reason: ${item.reason}`}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Shipping Info */}
                                                {(returnItem.shiprocketReturnAwb || returnItem.courierName) && (
                                                    <div className="p-4 bg-indigo-50 rounded-lg">
                                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                            <Truck className="w-4 h-4 text-indigo-600" />
                                                            Return Shipping
                                                        </h4>
                                                        {returnItem.shiprocketReturnAwb && (
                                                            <p className="text-sm text-gray-700">
                                                                <span className="font-medium">AWB:</span> {returnItem.shiprocketReturnAwb}
                                                            </p>
                                                        )}
                                                        {returnItem.courierName && (
                                                            <p className="text-sm text-gray-700 mt-1">
                                                                <span className="font-medium">Courier:</span> {returnItem.courierName}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Notes */}
                                                {returnItem.notes && (
                                                    <div className="p-4 bg-gray-50 rounded-lg">
                                                        <h4 className="font-semibold text-gray-900 mb-2">Customer Notes</h4>
                                                        <p className="text-sm text-gray-700">{returnItem.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        {(returnItem.status === 'returned_to_seller' || returnItem.status === 'received') && !returnItem.refundSucceeded && (
                                            <div className="mt-6 pt-6 border-t border-gray-200">
                                                <div className="flex items-start gap-3 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                    <div className="text-sm text-yellow-800">
                                                        <p className="font-medium">Action Required - Product Received at Warehouse</p>
                                                        <p>The return has been received. Please verify the items and process the refund manually to the customer&apos;s bank account.</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleMarkRefundComplete(returnItem._id)}
                                                    disabled={processingRefund === returnItem._id}
                                                    className="w-full sm:w-auto px-6 py-3 bg-[#D4AF76] text-white rounded-lg hover:bg-[#8B6B4C] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {processingRefund === returnItem._id ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="w-5 h-5" />
                                                            Mark Return Complete & Refund Processed
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {returnItem.refundSucceeded && (
                                            <div className="mt-6 pt-6 border-t border-gray-200">
                                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                                    <div>
                                                        <p className="font-semibold text-green-900">Refund Completed</p>
                                                        <p className="text-sm text-green-700">
                                                            Processed on {formatDate(returnItem.refundProcessedAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 flex justify-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 bg-[#F5E6D3] border border-[#D4AF76] rounded-lg font-medium text-[#8B6B4C]">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
