'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRequireAuth } from '@/app/hooks/useRequireAuth';
import { 
    RotateCcw, 
    Loader2, 
    CheckCircle, 
    Clock,
    Truck,
    Box,
    XCircle,
    ArrowLeft,
    CreditCard,
    AlertCircle,
    Package,
    Calendar
} from 'lucide-react';
import ReturnTracker from '@/app/components/ReturnTracker';

const statusConfig = {
    requested: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock, label: 'Return Requested' },
    pickup_scheduled: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Package, label: 'Pickup Scheduled' },
    in_transit: { color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Truck, label: 'In Transit' },
    returned_to_seller: { color: 'text-purple-600', bg: 'bg-purple-50', icon: RotateCcw, label: 'Returned to Seller' },
    completed: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, label: 'Completed' },
    cancelled: { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, label: 'Cancelled' }
};

export default function ReturnDetailPage({ params }) {
    const router = useRouter();
    const { isAuthed, isChecking } = useRequireAuth({ message: 'Please sign in to view return details' });
    const [returnData, setReturnData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [resolvedParams, setResolvedParams] = useState(null);

    useEffect(() => {
        // Resolve params first
        Promise.resolve(params).then(setResolvedParams);
    }, [params]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (resolvedParams?.id) {
            fetchReturn();
        }
    }, [resolvedParams]);

    const fetchReturn = async () => {
        if (!resolvedParams?.id) return;
        
        setLoading(true);
        try {
            const res = await fetch('/api/returns');
            const data = await res.json();
            
            if (res.ok) {
                const foundReturn = data.returns.find(r => r._id === resolvedParams.id);
                if (foundReturn) {
                    setReturnData(foundReturn);
                } else {
                    router.push('/returns');
                }
            }
        } catch (err) {
            console.error('Error fetching return:', err);
            router.push('/returns');
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

    if (isChecking || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-white to-[#FFF8F0] py-12 px-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="h-6 w-44 bg-gray-200 rounded shimmer"></div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
                        <div className="flex justify-between">
                            <div className="h-5 w-32 bg-gray-200 rounded shimmer"></div>
                            <div className="h-7 w-24 bg-gray-200 rounded-full shimmer"></div>
                        </div>
                        <div className="h-4 w-full bg-gray-100 rounded shimmer"></div>
                        <div className="h-4 w-2/3 bg-gray-100 rounded shimmer"></div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-3">
                        <div className="flex gap-4">
                            <div className="w-20 h-20 bg-gray-200 rounded-xl shimmer"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 bg-gray-200 rounded shimmer"></div>
                                <div className="h-3 w-1/3 bg-gray-100 rounded shimmer"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthed) return null;

    if (!returnData) return null;

    const StatusIcon = statusConfig[returnData.status]?.icon || Clock;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-white to-[#FFF8F0] dark:from-black dark:via-[#050505] dark:to-[#0A0A0A] pb-20 sm:pb-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#D4AF76] to-[#8B6B4C] text-white z-40 shadow-lg">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 sm:pt-[84px] sm:pb-5 lg:pt-10 lg:pb-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link
                            href="/returns"
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold truncate">
                                Return Details
                            </h1>
                            <p className="text-xs sm:text-sm text-[#F5E6D3] mt-1">{returnData.returnNumber}</p>
                        </div>
                        <span className={`
                            inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold
                            ${statusConfig[returnData.status]?.bg} ${statusConfig[returnData.status]?.color}
                        `}>
                            <StatusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{statusConfig[returnData.status]?.label || returnData.status}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="space-y-6">
                    {/* Return Tracker - Only if not cancelled */}
                    {returnData.status !== 'cancelled' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden"
                        >
                            <ReturnTracker returnData={returnData} />
                        </motion.div>
                    )}

                    {/* Cancelled Notice */}
                    {returnData.status === 'cancelled' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-100 rounded-xl flex-shrink-0">
                                    <XCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-lg font-bold text-red-900 mb-1">Return Cancelled</h4>
                                    <p className="text-sm text-red-700">
                                        This return request has been cancelled. No further action is needed.
                                    </p>
                                    {returnData.notes && (
                                        <div className="mt-3 p-3 bg-white/80 rounded-lg">
                                            <p className="text-xs font-medium text-gray-500 mb-1">Cancellation Note:</p>
                                            <p className="text-sm text-gray-800">{returnData.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Return Summary */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-[#D4AF76]" />
                            <h3 className="text-lg font-bold text-gray-900">Return Information</h3>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Return Date</p>
                                <p className="text-base font-semibold text-gray-900">
                                    {formatDate(returnData.createdAt)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Order Number</p>
                                <p className="text-base font-semibold text-gray-900">
                                    {returnData.orderId?.orderNumber || 'N/A'}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Tracking Info */}
                    {returnData.shiprocketReturnAwb && returnData.status !== 'cancelled' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200/70 shadow-sm"
                        >
                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Truck className="w-5 h-5 text-blue-600" />
                                Return Pickup Tracking
                            </h4>
                            <div className="space-y-2">
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium text-gray-500">AWB Number:</span>
                                    <span className="ml-2 font-semibold text-blue-800 font-mono">{returnData.shiprocketReturnAwb}</span>
                                </p>
                                {returnData.courierName && (
                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium text-gray-500">Courier Partner:</span>
                                        <span className="ml-2 font-semibold text-gray-900">{returnData.courierName}</span>
                                    </p>
                                )}
                                <div className="pt-2 flex items-center gap-2 text-sm text-blue-600 font-medium">
                                    <Clock className="w-4 h-4" />
                                    Pickup scheduled - Courier will collect from your address
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Return Items */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6"
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Package className="w-5 h-5 text-[#D4AF76]" />
                            Items in Return ({returnData.items?.length || 0})
                        </h3>
                        <div className="space-y-3">
                            {returnData.items?.map((item, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                                            <Box className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-gray-900 mb-2">{item.name}</h5>
                                            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                                <span className="inline-flex items-center gap-1">
                                                    <span className="font-medium text-gray-500">Quantity:</span>
                                                    <span className="font-bold text-gray-900">{item.quantity}</span>
                                                </span>
                                                {item.reason && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 rounded-full">
                                                        <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                                                        <span className="capitalize font-medium text-orange-700">{item.reason.replace('_', ' ')}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Bank Details */}
                    {returnData.refundDetails && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200/70 shadow-sm"
                        >
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-green-600" />
                                Refund Bank Details
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-3 bg-white/80 rounded-lg">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Account Holder</p>
                                    <p className="text-sm font-semibold text-gray-900">{returnData.refundDetails.accountName}</p>
                                </div>
                                <div className="p-3 bg-white/80 rounded-lg">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Bank Name</p>
                                    <p className="text-sm font-semibold text-gray-900">{returnData.refundDetails.bankName}</p>
                                </div>
                                <div className="p-3 bg-white/80 rounded-lg">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Account Number</p>
                                    <p className="text-sm font-semibold text-gray-900 font-mono">{returnData.refundDetails.accountNumber}</p>
                                </div>
                                <div className="p-3 bg-white/80 rounded-lg">
                                    <p className="text-xs font-medium text-gray-500 mb-1">IFSC Code</p>
                                    <p className="text-sm font-semibold text-gray-900 font-mono">{returnData.refundDetails.ifsc}</p>
                                </div>
                            </div>
                            <div className="mt-3 flex items-start gap-2 text-sm text-green-700 bg-green-100/50 p-3 rounded-lg">
                                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p>Refund will be processed to this account after quality check</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Notes */}
                    {returnData.notes && returnData.status !== 'cancelled' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6"
                        >
                            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-[#D4AF76]" />
                                Your Notes
                            </h3>
                            <p className="text-sm text-gray-700 p-4 bg-gray-50 rounded-xl">
                                {returnData.notes}
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
