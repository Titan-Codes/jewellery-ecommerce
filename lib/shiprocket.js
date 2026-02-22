/**
 * Shiprocket API Integration
 * Documentation: https://apidocs.shiprocket.in/
 */

let authToken = null;
let tokenExpiry = null;

const SHIPROCKET_API = 'https://apiv2.shiprocket.in/v1/external';

/**
 * Authenticate with Shiprocket and get token
 */
async function authenticate() {
    try {
        // Check if we have a valid cached token
        if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
            return authToken;
        }

        const response = await fetch(`${SHIPROCKET_API}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: process.env.SHIPROCKET_EMAIL,
                password: process.env.SHIPROCKET_PASSWORD,
            }),
        });

        const data = await response.json();

        if (response.ok && data.token) {
            authToken = data.token;
            // Token expires in 10 days, cache for 9 days to be safe
            tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);
            return authToken;
        }

        throw new Error(data.message || 'Shiprocket authentication failed');
    } catch (error) {
        console.error('Shiprocket auth error:', error);
        throw error;
    }
}

/**
 * Create order in Shiprocket
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Shiprocket order response
 */
export async function createShiprocketOrder(orderData) {
    try {
        const token = await authenticate();

        const {
            orderNumber,
            orderDate,
            billingCustomerName,
            billingAddress,
            billingCity,
            billingPincode,
            billingState,
            billingCountry = 'India',
            billingEmail,
            billingPhone,
            shippingCustomerName,
            shippingAddress,
            shippingCity,
            shippingPincode,
            shippingState,
            shippingCountry = 'India',
            orderItems,
            paymentMethod, // 'COD' or 'Prepaid'
            subTotal,
            length,
            breadth,
            height,
            weight,
        } = orderData;

        const shiprocketPayload = {
            order_id: orderNumber,
            order_date: orderDate || new Date().toISOString().split('T')[0],
            pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
            channel_id: process.env.SHIPROCKET_CHANNEL_ID || '',
            comment: 'Order from Nandika Jewellers',
            billing_customer_name: billingCustomerName,
            billing_last_name: '',
            billing_address: billingAddress,
            billing_address_2: '',
            billing_city: billingCity,
            billing_pincode: billingPincode,
            billing_state: billingState,
            billing_country: billingCountry,
            billing_email: billingEmail,
            billing_phone: billingPhone,
            shipping_is_billing: true,
            shipping_customer_name: shippingCustomerName || billingCustomerName,
            shipping_last_name: '',
            shipping_address: shippingAddress || billingAddress,
            shipping_address_2: '',
            shipping_city: shippingCity || billingCity,
            shipping_pincode: shippingPincode || billingPincode,
            shipping_country: shippingCountry || billingCountry,
            shipping_state: shippingState || billingState,
            shipping_email: billingEmail,
            shipping_phone: billingPhone,
            order_items: orderItems,
            payment_method: paymentMethod, // 'COD' or 'Prepaid'
            shipping_charges: 0,
            giftwrap_charges: 0,
            transaction_charges: 0,
            total_discount: 0,
            sub_total: subTotal,
            length: length || 10,
            breadth: breadth || 10,
            height: height || 10,
            weight: weight || 0.5,
        };

        const response = await fetch(`${SHIPROCKET_API}/orders/create/adhoc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(shiprocketPayload),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create Shiprocket order');
        }

        return data;
    } catch (error) {
        console.error('Create Shiprocket order error:', error);
        throw error;
    }
}

/**
 * Track shipment by AWB code
 */
export async function trackShipment(awbCode) {
    try {
        const token = await authenticate();

        const response = await fetch(
            `${SHIPROCKET_API}/courier/track/awb/${awbCode}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to track shipment');
        }

        return data;
    } catch (error) {
        console.error('Track shipment error:', error);
        throw error;
    }
}

/**
 * Get tracking details by order ID
 */
export async function getOrderTracking(orderId) {
    try {
        const token = await authenticate();

        const response = await fetch(
            `${SHIPROCKET_API}/courier/track/shipment/${orderId}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to get tracking details');
        }

        return data;
    } catch (error) {
        console.error('Get order tracking error:', error);
        throw error;
    }
}

/**
 * Cancel shipment
 */
export async function cancelShipment(shipmentIds) {
    try {
        const token = await authenticate();

        const response = await fetch(`${SHIPROCKET_API}/orders/cancel/shipment/awbs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ awbs: shipmentIds }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to cancel shipment');
        }

        return data;
    } catch (error) {
        console.error('Cancel shipment error:', error);
        throw error;
    }
}

/**
 * Generate AWB for shipment
 */
export async function generateAWB(shipmentId, courierId) {
    try {
        const token = await authenticate();

        const response = await fetch(`${SHIPROCKET_API}/courier/assign/awb`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                shipment_id: shipmentId,
                courier_id: courierId,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to generate AWB');
        }

        return data;
    } catch (error) {
        console.error('Generate AWB error:', error);
        throw error;
    }
}

/**
 * Get available couriers for shipment
 */
export async function getAvailableCouriers(pickupPostcode, deliveryPostcode, weight, codAmount = 0) {
    try {
        const token = await authenticate();

        const response = await fetch(
            `${SHIPROCKET_API}/courier/serviceability/?pickup_postcode=${pickupPostcode}&delivery_postcode=${deliveryPostcode}&weight=${weight}&cod=${codAmount > 0 ? 1 : 0}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to get available couriers');
        }

        return data;
    } catch (error) {
        console.error('Get available couriers error:', error);
        throw error;
    }
}

/**
 * Create return order in Shiprocket
 * @param {Object} returnData - Return order details
 * @returns {Promise<Object>} Shiprocket return response
 */
export async function createReturnOrder(returnData) {
    try {
        const token = await authenticate();

        const {
            orderId,
            shipmentId,
            orderDate,
            pickupCustomerName,
            pickupAddress,
            pickupCity,
            pickupPincode,
            pickupState,
            pickupCountry = 'India',
            pickupEmail,
            pickupPhone,
            returnItems,
            length,
            breadth,
            height,
            weight,
        } = returnData;

        const shiprocketPayload = {
            order_id: orderId,
            shipment_id: shipmentId,
            order_date: orderDate || new Date().toISOString().split('T')[0],
            channel_id: process.env.SHIPROCKET_CHANNEL_ID || '',
            pickup_customer_name: pickupCustomerName,
            pickup_last_name: '',
            pickup_address: pickupAddress,
            pickup_address_2: '',
            pickup_city: pickupCity,
            pickup_state: pickupState,
            pickup_country: pickupCountry,
            pickup_pincode: pickupPincode,
            pickup_email: pickupEmail,
            pickup_phone: pickupPhone,
            pickup_isd_code: '91',
            shipping_customer_name: process.env.SHIPROCKET_PICKUP_LOCATION || 'Store',
            shipping_last_name: '',
            shipping_address: process.env.SHIPROCKET_PICKUP_ADDRESS || 'Store Address',
            shipping_address_2: '',
            shipping_city: process.env.SHIPROCKET_PICKUP_CITY || 'Mumbai',
            shipping_state: process.env.SHIPROCKET_PICKUP_STATE || 'Maharashtra',
            shipping_country: 'India',
            shipping_pincode: process.env.SHIPROCKET_PICKUP_PINCODE || '110001',
            shipping_email: process.env.SHIPROCKET_EMAIL,
            shipping_phone: process.env.SHIPROCKET_PICKUP_PHONE || '9999999999',
            shipping_isd_code: '91',
            order_items: returnItems,
            payment_method: 'Prepaid',
            total_discount: 0,
            sub_total: returnItems.reduce((sum, item) => sum + (item.selling_price * item.units), 0),
            length: length || 10,
            breadth: breadth || 10,
            height: height || 10,
            weight: weight || 0.5,
        };

        const response = await fetch(`${SHIPROCKET_API}/orders/create/return`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(shiprocketPayload),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create Shiprocket return order');
        }

        return data;
    } catch (error) {
        console.error('Create Shiprocket return order error:', error);
        throw error;
    }
}

/**
 * Process shipment (Ship Now) - Request AWB generation
 * This triggers the "Ship Now" action in Shiprocket
 * @param {Array<Number>} shipmentIds - Array of shipment IDs
 * @returns {Promise<Object>} Response from Shiprocket
 */
export async function processShipment(shipmentIds) {
    try {
        const token = await authenticate();

        const response = await fetch(`${SHIPROCKET_API}/courier/assign/awb`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds]
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to process shipment (Ship Now)');
        }

        console.log('✅ Shipment processed successfully (Ship Now):', data);
        return data;
    } catch (error) {
        console.error('Process shipment error:', error);
        throw error;
    }
}

/**
 * Generate pickup request for shipment
 * This schedules courier pickup after AWB is assigned
 * @param {Array<Number>} shipmentIds - Array of shipment IDs
 * @returns {Promise<Object>} Response from Shiprocket
 */
export async function generatePickup(shipmentIds) {
    try {
        const token = await authenticate();

        const response = await fetch(`${SHIPROCKET_API}/courier/generate/pickup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds]
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to generate pickup request');
        }

        console.log('✅ Pickup request generated successfully:', data);
        return data;
    } catch (error) {
        console.error('Generate pickup error:', error);
        throw error;
    }
}

/**
 * Generate manifest for shipments
 * @param {Array<Number>} shipmentIds - Array of shipment IDs
 * @returns {Promise<Object>} Manifest response with manifest_url
 */
export async function generateManifest(shipmentIds) {
    try {
        const token = await authenticate();

        const response = await fetch(`${SHIPROCKET_API}/manifests/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds]
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to generate manifest');
        }

        console.log('✅ Manifest generated successfully:', data);
        return data;
    } catch (error) {
        console.error('Generate manifest error:', error);
        throw error;
    }
}

/**
 * Print/Get manifest PDF URL
 * @param {Array<Number>} orderIds - Array of Shiprocket order IDs
 * @returns {Promise<Object>} Response with manifest PDF URL
 */
export async function printManifest(orderIds) {
    try {
        const token = await authenticate();

        const response = await fetch(`${SHIPROCKET_API}/manifests/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                order_ids: Array.isArray(orderIds) ? orderIds : [orderIds]
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to print manifest');
        }

        console.log('✅ Manifest PDF URL retrieved:', data);
        return data;
    } catch (error) {
        console.error('Print manifest error:', error);
        throw error;
    }
}

/**
 * Generate shipping label for shipment
 * @param {Array<Number>} shipmentIds - Array of shipment IDs
 * @returns {Promise<Object>} Response with label PDF URL
 */
export async function generateLabel(shipmentIds) {
    try {
        const token = await authenticate();

        const response = await fetch(`${SHIPROCKET_API}/courier/generate/label`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds]
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to generate label');
        }

        console.log('✅ Label generated successfully:', data);
        return data;
    } catch (error) {
        console.error('Generate label error:', error);
        throw error;
    }
}

/**
 * Print invoice for orders
 * @param {Array<String>} orderIds - Array of Shiprocket order IDs (as strings)
 * @returns {Promise<Object>} Response with invoice PDF URL
 */
export async function printInvoice(orderIds) {
    try {
        const token = await authenticate();

        const response = await fetch(`${SHIPROCKET_API}/orders/print/invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                ids: Array.isArray(orderIds) ? orderIds : [orderIds]
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to print invoice');
        }

        console.log('✅ Invoice PDF URL retrieved:', data);
        return data;
    } catch (error) {
        console.error('Print invoice error:', error);
        throw error;
    }
}

const shiprocketService = {
    createShiprocketOrder,
    trackShipment,
    getOrderTracking,
    cancelShipment,
    generateAWB,
    getAvailableCouriers,
    createReturnOrder,
    processShipment,
    generatePickup,
    generateManifest,
    printManifest,
    generateLabel,
    printInvoice,
};

export default shiprocketService;
