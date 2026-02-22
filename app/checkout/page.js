'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/app/context/CartContext';
import { useRequireAuth } from '@/app/hooks/useRequireAuth';
import CouponCode from '@/app/components/CouponCode';
import { 
    MapPin, 
    Plus, 
    Trash2, 
    Check, 
    ShoppingBag,
    AlertCircle,
    Loader2,
    ChevronRight,
    Home,
    CreditCard
} from 'lucide-react';

// Load Razorpay script
const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && window.Razorpay) {
            resolve(true);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export default function CheckoutPage() {
    const router = useRouter();
    const { cartItems, clearCart } = useCart();
    const { isAuthed, isChecking } = useRequireAuth({ message: 'Please sign in to proceed to checkout' });
    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' or 'online'
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    
    // Calculate total from cart items
    const calculateSubtotal = () => {
        if (!cartItems || !Array.isArray(cartItems)) return 0;
        return cartItems.reduce((total, item) => {
            // Get price from selectedVariant.price.sellingPrice or product price
            const price = item.selectedVariant?.price?.sellingPrice || 
                         item.price || 
                         item.product?.price || 
                         0;
            return total + (price * item.quantity);
        }, 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const discount = appliedCoupon?.discountAmount || 0;
        return Math.max(0, subtotal - discount);
    };
    
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
        isDefault: false
    });

    useEffect(() => {
        fetchAddresses();
    }, []);

    const handleCouponApplied = (couponData) => {
        setAppliedCoupon(couponData);
        setError(''); // Clear any previous errors
    };

    const handleCouponRemoved = () => {
        setAppliedCoupon(null);
    };

    const fetchAddresses = async () => {
        try {
            const res = await fetch('/api/addresses');
            const data = await res.json();
            if (res.ok) {
                setAddresses(data.addresses);
                const defaultAddr = data.addresses.find(addr => addr.isDefault);
                if (defaultAddr) setSelectedAddress(defaultAddr._id);
                else if (data.addresses.length > 0) setSelectedAddress(data.addresses[0]._id);
            }
        } catch (err) {
            console.error('Error fetching addresses:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAddAddress = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            const res = await fetch('/api/addresses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            
            if (res.ok) {
                setAddresses(data.addresses);
                const newAddr = data.addresses[data.addresses.length - 1];
                setSelectedAddress(newAddr._id);
                setShowAddressForm(false);
                setFormData({
                    fullName: '',
                    phone: '',
                    email: '',
                    addressLine1: '',
                    addressLine2: '',
                    city: '',
                    state: '',
                    pincode: '',
                    isDefault: false
                });
            } else {
                setError(data.error || 'Failed to add address');
            }
        } catch (err) {
            setError('Failed to add address');
        }
    };

    const handleDeleteAddress = async (addressId) => {
        if (!confirm('Are you sure you want to delete this address?')) return;
        
        try {
            const res = await fetch(`/api/addresses?id=${addressId}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            
            if (res.ok) {
                setAddresses(data.addresses);
                if (selectedAddress === addressId) {
                    setSelectedAddress(data.addresses[0]?._id || null);
                }
            }
        } catch (err) {
            console.error('Error deleting address:', err);
        }
    };

    const handlePlaceOrder = async () => {
        if (!selectedAddress) {
            setError('Please select a delivery address');
            return;
        }

        if (!cartItems || cartItems.length === 0) {
            setError('Your cart is empty');
            return;
        }

        setError('');
        setSubmitting(true);

        try {
            const address = addresses.find(addr => addr._id === selectedAddress);
            const items = cartItems.map(item => ({
                productId: item.product?._id || item.product,
                name: item.product?.name || item.name,
                image: item.selectedVariant?.images?.[0]?.url || item.image || item.product?.images?.[0] || '',
                quantity: item.quantity,
                price: item.selectedVariant?.price?.sellingPrice || item.price || item.product?.price || 0,
                selectedVariant: item.selectedVariant ? {
                    sku: item.selectedVariant.sku,
                    price: item.selectedVariant.price?.sellingPrice,
                    optionCombination: item.selectedVariant.optionCombination
                } : null
            }));

            // If online payment, create Razorpay order first
            if (paymentMethod === 'online') {
                await handleOnlinePayment(items, address);
            } else {
                // COD payment - create order directly
                await createOrder(items, address);
            }
        } catch (err) {
            console.error('Order placement error:', err);
            setError(err.message || 'Failed to place order. Please try again.');
            setSubmitting(false);
        }
    };

    const handleOnlinePayment = async (items, address) => {
        try {
            const totalAmount = calculateTotal();
            
            // Load Razorpay script
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
            }

            // Create Razorpay order
            const orderRes = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: totalAmount,
                    currency: 'INR',
                    notes: {
                        orderNotes: notes,
                    }
                })
            });

            const orderData = await orderRes.json();
            
            if (!orderRes.ok) {
                throw new Error(orderData.error || 'Failed to create payment order');
            }

            // Configure Razorpay options
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Nandika Jewellers',
                description: 'Purchase from Nandika Jewellers',
                order_id: orderData.orderId,
                handler: async function (response) {
                    // Payment successful - create order and verify payment
                    try {
                        const order = await createOrder(items, address, {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        });

                        // Verify payment
                        const verifyRes = await fetch('/api/payment/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                orderNumber: order.orderNumber,
                            })
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyRes.ok && verifyData.success) {
                            clearCart();
                            router.push(`/orders/${order._id}?success=true`);
                        } else {
                            setError('Payment verification failed. Please contact support.');
                            setSubmitting(false);
                        }
                    } catch (err) {
                        console.error('Order creation error:', err);
                        setError('Failed to complete order. Please contact support.');
                        setSubmitting(false);
                    }
                },
                prefill: {
                name: address.fullName,
                contact: address.phone,
            },
            theme: {
                color: '#D4AF76',
            },
                modal: {
                    ondismiss: function() {
                        setError('Payment cancelled');
                        setSubmitting(false);
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
            
        } catch (err) {
            throw err;
        }
    };

    const createOrder = async (items, address, paymentDetails = null) => {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items,
                shippingAddress: {
                    fullName: address.fullName,
                    phone: address.phone,
                    email: address.email,
                    addressLine1: address.addressLine1,
                    addressLine2: address.addressLine2,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode
                },
                paymentMethod,
                notes,
                ...(appliedCoupon && {
                    couponCode: appliedCoupon.couponCode,
                    couponDiscount: appliedCoupon.discountAmount
                }),
                ...(paymentDetails && {
                    razorpayOrderId: paymentDetails.razorpayOrderId,
                    razorpayPaymentId: paymentDetails.razorpayPaymentId,
                    razorpaySignature: paymentDetails.razorpaySignature,
                })
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to place order');
        }

        // For COD orders, redirect immediately
        if (paymentMethod === 'cod') {
            clearCart();
            router.push(`/orders/${data.order._id}?success=true`);
        }

        return data.order;
    };

    if (isChecking || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-white to-[#FFF8F0] dark:from-black dark:via-[#050505] dark:to-[#0A0A0A] py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-8 shimmer"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form skeleton */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 space-y-4">
                                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded shimmer"></div>
                                <div className="h-12 w-full bg-gray-100 dark:bg-gray-800 rounded-xl shimmer"></div>
                                <div className="h-12 w-full bg-gray-100 dark:bg-gray-800 rounded-xl shimmer"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl shimmer"></div>
                                    <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl shimmer"></div>
                                </div>
                            </div>
                        </div>
                        {/* Summary skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 space-y-4 h-fit">
                            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded shimmer"></div>
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-lg shimmer"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded shimmer"></div>
                                        <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded shimmer"></div>
                                    </div>
                                </div>
                            ))}
                            <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
                            <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 rounded-xl shimmer"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthed) {
        return null; // Will redirect via hook
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-white to-[#FFF8F0] dark:from-black dark:via-[#050505] dark:to-[#0A0A0A] py-12 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#8B6B4C] to-[#D4AF76] bg-clip-text text-transparent mb-2">Checkout</h1>
                    <p className="text-gray-600 dark:text-gray-400">Complete your order</p>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Section - Addresses */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Delivery Address */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-[#0A0A0A] rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-white/[0.06] p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <MapPin className="w-6 h-6 text-[#D4AF76]" />
                                    Delivery Address
                                </h2>
                                <button
                                    onClick={() => setShowAddressForm(!showAddressForm)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#D4AF76] text-white rounded-lg hover:bg-[#8B6B4C] transition"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add New
                                </button>
                            </div>

                            {/* Address Form */}
                            <AnimatePresence>
                                {showAddressForm && (
                                    <motion.form
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        onSubmit={handleAddAddress}
                                        className="mb-6 space-y-4 p-4 bg-[#F5E6D3] dark:bg-[#D4AF76]/10 rounded-lg"
                                    >
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                name="fullName"
                                                placeholder="Full Name"
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                required
                                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF76] focus:border-transparent"
                                            />
                                            <input
                                                type="tel"
                                                name="phone"
                                                placeholder="Phone Number"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                required
                                                pattern="[0-9]{10}"
                                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF76] focus:border-transparent"
                                            />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Email Address (for order updates)"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF76] focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            name="addressLine1"
                                            placeholder="Address Line 1"
                                            value={formData.addressLine1}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF76] focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            name="addressLine2"
                                            placeholder="Address Line 2 (Optional)"
                                            value={formData.addressLine2}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF76] focus:border-transparent"
                                        />
                                        <div className="grid sm:grid-cols-3 gap-4">
                                            <input
                                                type="text"
                                                name="city"
                                                placeholder="City"
                                                value={formData.city}
                                                onChange={handleInputChange}
                                                required
                                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF76] focus:border-transparent"
                                            />
                                            <input
                                                type="text"
                                                name="state"
                                                placeholder="State"
                                                value={formData.state}
                                                onChange={handleInputChange}
                                                required
                                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF76] focus:border-transparent"
                                            />
                                            <input
                                                type="text"
                                                name="pincode"
                                                placeholder="Pincode"
                                                value={formData.pincode}
                                                onChange={handleInputChange}
                                                required
                                                pattern="[0-9]{6}"
                                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF76] focus:border-transparent"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="isDefault"
                                                checked={formData.isDefault}
                                                onChange={handleInputChange}
                                                className="w-4 h-4 text-[#D4AF76] rounded focus:ring-[#D4AF76]"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Set as default address</span>
                                        </label>
                                        <div className="flex gap-3">
                                            <button
                                                type="submit"
                                                className="px-6 py-2 bg-[#D4AF76] text-white rounded-lg hover:bg-[#8B6B4C] transition"
                                            >
                                                Save Address
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddressForm(false)}
                                                className="px-6 py-2 bg-gray-200 dark:bg-white/[0.1] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-white/[0.15] transition"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>

                            {/* Saved Addresses */}
                            <div className="space-y-3">
                                {addresses.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No saved addresses. Add one to continue.</p>
                                    </div>
                                ) : (
                                    addresses.map((address) => (
                                        <motion.div
                                            key={address._id}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => setSelectedAddress(address._id)}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                                                selectedAddress === address._id
                                                    ? 'border-[#D4AF76] bg-[#F5E6D3] dark:bg-[#D4AF76]/10'
                                                    : 'border-gray-200 dark:border-white/[0.06] hover:border-[#E5C89F]'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                        selectedAddress === address._id
                                                            ? 'border-[#D4AF76] bg-[#D4AF76]'
                                                            : 'border-gray-300 dark:border-white/[0.1]'
                                                    }`}>
                                                        {selectedAddress === address._id && (
                                                            <Check className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{address.fullName}</h3>
                                                            {address.isDefault && (
                                                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">{address.phone}</p>
                                                        {address.email && (
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">{address.email}</p>
                                                        )}
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                                                            {address.addressLine1}
                                                            {address.addressLine2 && `, ${address.addressLine2}`}
                                                        </p>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                                            {address.city}, {address.state} - {address.pincode}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteAddress(address._id);
                                                    }}
                                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>

                        {/* Payment Method */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white dark:bg-[#0A0A0A] rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-white/[0.06] p-6"
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-[#D4AF76]" />
                                Payment Method
                            </h2>
                            <div className="space-y-3">
                                {/* Cash on Delivery */}
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => setPaymentMethod('cod')}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                                        paymentMethod === 'cod'
                                            ? 'border-[#D4AF76] bg-[#F5E6D3] dark:bg-[#D4AF76]/10'
                                            : 'border-gray-200 dark:border-white/[0.06] hover:border-[#E5C89F]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                            paymentMethod === 'cod'
                                                ? 'border-[#D4AF76] bg-[#D4AF76]'
                                                : 'border-gray-300 dark:border-white/[0.1]'
                                        }`}>
                                            {paymentMethod === 'cod' && (
                                                <Check className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cash on Delivery</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Pay when you receive your order</p>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Online Payment */}
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => setPaymentMethod('online')}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                                        paymentMethod === 'online'
                                            ? 'border-[#D4AF76] bg-[#F5E6D3] dark:bg-[#D4AF76]/10'
                                            : 'border-gray-200 dark:border-white/[0.06] hover:border-[#E5C89F]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                            paymentMethod === 'online'
                                                ? 'border-[#D4AF76] bg-[#D4AF76]'
                                                : 'border-gray-300 dark:border-white/[0.1]'
                                        }`}>
                                            {paymentMethod === 'online' && (
                                                <Check className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                Online Payment
                                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                                                    Secure
                                                </span>
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Pay securely using UPI, Card, or Net Banking</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Order Notes */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="bg-white dark:bg-[#0A0A0A] rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-white/[0.06] p-6"
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Order Notes (Optional)</h2>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any special instructions for your order?"
                                rows={4}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#D4AF76] focus:border-transparent resize-none"
                            />
                        </motion.div>
                    </div>

                    {/* Right Section - Order Summary */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white dark:bg-[#0A0A0A] rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-white/[0.06] p-6 sticky top-6"
                        >
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                                <ShoppingBag className="w-6 h-6 text-[#D4AF76]" />
                                Order Summary
                            </h2>

                            {/* Cart Items */}
                            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                                {cartItems && cartItems.map((item) => (
                                    <div key={item._id} className="flex gap-3 pb-4 border-b border-gray-200 dark:border-white/[0.06]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={item.selectedVariant?.images?.[0]?.url || item.image || item.product?.images?.[0] || '/placeholder.png'}
                                            alt={item.product?.name || item.name || 'Product'}
                                            className="w-16 h-16 object-cover rounded-lg"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                                                {item.product?.name || item.name || 'Product'}
                                            </h3>
                                            {item.selectedVariant && (
                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    {item.selectedVariant.sku && `SKU: ${item.selectedVariant.sku}`}
                                                </p>
                                            )}
                                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                                ₹{(item.selectedVariant?.price?.sellingPrice || item.price || item.product?.price || 0).toLocaleString()} × {item.quantity}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="space-y-3 mb-6 pt-4 border-t-2 border-gray-200 dark:border-white/[0.06]">
                                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                                    <span>Subtotal</span>
                                    <span>₹{calculateSubtotal().toLocaleString()}</span>
                                </div>
                                {appliedCoupon && (
                                    <div className="flex justify-between text-green-600">
                                        <span className="flex items-center gap-1">
                                            <Check className="w-4 h-4" />
                                            Coupon Discount ({appliedCoupon.couponCode})
                                        </span>
                                        <span>-₹{appliedCoupon.discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                                    <span>Shipping</span>
                                    <span className="text-green-600">FREE</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-gray-100 pt-3 border-t border-gray-200 dark:border-white/[0.06]">
                                    <span>Total</span>
                                    <span className="text-[#D4AF76]">₹{calculateTotal().toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Coupon Code Section */}
                            <div className="mb-6">
                                <CouponCode 
                                    cartItems={cartItems}
                                    onCouponApplied={handleCouponApplied}
                                    onCouponRemoved={handleCouponRemoved}
                                    appliedCoupon={appliedCoupon}
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </motion.div>
                            )}

                            {/* Place Order Button */}
                            <button
                                onClick={handlePlaceOrder}
                                disabled={submitting || !selectedAddress || !cartItems || cartItems.length === 0}
                                className="w-full bg-gradient-to-r from-[#D4AF76] to-[#C4A067] text-white py-4 rounded-xl font-semibold hover:from-[#8B6B4C] hover:to-[#B39158] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Place Order
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                                By placing your order, you agree to our terms and conditions
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
