'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRequireAuth } from '@/app/hooks/useRequireAuth';
import { toast } from 'sonner';
import { 
    Package, 
    Loader2, 
    CheckCircle, 
    Clock,
    Truck,
    Box,
    XCircle,
    MapPin,
    Calendar,
    RotateCcw,
    ChevronRight,
    ArrowLeft,
    CreditCard,
    Phone,
    User,
    Mail,
    Home,
    ExternalLink,
    Sparkles
} from 'lucide-react';
import ReturnRequestModal from '@/app/components/ReturnRequestModal';

const statusConfig = {
    pending: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-200 dark:border-yellow-500/20', icon: Clock, label: 'Pending' },
    confirmed: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20', icon: CheckCircle, label: 'Confirmed' },
    processing: { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20', icon: Package, label: 'Processing' },
    shipped: { color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20', icon: Truck, label: 'Shipped' },
    delivered: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-500/20', icon: CheckCircle, label: 'Delivered' },
    cancelled: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20', icon: XCircle, label: 'Cancelled' },
    returned: { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-500/10', border: 'border-gray-200 dark:border-gray-500/20', icon: RotateCcw, label: 'Returned' }
};

const OrderProgressTracker = ({ status }) => {
    const steps = [
        { id: 'pending', label: 'Order Placed', icon: CheckCircle },
        { id: 'confirmed', label: 'Confirmed', icon: CheckCircle },
        { id: 'processing', label: 'Processing', icon: Package },
        { id: 'shipped', label: 'Shipped', icon: Truck },
        { id: 'delivered', label: 'Delivered', icon: Box }
    ];

    const statusIndex = steps.findIndex(s => s.id === status);
    const isCancelled = status === 'cancelled';
    const isReturned = status === 'returned';

    if (isCancelled || isReturned) return null;

    return (
        <div className="relative">
            <div className="flex justify-between items-center mb-8">
                {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isCompleted = index <= statusIndex;
                    const isCurrent = index === statusIndex;

                    return (
                        <div key={step.id} className="flex flex-col items-center flex-1 relative">
                            {/* Line to next step */}
                            {index < steps.length - 1 && (
                                <div className="absolute top-5 left-1/2 w-full h-0.5 -z-10">
                                    <div className={`h-full ${isCompleted ? 'bg-[#D4AF76]' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                </div>
                            )}

                            {/* Step icon */}
                            <motion.div
                                initial={false}
                                animate={{
                                    scale: isCurrent ? 1.1 : 1,
                                }}
                                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center z-10 border-4 ${
                                    isCompleted 
                                        ? 'bg-[#D4AF76] border-[#F5E6D3] dark:border-[#D4AF76]/30' 
                                        : 'bg-gray-200 dark:bg-gray-700 border-white dark:border-[#0A0A0A]'
                                } shadow-lg`}
                            >
                                <StepIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${isCompleted ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                            </motion.div>

                            {/* Step label */}
                            <span className={`text-xs sm:text-sm font-medium mt-2 text-center hidden sm:block ${
                                isCompleted ? 'text-[#8B6B4C] dark:text-[#D4AF76]' : 'text-gray-400 dark:text-gray-500'
                            }`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function OrderDetailPage({ params }) {
    const router = useRouter();
    const { isAuthed, isChecking } = useRequireAuth({ message: 'Please sign in to view order details' });
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [resolvedParams, setResolvedParams] = useState(null);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);

    // Resolve params first (Next.js 15 requirement)
    useEffect(() => {
        Promise.resolve(params).then(setResolvedParams);
    }, [params]);

    // Fetch order and check for success parameter when params are resolved
    useEffect(() => {
        if (resolvedParams?.id) {
            fetchOrder();
            // Check for success parameter
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('success') === 'true') {
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 5000);
                    // Clean URL
                    window.history.replaceState({}, '', window.location.pathname);
                }
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedParams]);

    const fetchOrder = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/orders');
            const data = await res.json();
            
            if (res.ok) {
                const foundOrder = data.orders.find(o => o._id === resolvedParams.id);
                if (foundOrder) {
                    setOrder(foundOrder);
                } else {
                    router.push('/orders');
                }
            }
        } catch (err) {
            console.error('Error fetching order:', err);
            router.push('/orders');
        } finally {
            setLoading(false);
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

    const handleDownloadInvoice = async () => {
        if (!order?.shiprocketOrderId) {
            toast.info('Invoice not available yet. Please wait for the order to be shipped.');
            return;
        }

        setDownloadingInvoice(true);
        try {
            const res = await fetch(`/api/orders/${order._id}/invoice`);
            const data = await res.json();

            if (res.ok && data.invoiceUrl) {
                // Open invoice in new tab
                window.open(data.invoiceUrl, '_blank');
            } else {
                toast.error(data.error || 'Failed to generate invoice');
            }
        } catch (err) {
            console.error('Error downloading invoice:', err);
            toast.error('Failed to download invoice. Please try again.');
        } finally {
            setDownloadingInvoice(false);
        }
    };

    if (isChecking || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-white to-[#FFF8F0] dark:from-black dark:via-[#050505] dark:to-[#0A0A0A] py-12 px-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header skeleton */}
                    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded shimmer"></div>
                    {/* Status bar skeleton */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-4">
                            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded shimmer"></div>
                            <div className="h-7 w-24 bg-gray-200 dark:bg-gray-800 rounded-full shimmer"></div>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full shimmer"></div>
                    </div>
                    {/* Items skeleton */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 space-y-4">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-xl shimmer"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded shimmer"></div>
                                    <div className="h-3 w-1/3 bg-gray-100 dark:bg-gray-800 rounded shimmer"></div>
                                    <div className="h-4 w-1/4 bg-gray-200 dark:bg-gray-800 rounded shimmer"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthed) return null;

    if (!order) return null;

    const StatusIcon = statusConfig[order.status].icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-white to-[#FFF8F0] dark:from-black dark:via-[#050505] dark:to-[#0A0A0A] pb-20 sm:pb-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#D4AF76] to-[#C4A067] text-white z-40 shadow-lg">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 sm:pt-[84px] sm:pb-5 lg:pt-10 lg:pb-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link
                            href="/orders"
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold truncate">
                                Order Details
                            </h1>
                            <p className="text-xs sm:text-sm text-[#F5E6D3] mt-1">{order.orderNumber}</p>
                        </div>
                        <span className={`
                            inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold
                            ${statusConfig[order.status].bg} ${statusConfig[order.status].color} border ${statusConfig[order.status].border}
                        `}>
                            <StatusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{statusConfig[order.status].label}</span>
                        </span>
                    </div>

                    {/* Success Message */}
                    <AnimatePresence>
                        {showSuccess && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center gap-3">
                                    <div className="p-2 bg-white/30 rounded-xl">
                                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-sm sm:text-base">
                                            Order Placed Successfully!
                                        </h3>
                                        <p className="text-xs sm:text-sm text-[#F5E6D3]">
                                            Your order is confirmed and will be processed soon.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
                {/* Order Progress Tracker */}
                {!['cancelled', 'returned'].includes(order.status) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-[#0A0A0A] rounded-2xl shadow-lg dark:shadow-none border border-gray-100 dark:border-white/[0.06] p-4 sm:p-6"
                    >
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-[#D4AF76]" />
                            Order Tracking
                        </h3>
                        <OrderProgressTracker status={order.status} />
                    </motion.div>
                )}

                {/* Order Summary Grid */}
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Date & Amount Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-white to-[#F5F0E8] dark:from-[#0A0A0A] dark:to-[#111] rounded-2xl shadow-lg dark:shadow-none border border-[#D4AF76]/20 dark:border-[#D4AF76]/15 p-4 sm:p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-[#D4AF76]/10 rounded-xl">
                                <Calendar className="w-5 h-5 text-[#D4AF76]" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Order Information</h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Order Date</p>
                                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                                    {formatDate(order.createdAt)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Amount</p>
                                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#8B6B4C] to-[#D4AF76] bg-clip-text text-transparent">
                                    ₹{order.totalAmount.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Payment Details Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-gradient-to-br from-white to-[#FFF8F0] dark:from-[#0A0A0A] dark:to-[#111] rounded-2xl shadow-lg dark:shadow-none border border-[#D4AF76]/20 dark:border-[#D4AF76]/15 p-4 sm:p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-[#D4AF76]/10 rounded-xl">
                                <CreditCard className="w-5 h-5 text-[#D4AF76]" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Payment Details</h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Method</p>
                                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 capitalize">
                                    {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Status</p>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                                    order.paymentStatus === 'paid' 
                                        ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400' 
                                        : (order.status === 'cancelled' || order.status === 'returned')
                                            ? 'bg-gray-100 dark:bg-gray-500/15 text-gray-600 dark:text-gray-400'
                                            : 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
                                }`}>
                                    {order.paymentStatus === 'paid' 
                                        ? <CheckCircle className="w-3 h-3" /> 
                                        : (order.status === 'cancelled' || order.status === 'returned')
                                            ? <XCircle className="w-3 h-3" />
                                            : <Clock className="w-3 h-3" />
                                    }
                                    {order.paymentStatus === 'paid' 
                                        ? 'Paid' 
                                        : (order.status === 'cancelled' || order.status === 'returned')
                                            ? 'Not Paid'
                                            : 'Pending'
                                    }
                                </span>
                            </div>
                            {order.razorpayPaymentId && (
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment ID</p>
                                    <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                                        {order.razorpayPaymentId}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Tracking Info */}
                {order.shiprocketOrderId && order.status === 'shipped' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-2xl shadow-lg dark:shadow-none border-2 border-blue-200 dark:border-blue-500/20 p-4 sm:p-6"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex-shrink-0">
                                    <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-300 mb-1">Package Shipped!</h4>
                                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-400 mb-2">
                                        Your order is on its way
                                    </p>
                                    {order.shiprocketAwb && (
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Tracking Number:</span>
                                            <span className="text-xs sm:text-sm font-mono font-bold text-blue-900 dark:text-blue-200 bg-white dark:bg-white/10 px-3 py-1 rounded-lg">
                                                {order.shiprocketAwb}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {order.trackingUrl && (
                                <a
                                    href={order.trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition text-sm whitespace-nowrap self-start sm:self-auto"
                                >
                                    Track Package
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Download Invoice Section */}
                {order.shiprocketOrderId && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 rounded-2xl shadow-lg dark:shadow-none border-2 border-amber-200 dark:border-amber-500/20 p-4 sm:p-6"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex-shrink-0">
                                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h4 className="text-base sm:text-lg font-bold text-amber-900 dark:text-amber-300 mb-1">Invoice Available</h4>
                                    <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                                        Download your order invoice for records
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDownloadInvoice}
                                disabled={downloadingInvoice}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition text-sm whitespace-nowrap self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {downloadingInvoice ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        Download Invoice
                                        <ExternalLink className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Order Items */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white dark:bg-[#0A0A0A] rounded-2xl shadow-lg dark:shadow-none border border-gray-100 dark:border-white/[0.06] p-4 sm:p-6"
                >
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-[#D4AF76]" />
                        Order Items ({order.items?.length || 0})
                    </h3>
                    <div className="space-y-4">
                        {order.items && order.items.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + index * 0.05 }}
                                className="flex gap-4 pb-4 border-b border-gray-100 dark:border-white/[0.06] last:border-0"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={item.image || '/placeholder.png'}
                                    alt={item.name}
                                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-gray-200 dark:border-white/[0.06] flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base mb-1 line-clamp-2">
                                        {item.name}
                                    </h4>
                                    {item.sku && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                            Qty: <span className="font-semibold text-gray-900 dark:text-gray-100">{item.quantity}</span>
                                        </span>
                                        <span className="text-sm sm:text-base font-bold text-[#D4AF76]">
                                            ₹{item.price.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Total Summary */}
                    <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-white/[0.06]">
                        <div className="flex justify-between items-center">
                            <span className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">Total</span>
                            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#8B6B4C] to-[#D4AF76] bg-clip-text text-transparent">
                                ₹{order.totalAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Shipping Address */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-[#0A0A0A] rounded-2xl shadow-lg dark:shadow-none border border-gray-100 dark:border-white/[0.06] p-4 sm:p-6"
                >
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#D4AF76]" />
                        Shipping Address
                    </h3>
                    {order.shippingAddress && (
                        <div className="bg-gradient-to-br from-[#F5F0E8] to-white dark:from-[#D4AF76]/10 dark:to-[#D4AF76]/5 p-4 rounded-xl space-y-3">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-[#D4AF76]" />
                                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                                    {order.shippingAddress.fullName}
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Home className="w-4 h-4 text-[#D4AF76] mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {order.shippingAddress.addressLine1}
                                    {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                                    <br />
                                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-[#D4AF76]" />
                                <p className="text-sm text-gray-700 dark:text-gray-300">{order.shippingAddress.phone}</p>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Return Button */}
                {order.status === 'delivered' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        <button
                            onClick={() => setReturnModalOpen(true)}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-semibold hover:from-orange-600 hover:to-red-600 transition flex items-center justify-center gap-2 shadow-lg"
                        >
                            <RotateCcw className="w-5 h-5" />
                            Request Return
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Return Modal */}
            <ReturnRequestModal
                isOpen={returnModalOpen}
                onClose={() => setReturnModalOpen(false)}
                order={order}
                onSuccess={fetchOrder}
            />
        </div>
    );
}
