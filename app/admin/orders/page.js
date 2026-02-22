'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '@/app/components/AdminLayout';
import { toast } from 'sonner';
import { 
    Package, 
    Loader2, 
    Search,
    ChevronDown,
    ChevronUp,
    Calendar,
    User,
    MapPin,
    Phone,
    Mail,
    Filter
} from 'lucide-react';

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [downloadingDocs, setDownloadingDocs] = useState({});

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchOrders();
    }, [page, statusFilter]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                status: statusFilter,
                ...(searchTerm && { search: searchTerm })
            });

            const res = await fetch(`/api/admin/orders?${params}`);
            const data = await res.json();
            
            if (res.ok) {
                setOrders(data.orders);
                setTotalPages(data.pages);
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchOrders();
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            const res = await fetch('/api/admin/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status: newStatus })
            });

            if (res.ok) {
                fetchOrders();
            }
        } catch (err) {
            console.error('Error updating order status:', err);
        }
    };

    const handleDownloadDocuments = async (orderId, docType = 'all') => {
        setDownloadingDocs(prev => ({ ...prev, [`${orderId}-${docType}`]: true }));
        
        try {
            const res = await fetch(`/api/admin/orders/${orderId}/documents`);
            const data = await res.json();

            if (res.ok && data.documents) {
                const docs = data.documents;
                
                // Open requested documents
                if (docType === 'all') {
                    if (docs.manifestUrl) window.open(docs.manifestUrl, '_blank');
                    if (docs.labelUrl) window.open(docs.labelUrl, '_blank');
                    if (docs.invoiceUrl) window.open(docs.invoiceUrl, '_blank');
                } else if (docType === 'manifest' && docs.manifestUrl) {
                    window.open(docs.manifestUrl, '_blank');
                } else if (docType === 'label' && docs.labelUrl) {
                    window.open(docs.labelUrl, '_blank');
                } else if (docType === 'invoice' && docs.invoiceUrl) {
                    window.open(docs.invoiceUrl, '_blank');
                }

                // Show errors if any
                if (docs.manifestError || docs.labelError || docs.invoiceError) {
                    const errors = [];
                    if (docs.manifestError) errors.push(`Manifest: ${docs.manifestError}`);
                    if (docs.labelError) errors.push(`Label: ${docs.labelError}`);
                    if (docs.invoiceError) errors.push(`Invoice: ${docs.invoiceError}`);
                    toast.warning('Some documents could not be generated:\n' + errors.join('\n'));
                }
            } else {
                toast.error(data.error || 'Failed to generate documents');
            }
        } catch (err) {
            console.error('Error downloading documents:', err);
            toast.error('Failed to download documents. Please try again.');
        } finally {
            setDownloadingDocs(prev => ({ ...prev, [`${orderId}-${docType}`]: false }));
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

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
                    <p className="text-gray-600 mt-1">Manage and track all customer orders</p>
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
                                    placeholder="Search by order number, name, or phone..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
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
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Orders List */}
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
                                <div className="flex justify-between">
                                    <div className="h-4 w-28 bg-gray-200 rounded shimmer"></div>
                                    <div className="h-6 w-20 bg-gray-200 rounded-full shimmer"></div>
                                </div>
                                <div className="h-4 w-48 bg-gray-100 rounded shimmer"></div>
                                <div className="h-3 w-32 bg-gray-100 rounded shimmer"></div>
                            </div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Orders Found</h2>
                        <p className="text-gray-600">No orders match your current filters</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const isExpanded = expandedOrder === order._id;

                            return (
                                <motion.div
                                    key={order._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl shadow-sm overflow-hidden"
                                >
                                    {/* Order Header */}
                                    <div 
                                        className="p-6 cursor-pointer hover:bg-gray-50 transition"
                                        onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 mb-1">
                                                        {order.orderNumber}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(order.createdAt)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                                        <User className="w-4 h-4" />
                                                        {order.userId?.name || 'N/A'}
                                                    </p>
                                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                                        <Mail className="w-4 h-4" />
                                                        {order.userId?.email || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-lg font-bold text-amber-600">
                                                        ₹{order.totalAmount.toLocaleString()}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        {order.items.length} item(s)
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                                </span>
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
                                                {/* Payment & Tracking Info */}
                                                <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Payment Method</p>
                                                        <p className="text-lg font-semibold text-gray-900 mt-1">
                                                            {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                                                        </p>
                                                        <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                                                            order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                                            order.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {order.paymentStatus?.charAt(0).toUpperCase() + order.paymentStatus?.slice(1)}
                                                        </span>
                                                    </div>
                                                    {order.awbCode && (
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-700">Tracking Details</p>
                                                            <p className="text-sm text-gray-900 mt-1">AWB: {order.awbCode}</p>
                                                            <p className="text-sm text-gray-600">Courier: {order.courierName}</p>
                                                            {order.trackingUrl && (
                                                                <a 
                                                                    href={order.trackingUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-amber-600 hover:underline mt-1 inline-block"
                                                                >
                                                                    Track Shipment →
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Document Downloads */}
                                                {order.shiprocketOrderId && order.shiprocketShipmentId && (
                                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                        <p className="text-sm font-medium text-amber-900 mb-3">
                                                            Shipping Documents
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => handleDownloadDocuments(order._id, 'manifest')}
                                                                disabled={downloadingDocs[`${order._id}-manifest`]}
                                                                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {downloadingDocs[`${order._id}-manifest`] ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                        Loading...
                                                                    </span>
                                                                ) : (
                                                                    'Download Manifest'
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadDocuments(order._id, 'label')}
                                                                disabled={downloadingDocs[`${order._id}-label`]}
                                                                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {downloadingDocs[`${order._id}-label`] ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                        Loading...
                                                                    </span>
                                                                ) : (
                                                                    'Download Label'
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadDocuments(order._id, 'invoice')}
                                                                disabled={downloadingDocs[`${order._id}-invoice`]}
                                                                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {downloadingDocs[`${order._id}-invoice`] ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                        Loading...
                                                                    </span>
                                                                ) : (
                                                                    'Download Invoice'
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadDocuments(order._id, 'all')}
                                                                disabled={downloadingDocs[`${order._id}-all`]}
                                                                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {downloadingDocs[`${order._id}-all`] ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                        Loading...
                                                                    </span>
                                                                ) : (
                                                                    'Download All'
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Status Update */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Update Order Status
                                                    </label>
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                                        className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="confirmed">Confirmed</option>
                                                        <option value="processing">Processing</option>
                                                        <option value="shipped">Shipped</option>
                                                        <option value="delivered">Delivered</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-6">
                                                    {/* Items */}
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                                                        <div className="space-y-3">
                                                            {order.items.map((item, idx) => (
                                                                <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={item.image || '/placeholder.png'}
                                                                        alt={item.name}
                                                                        className="w-16 h-16 object-cover rounded-lg"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <h5 className="font-medium text-gray-900 text-sm truncate">
                                                                            {item.name}
                                                                        </h5>
                                                                        {item.selectedVariant && (
                                                                            <p className="text-xs text-gray-600">
                                                                                {item.selectedVariant.name}: {item.selectedVariant.value}
                                                                            </p>
                                                                        )}
                                                                        <p className="text-sm text-gray-700 mt-1">
                                                                            ₹{item.price.toLocaleString()} × {item.quantity} = ₹{(item.price * item.quantity).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Shipping Address */}
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                            <MapPin className="w-4 h-4 text-amber-600" />
                                                            Shipping Address
                                                        </h4>
                                                        <div className="p-4 bg-amber-50 rounded-lg space-y-2">
                                                            <div>
                                                                <p className="font-medium text-gray-900">
                                                                    {order.shippingAddress.fullName}
                                                                </p>
                                                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                                                    <Phone className="w-3 h-3" />
                                                                    {order.shippingAddress.phone}
                                                                </p>
                                                            </div>
                                                            <div className="text-sm text-gray-700">
                                                                <p>{order.shippingAddress.addressLine1}</p>
                                                                {order.shippingAddress.addressLine2 && (
                                                                    <p>{order.shippingAddress.addressLine2}</p>
                                                                )}
                                                                <p>
                                                                    {order.shippingAddress.city}, {order.shippingAddress.state}
                                                                </p>
                                                                <p>PIN: {order.shippingAddress.pincode}</p>
                                                            </div>
                                                        </div>

                                                        {/* Notes */}
                                                        {order.notes && (
                                                            <div className="mt-4">
                                                                <h4 className="font-semibold text-gray-900 mb-2">Order Notes</h4>
                                                                <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">
                                                                    {order.notes}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
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
                    <div className="flex justify-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg font-medium">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
