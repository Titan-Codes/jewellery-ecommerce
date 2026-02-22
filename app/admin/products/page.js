"use client";
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import AdminLayout from '../../components/AdminLayout';
import { toast } from 'sonner';
// Dynamically import components to prevent hydration issues
const ProductForm = dynamic(() => import('../../components/admin/ProductForm'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
});

const ProductList = dynamic(() => import('../../components/admin/ProductList'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
});

import withAdminAuth from '../../components/withAdminAuth';

function AdminProductsPage() {
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        totalProducts: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'new'
    const [editingProduct, setEditingProduct] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearchTerm, setActiveSearchTerm] = useState(''); // Only updates on Enter
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [subcategoryFilter, setSubcategoryFilter] = useState('all');
    const [activeFilter, setActiveFilter] = useState('all');
    const [metalTypeFilter, setMetalTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    
    // Use ref to track if initial fetch has been done
    const initialFetchDone = useRef(false);

    // Handle search on Enter key
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            setActiveSearchTerm(searchTerm);
            setPagination(prev => ({ ...prev, page: 1 }));
        }
    };

    // Fetch products function
    const fetchProducts = async () => {
        try {
            setLoading(true);
            console.log('Fetching products from /api/admin/products...');
            const timestamp = Date.now();
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                _: timestamp.toString()
            });
            
            if (activeSearchTerm) params.append('search', activeSearchTerm);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);
            if (subcategoryFilter !== 'all') params.append('subcategory', subcategoryFilter);
            if (activeFilter !== 'all') params.append('isActive', activeFilter);
            if (metalTypeFilter !== 'all') params.append('metalType', metalTypeFilter);
            if (sortBy) params.append('sortBy', sortBy);
            if (sortOrder) params.append('sortOrder', sortOrder);
            
            const res = await fetch(`/api/admin/products?${params.toString()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            console.log('Response status:', res.status);
            
            if (res.ok) {
                const response = await res.json();
                
                // Handle both old format (array) and new format (object with pagination)
                if (response.success && response.data) {
                    console.log('Products fetched:', response.data.length, 'products');
                    setProducts(response.data);
                    setPagination(prev => ({
                        ...prev,
                        totalProducts: response.pagination?.totalProducts || 0,
                        totalPages: response.pagination?.totalPages || 0
                    }));
                } else if (Array.isArray(response)) {
                    // Backward compatibility with old format
                    console.log('Products fetched (old format):', response.length, 'products');
                    setProducts(response);
                } else {
                    console.error('Unexpected response format:', response);
                    setProducts([]);
                }
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('Failed to fetch products:', res.status, res.statusText, errorData);
                setProducts([]);
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial mount effect — also fetch categories and subcategories
    useEffect(() => {
        setMounted(true);
        // Fetch categories for filter dropdown
        fetch('/api/categories')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setCategories(data);
                else if (data.data && Array.isArray(data.data)) setCategories(data.data);
                else if (data.categories && Array.isArray(data.categories)) setCategories(data.categories);
            })
            .catch(err => console.error('Failed to fetch categories:', err));
        // Fetch subcategories for filter dropdown
        fetch('/api/subcategories')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setSubcategories(data);
                else if (data.subcategories && Array.isArray(data.subcategories)) setSubcategories(data.subcategories);
                else if (data.data && Array.isArray(data.data)) setSubcategories(data.data);
            })
            .catch(err => console.error('Failed to fetch subcategories:', err));
    }, []);

    // Initial fetch on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (mounted && !initialFetchDone.current) {
            initialFetchDone.current = true;
            fetchProducts();
        }
    }, [mounted]);

    // Refetch when filters change (after initial load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (initialFetchDone.current && mounted) {
            fetchProducts();
        }
    }, [activeSearchTerm, categoryFilter, subcategoryFilter, activeFilter, metalTypeFilter, sortBy, sortOrder, pagination.page, pagination.limit]);

    const handleAddProduct = () => {
        setEditingProduct(null);
        setActiveTab('new');
    };

    const handleEditProduct = async (product) => {
        try {
            // Fetch complete product details including variants
            const res = await fetch(`/api/admin/products/${product._id}`);
            if (res.ok) {
                const fullProduct = await res.json();
                console.log('Full product data for editing:', fullProduct);
                setEditingProduct(fullProduct);
                setActiveTab('new');
            } else {
                console.error('Failed to fetch product details');
                // Fallback to using the product from list
                setEditingProduct(product);
                setActiveTab('new');
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
            // Fallback to using the product from list
            setEditingProduct(product);
            setActiveTab('new');
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const res = await fetch(`/api/admin/products/${productId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setProducts(products.filter(p => p._id !== productId));
            } else {
                toast.error('Failed to delete product');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete product');
        }
    };

    const handleFormSubmit = async (productData) => {
        try {
            console.log('=== FORM SUBMISSION ===');
            console.log('Editing product:', editingProduct ? editingProduct._id : 'NEW');
            console.log('Product data:', {
                hasVariants: productData.hasVariants,
                variantOptionsCount: productData.variantOptions?.length || 0,
                variantsCount: productData.variants?.length || 0,
                variantOptions: productData.variantOptions,
                variants: productData.variants
            });
            
            const url = editingProduct 
                ? `/api/admin/products/${editingProduct._id}`
                : '/api/admin/products';
            
            const method = editingProduct ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });

            if (res.ok) {
                const savedProduct = await res.json();
                console.log('Saved product result:', {
                    id: savedProduct._id,
                    hasVariants: savedProduct.hasVariants,
                    variantOptionsCount: savedProduct.variantOptions?.length || 0,
                    variantsCount: savedProduct.variants?.length || 0
                });
                
                if (editingProduct) {
                    setProducts(products.map(p => 
                        p._id === editingProduct._id ? savedProduct : p
                    ));
                } else {
                    setProducts([...products, savedProduct]);
                }
                
                setActiveTab('list');
                setEditingProduct(null);
            } else {
                const error = await res.json();
                console.error('API Error:', error);
                toast.error(error.error || 'Failed to save product');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save product');
        }
    };

    const handleFormCancel = () => {
        setActiveTab('list');
        setEditingProduct(null);
    };

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <AdminLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
                            <p className="text-gray-600 mt-1">Manage your inventory and product catalog</p>
                        </div>
                        <div className="bg-gray-200 h-12 w-32 rounded-lg shimmer"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="aspect-square bg-gray-200 shimmer"></div>
                                <div className="p-4 space-y-2">
                                    <div className="h-4 w-3/4 bg-gray-200 rounded shimmer"></div>
                                    <div className="h-4 w-1/2 bg-gray-100 rounded shimmer"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (loading) {
        return (
            <AdminLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
                            <p className="text-gray-600 mt-1">Manage your inventory and product catalog</p>
                        </div>
                        <button
                            onClick={handleAddProduct}
                            className="bg-[#8B6B4C] text-white px-6 py-3 rounded-lg hover:bg-[#725939] transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Product</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="aspect-square bg-gray-200 shimmer"></div>
                                <div className="p-4 space-y-2">
                                    <div className="h-4 w-3/4 bg-gray-200 rounded shimmer"></div>
                                    <div className="h-4 w-1/2 bg-gray-100 rounded shimmer"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-4 sm:space-y-6">
                {/* Page Header */}
                <div className="flex flex-col space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Product Management</h1>
                            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your jewelry inventory and product catalog</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                                <p className="text-xs sm:text-sm text-gray-600">Total Products</p>
                                <p className="text-xl sm:text-2xl font-bold text-[#8B6B4C]">{pagination.totalProducts}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={() => setActiveTab('list')}
                                className={`flex-1 px-4 sm:px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base ${
                                    activeTab === 'list'
                                        ? 'bg-gradient-to-r from-[#8B6B4C] to-[#725939] text-white shadow-md'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span className="hidden sm:inline">Existing Products</span>
                                <span className="sm:hidden">Products</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    activeTab === 'list'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {pagination.totalProducts}
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    setEditingProduct(null);
                                    setActiveTab('new');
                                }}
                                className={`flex-1 px-4 sm:px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base ${
                                    activeTab === 'new'
                                        ? 'bg-gradient-to-r from-[#8B6B4C] to-[#725939] text-white shadow-md'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="hidden sm:inline">{editingProduct ? 'Edit Product' : 'Add New Product'}</span>
                                <span className="sm:hidden">{editingProduct ? 'Edit' : 'Add New'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {activeTab === 'list' ? (
                        <div className="p-4 sm:p-6">
                            {/* Filters Bar */}
                            <div className="mb-6 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Products</h2>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                            {pagination.totalProducts > 0 
                                                ? `Showing ${((pagination.page - 1) * pagination.limit) + 1} - ${Math.min(pagination.page * pagination.limit, pagination.totalProducts)} of ${pagination.totalProducts} products`
                                                : 'No products found'
                                            }
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleAddProduct}
                                        className="bg-[#8B6B4C] text-white px-4 sm:px-5 py-2.5 rounded-lg hover:bg-[#725939] transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span>Quick Add</span>
                                    </button>
                                </div>
                                
                                {/* Search and Filters */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                                    {/* Search */}
                                    <div className="relative sm:col-span-2 lg:col-span-1">
                                        <input
                                            type="text"
                                            placeholder="Search products... (Press Enter)"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={handleSearchKeyDown}
                                            className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6B4C] focus:border-transparent text-sm"
                                        />
                                        <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    
                                    {/* Metal Type Filter */}
                                    <select
                                        value={metalTypeFilter}
                                        onChange={(e) => {
                                            setMetalTypeFilter(e.target.value);
                                            setPagination(prev => ({ ...prev, page: 1 }));
                                        }}
                                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6B4C] focus:border-transparent text-sm bg-white"
                                    >
                                        <option value="all">🔶 All Metals</option>
                                        <option value="gold">🥇 Gold Only</option>
                                        <option value="silver">🥈 Silver Only</option>
                                    </select>
                                    
                                    {/* Category Filter */}
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => {
                                            setCategoryFilter(e.target.value);
                                            setSubcategoryFilter('all'); // Reset subcategory when category changes
                                            setPagination(prev => ({ ...prev, page: 1 }));
                                        }}
                                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6B4C] focus:border-transparent text-sm bg-white"
                                    >
                                        <option value="all">All Categories</option>
                                        {categories.map(cat => (
                                            <option key={cat._id || cat.name} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                    
                                    {/* Subcategory Filter */}
                                    <select
                                        value={subcategoryFilter}
                                        onChange={(e) => {
                                            setSubcategoryFilter(e.target.value);
                                            setPagination(prev => ({ ...prev, page: 1 }));
                                        }}
                                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6B4C] focus:border-transparent text-sm bg-white"
                                    >
                                        <option value="all">All Subcategories</option>
                                        {subcategories
                                            .filter(sub => categoryFilter === 'all' || sub.category?.name === categoryFilter || sub.category === categoryFilter)
                                            .map(sub => (
                                                <option key={sub._id} value={sub._id}>{sub.name}</option>
                                            ))}
                                    </select>
                                    
                                    {/* Status Filter */}
                                    <select
                                        value={activeFilter}
                                        onChange={(e) => {
                                            setActiveFilter(e.target.value);
                                            setPagination(prev => ({ ...prev, page: 1 }));
                                        }}
                                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6B4C] focus:border-transparent text-sm bg-white"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="true">✅ Active</option>
                                        <option value="false">❌ Inactive</option>
                                    </select>
                                    
                                    {/* Sort By */}
                                    <select
                                        value={`${sortBy}-${sortOrder}`}
                                        onChange={(e) => {
                                            const [field, order] = e.target.value.split('-');
                                            setSortBy(field);
                                            setSortOrder(order);
                                            setPagination(prev => ({ ...prev, page: 1 }));
                                        }}
                                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6B4C] focus:border-transparent text-sm bg-white"
                                    >
                                        <option value="createdAt-desc">📅 Newest First</option>
                                        <option value="createdAt-asc">📅 Oldest First</option>
                                        <option value="sellingPrice-asc">💰 Price: Low to High</option>
                                        <option value="sellingPrice-desc">💰 Price: High to Low</option>
                                        <option value="name-asc">🔤 Name: A to Z</option>
                                        <option value="name-desc">🔤 Name: Z to A</option>
                                        <option value="stock-asc">📦 Stock: Low to High</option>
                                        <option value="stock-desc">📦 Stock: High to Low</option>
                                    </select>
                                </div>
                                
                                {/* Active Filters Display */}
                                {(metalTypeFilter !== 'all' || categoryFilter !== 'all' || subcategoryFilter !== 'all' || activeFilter !== 'all' || activeSearchTerm) && (
                                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                                        <span className="text-xs text-gray-500">Active filters:</span>
                                        {activeSearchTerm && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                Search: {`"${activeSearchTerm}"`}
                                                <button onClick={() => { setSearchTerm(''); setActiveSearchTerm(''); }} className="hover:text-blue-900">×</button>
                                            </span>
                                        )}
                                        {metalTypeFilter !== 'all' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                                {metalTypeFilter === 'gold' ? '🥇 Gold' : '🥈 Silver'}
                                                <button onClick={() => setMetalTypeFilter('all')} className="hover:text-yellow-900">×</button>
                                            </span>
                                        )}
                                        {categoryFilter !== 'all' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                                                {categoryFilter}
                                                <button onClick={() => { setCategoryFilter('all'); setSubcategoryFilter('all'); }} className="hover:text-purple-900">×</button>
                                            </span>
                                        )}
                                        {subcategoryFilter !== 'all' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                                {subcategories.find(s => s._id === subcategoryFilter)?.name || subcategoryFilter}
                                                <button onClick={() => setSubcategoryFilter('all')} className="hover:text-indigo-900">×</button>
                                            </span>
                                        )}
                                        {activeFilter !== 'all' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                                {activeFilter === 'true' ? 'Active' : 'Inactive'}
                                                <button onClick={() => setActiveFilter('all')} className="hover:text-green-900">×</button>
                                            </span>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setActiveSearchTerm('');
                                                setMetalTypeFilter('all');
                                                setCategoryFilter('all');
                                                setSubcategoryFilter('all');
                                                setActiveFilter('all');
                                                setSortBy('createdAt');
                                                setSortOrder('desc');
                                            }}
                                            className="text-xs text-red-600 hover:text-red-800 underline"
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {products.length === 0 && !loading ? (
                                <div className="text-center py-12 sm:py-16">
                                    <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 mb-4">
                                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                                        {activeSearchTerm || categoryFilter !== 'all' || activeFilter !== 'all' 
                                            ? 'No products match your filters' 
                                            : 'No products yet'}
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600 mb-6">
                                        {activeSearchTerm || categoryFilter !== 'all' || activeFilter !== 'all'
                                            ? 'Try adjusting your filters'
                                            : 'Get started by creating your first product'}
                                    </p>
                                    {!(activeSearchTerm || categoryFilter !== 'all' || activeFilter !== 'all') && (
                                        <button
                                            onClick={handleAddProduct}
                                            className="bg-[#8B6B4C] text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-[#725939] transition-all duration-200 font-medium shadow-sm hover:shadow-md inline-flex items-center gap-2 text-sm sm:text-base"
                                        >
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span>Create Your First Product</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <ProductList
                                        products={products}
                                        onEdit={handleEditProduct}
                                        onDelete={handleDeleteProduct}
                                    />
                                    
                                    {/* Pagination Controls */}
                                    {pagination.totalProducts > 0 && (
                                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
                                            <div className="flex items-center gap-4">
                                                <div className="text-sm text-gray-600">
                                                    Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalProducts)} of {pagination.totalProducts} products
                                                </div>
                                                
                                                {/* Items per page selector */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-600">Per page:</span>
                                                    <select
                                                        value={pagination.limit}
                                                        onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                                                        className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B6B4C] focus:border-transparent bg-white"
                                                    >
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                        <option value={100}>100</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            {pagination.totalPages > 1 && (
                                            <div className="flex items-center gap-2">
                                                {/* Previous Button */}
                                                <button
                                                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                                    disabled={pagination.page === 1}
                                                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                                                        pagination.page === 1
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : 'bg-[#8B6B4C] text-white hover:bg-[#725939]'
                                                    }`}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                
                                                {/* Page Numbers */}
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                                        .filter(page => {
                                                            return (
                                                                page === 1 ||
                                                                page === pagination.totalPages ||
                                                                Math.abs(page - pagination.page) <= 1
                                                            );
                                                        })
                                                        .map((page, index, array) => (
                                                            <div key={page} className="flex items-center gap-1">
                                                                {index > 0 && array[index - 1] !== page - 1 && (
                                                                    <span className="px-2 text-gray-400">...</span>
                                                                )}
                                                                <button
                                                                    onClick={() => setPagination(prev => ({ ...prev, page }))}
                                                                    className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${
                                                                        pagination.page === page
                                                                            ? 'bg-[#8B6B4C] text-white'
                                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    {page}
                                                                </button>
                                                            </div>
                                                        ))}
                                                </div>
                                                
                                                {/* Next Button */}
                                                <button
                                                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                                                    disabled={pagination.page === pagination.totalPages}
                                                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                                                        pagination.page === pagination.totalPages
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : 'bg-[#8B6B4C] text-white hover:bg-[#725939]'
                                                    }`}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 sm:p-6">
                            <div className="mb-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                                            {editingProduct ? 'Edit Product' : 'Create New Product'}
                                        </h2>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                            {editingProduct 
                                                ? 'Update product details and pricing information'
                                                : 'Fill in the details below to add a new product to your catalog'
                                            }
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleFormCancel}
                                        className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                                    >
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span>Cancel</span>
                                    </button>
                                </div>
                            </div>
                            <ProductForm
                                product={editingProduct}
                                onSubmit={handleFormSubmit}
                                onCancel={handleFormCancel}
                            />
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

export default withAdminAuth(AdminProductsPage);