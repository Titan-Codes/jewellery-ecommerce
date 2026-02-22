"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SafeImage from './SafeImage';

export default function ProductsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [allSubcategories, setAllSubcategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSubcategory, setSelectedSubcategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('featured');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedTags, setSelectedTags] = useState([]);
    const [metalTypeFilter, setMetalTypeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProductsCount, setTotalProductsCount] = useState(0);
    const [totalPagesFromServer, setTotalPagesFromServer] = useState(0);
    const [dataReady, setDataReady] = useState(false); // Track when categories/subcategories are loaded

    const PRODUCTS_PER_PAGE = 20;

    // Use refs to prevent unnecessary re-fetches
    const abortControllerRef = useRef(null);
    const productsGridRef = useRef(null);
    const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);
    const categoryScrollRef = useRef(null);
    const subcategoryScrollRef = useRef(null);

    // Scroll a container left or right by a fixed amount
    const scrollByAmount = useCallback((ref, direction) => {
        if (ref.current) {
            const amount = direction === 'left' ? -300 : 300;
            ref.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    }, []);
    const isInternalUrlUpdate = useRef(false);

    // Scroll to products grid (not page top) for better UX
    const scrollToProducts = () => {
        if (productsGridRef.current) {
            productsGridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Scroll selected item to center of its container
    const scrollSelectedToCenter = useCallback((containerRef, selectedSelector) => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const selectedEl = container.querySelector(selectedSelector);
        if (!selectedEl) return;
        const containerRect = container.getBoundingClientRect();
        const selectedRect = selectedEl.getBoundingClientRect();
        const scrollLeft = container.scrollLeft + (selectedRect.left - containerRect.left) - (containerRect.width / 2) + (selectedRect.width / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }, []);

    // Auto-scroll category selector when selected category changes
    useEffect(() => {
        // Small delay to ensure DOM is updated
        const timer = setTimeout(() => {
            scrollSelectedToCenter(categoryScrollRef, '[data-category-selected="true"]');
        }, 100);
        return () => clearTimeout(timer);
    }, [selectedCategory, categories, scrollSelectedToCenter]);

    // Auto-scroll subcategory selector when selected subcategory changes
    useEffect(() => {
        const timer = setTimeout(() => {
            scrollSelectedToCenter(subcategoryScrollRef, '[data-subcategory-selected="true"]');
        }, 100);
        return () => clearTimeout(timer);
    }, [selectedSubcategory, subcategories, scrollSelectedToCenter]);

    // Set initial search term, category, and subcategory from URL
    useEffect(() => {
        // Skip if this URL change was triggered by our own sync effect
        if (isInternalUrlUpdate.current) {
            isInternalUrlUpdate.current = false;
            return;
        }
        const searchFromUrl = searchParams.get('search');
        const categoryFromUrl = searchParams.get('category');
        const subcategoryFromUrl = searchParams.get('subcategory');
        const tagFromUrl = searchParams.get('tag');
        const sortFromUrl = searchParams.get('sort');

        if (searchFromUrl) {
            setSearchTerm(searchFromUrl);
        }
        if (categoryFromUrl) {
            setSelectedCategory(categoryFromUrl);
        }
        if (subcategoryFromUrl) {
            setSelectedSubcategory(subcategoryFromUrl);
        }
        if (tagFromUrl) {
            setSelectedTags([tagFromUrl]);
        }
        if (sortFromUrl) {
            setSortBy(sortFromUrl);
        }
        setUrlParamsProcessed(true);
    }, [searchParams]);

    // Auto-select parent category when subcategory comes from URL
    useEffect(() => {
        if (!dataReady || !urlParamsProcessed) return;

        const subcategoryFromUrl = searchParams.get('subcategory');
        const categoryFromUrl = searchParams.get('category');

        // Only auto-resolve if subcategory is set from URL but category is not
        if (subcategoryFromUrl && !categoryFromUrl && allSubcategories.length > 0) {
            const matchedSub = allSubcategories.find(sub => sub._id === subcategoryFromUrl);
            if (matchedSub && matchedSub.category && matchedSub.category.name) {
                setSelectedCategory(matchedSub.category.name);
            }
        }
    }, [dataReady, urlParamsProcessed, allSubcategories, searchParams]);

    // Update subcategories when category changes
    useEffect(() => {
        if (allSubcategories.length === 0 || !categories.length) return;

        if (selectedCategory === 'All') {
            setSubcategories(allSubcategories);
        } else {
            // Find the category object to get its ID
            const categoryObj = categories.find(cat => cat.name === selectedCategory);

            const filtered = allSubcategories.filter(sub => {
                if (!sub) return false;
                // Check if subcategory's category matches selected category
                return sub.category?.name === selectedCategory ||
                    sub.category === selectedCategory ||
                    (categoryObj && (sub.category?._id === categoryObj._id || sub.category === categoryObj._id));
            });
            setSubcategories(filtered);
        }
    }, [selectedCategory, allSubcategories, categories]);

    // Fetch categories (only once)
    const fetchCategories = useCallback(async () => {
        try {
            const timestamp = Date.now();
            const response = await fetch(`/api/categories?_=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            const data = await response.json();

            // Deduplicate categories based on name to prevent key collisions and layoutId crashes
            const uniqueData = Array.isArray(data) ? data.filter((cat, index, self) =>
                cat && cat.name && index === self.findIndex((t) => t && t.name === cat.name)
            ).map(cat => ({
                ...cat,
                name: typeof cat.name === 'object' ? cat.name?.name || '' : cat.name
            })) : [];

            // Ensure we don't add "All" if it already exists in the data (case insensitive)
            const hasAll = uniqueData.some(cat => cat.name.toLowerCase() === 'all');
            const initialCategories = hasAll ? [] : [{ name: 'All', slug: 'all' }];

            setCategories([...initialCategories, ...uniqueData]);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setCategories([{ name: 'All', slug: 'all' }]);
        }
    }, []);

    // Fetch subcategories (only once)
    const fetchSubcategories = useCallback(async () => {
        try {
            const timestamp = Date.now();
            const response = await fetch(`/api/subcategories?_=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            const data = await response.json();
            if (data.success && Array.isArray(data.subcategories)) {
                // Deduplicate subcategories based on _id
                const uniqueSubcategories = data.subcategories.filter((sub, index, self) =>
                    sub && sub._id && index === self.findIndex((t) => t && t._id === sub._id)
                ).map(sub => ({
                    ...sub,
                    name: typeof sub.name === 'object' ? sub.name?.name || '' : sub.name,
                    category: sub.category ? {
                        ...sub.category,
                        name: typeof sub.category.name === 'object' ? sub.category.name?.name || '' : sub.category.name
                    } : sub.category
                }));
                setAllSubcategories(uniqueSubcategories);
                setSubcategories(uniqueSubcategories);
            } else {
                setAllSubcategories([]);
                setSubcategories([]);
            }
        } catch (error) {
            console.error('Error fetching subcategories:', error);
            setAllSubcategories([]);
            setSubcategories([]);
        }
    }, []);

    // Initial data fetch
    useEffect(() => {
        const loadInitialData = async () => {
            await Promise.all([fetchCategories(), fetchSubcategories()]);
            setDataReady(true); // Signal that data is ready
        };

        loadInitialData();
    }, [fetchCategories, fetchSubcategories]);

    // Fetch products with abort controller (server-side pagination)
    const fetchProducts = useCallback(async () => {
        // Abort previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);

            // Build query parameters — use server-side pagination
            const params = new URLSearchParams();
            params.append('limit', String(PRODUCTS_PER_PAGE));
            params.append('page', String(currentPage));
            params.append('_', Date.now()); // Cache busting

            if (selectedCategory !== 'All' && selectedCategory) {
                params.append('category', selectedCategory);
            }
            if (selectedSubcategory !== 'All' && selectedSubcategory) {
                params.append('subcategory', selectedSubcategory);
            }
            if (searchTerm) {
                params.append('search', searchTerm);
            }
            if (selectedTags.length > 0) {
                params.append('tags', selectedTags.join(','));
            }

            // Map sort values to API params
            if (sortBy && sortBy !== 'featured') {
                if (sortBy === 'price-low') {
                    params.append('sortBy', 'sellingPrice');
                    params.append('sortOrder', 'asc');
                } else if (sortBy === 'price-high') {
                    params.append('sortBy', 'sellingPrice');
                    params.append('sortOrder', 'desc');
                } else if (sortBy === 'newest') {
                    params.append('sortBy', 'createdAt');
                    params.append('sortOrder', 'desc');
                }
            }

            const queryString = params.toString();
            const url = `/api/products${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url, {
                signal: abortControllerRef.current.signal,
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // API returns paginated response with data nested
            if (data.success && Array.isArray(data.data)) {
                setProducts(data.data);
                // Store server-side pagination metadata
                if (data.pagination) {
                    setTotalProductsCount(data.pagination.totalProducts || 0);
                    setTotalPagesFromServer(data.pagination.totalPages || 0);
                }
            } else if (Array.isArray(data)) {
                // Backward compatibility if API returns direct array
                setProducts(data);
                setTotalProductsCount(data.length);
                setTotalPagesFromServer(1);
            } else {
                console.error('Unexpected API response format:', data);
                setProducts([]);
                setTotalProductsCount(0);
                setTotalPagesFromServer(0);
            }
        } catch (error) {
            // Ignore abort errors
            if (error.name === 'AbortError') {
                return;
            }
            console.error('Error fetching products:', error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, selectedSubcategory, searchTerm, currentPage, sortBy, selectedTags]);

    // Fetch products when filters change OR when data becomes ready
    useEffect(() => {
        // Wait for BOTH initial data AND URL params to be processed
        if (!dataReady || !urlParamsProcessed) {
            return;
        }

        // Fetch products immediately after data is ready
        fetchProducts();

        // Cleanup on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchProducts, dataReady, urlParamsProcessed]);

    // Filter products client-side for tags and metal type (these are not API-level filters)
    const filteredProducts = useMemo(() => {
        return (Array.isArray(products) ? products : [])
            .filter(product => {
                const matchesTags = selectedTags.length === 0 ||
                    (product.tags && product.tags.some(tag => selectedTags.includes(tag)));
                const matchesMetalType = metalTypeFilter === 'all' ||
                    product.metalType === metalTypeFilter;
                return matchesTags && matchesMetalType;
            });
    }, [products, selectedTags, metalTypeFilter]);

    // Compute estimated total from category productsCount (instant, before products API returns)
    const estimatedTotalProducts = useMemo(() => {
        if (totalProductsCount > 0) return totalProductsCount; // Use real count once available
        if (categories.length === 0) return 0;
        if (selectedCategory !== 'All') {
            const cat = categories.find(c => c.name === selectedCategory);
            return cat?.productsCount || 0;
        }
        // Sum all category productsCount
        return categories.reduce((sum, cat) => sum + (cat.productsCount || 0), 0);
    }, [categories, selectedCategory, totalProductsCount]);

    // Use server-side pagination values
    const totalPages = totalPagesFromServer;
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;

    // Reset to page 1 when filters change (not when page itself changes)
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory, selectedSubcategory, searchTerm, selectedTags, sortBy, metalTypeFilter]);

    const handleCategoryClick = useCallback((categoryName) => {
        setSelectedCategory(categoryName);
        setSelectedSubcategory('All'); // Reset subcategory when category changes
    }, []);

    const handleSubcategoryClick = useCallback((subcategoryId) => {
        setSelectedSubcategory(subcategoryId);
    }, []);

    const clearSearch = useCallback(() => {
        setSearchTerm('');
    }, []);

    // Sync URL with current filter state so refresh always reflects what the user sees
    useEffect(() => {
        if (!urlParamsProcessed || !dataReady) return;

        const params = new URLSearchParams();
        if (selectedCategory && selectedCategory !== 'All') {
            params.set('category', selectedCategory);
        }
        if (selectedSubcategory && selectedSubcategory !== 'All') {
            params.set('subcategory', selectedSubcategory);
        }
        if (searchTerm) {
            params.set('search', searchTerm);
        }
        if (selectedTags.length > 0) {
            params.set('tag', selectedTags[0]);
        }
        if (sortBy && sortBy !== 'featured') {
            params.set('sort', sortBy);
        }

        const newUrl = params.toString() ? `/products?${params.toString()}` : '/products';
        const currentUrl = `${window.location.pathname}${window.location.search}`;

        if (newUrl !== currentUrl) {
            // Use history.replaceState instead of router.replace to avoid
            // triggering Next.js searchParams re-render cycle
            window.history.replaceState(window.history.state, '', newUrl);
        }
    }, [selectedCategory, selectedSubcategory, searchTerm, selectedTags, sortBy, urlParamsProcessed, dataReady]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-[#FAFAFA] to-white dark:from-black dark:via-[#050505] dark:to-black pt-4 md:pt-6 lg:pt-8 pb-6 md:pb-8 lg:pb-12">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-6 md:mb-8 lg:mb-10"
                >
                    <p className="text-xs md:text-sm text-[#D4AF76] font-light tracking-widest uppercase mb-1 md:mb-2">
                        {searchTerm ? 'Search Results' : 'Shop by Category'}
                    </p>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-[#2C2C2C] dark:text-gray-100 tracking-tight mb-3 md:mb-4">
                        {searchTerm ? 'Product Search' : 'Our Jewellery'}
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-light max-w-2xl mx-auto">
                        {searchTerm
                            ? (loading
                                ? 'Searching for matching products...'
                                : `Found ${filteredProducts.length} ${filteredProducts.length === 1 ? 'product' : 'products'} matching your search`)
                            : 'Discover our curated selection of fine jewellery, each piece crafted with precision and passion'
                        }
                    </p>

                    {searchTerm && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="mt-6 inline-flex items-center gap-3 bg-white dark:bg-white/10 px-6 py-3 rounded-full shadow-sm"
                        >
                            <span className="text-sm text-gray-600">
                                Searching for "<span className="font-medium text-[#D4AF76]">{searchTerm}</span>"
                            </span>
                            <button
                                onClick={clearSearch}
                                className="text-sm text-white bg-[#D4AF76] hover:bg-[#8B6B4C] px-4 py-1.5 rounded-full transition-colors font-medium flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Clear Search
                            </button>
                        </motion.div>
                    )}
                </motion.div>

                {/* Category Story Badges */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-6 md:mb-8 lg:mb-10"
                >
                    <div className="relative group/scroll">
                        {/* Left Arrow - Desktop Only */}
                        <button
                            onClick={() => scrollByAmount(categoryScrollRef, 'left')}
                            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white/90 shadow-md border border-gray-200 text-[#8B6B4C] hover:bg-[#D4AF76] hover:text-white hover:border-[#D4AF76] transition-all duration-200 opacity-0 group-hover/scroll:opacity-100 -translate-x-1"
                            aria-label="Scroll categories left"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div ref={categoryScrollRef} className="flex gap-3 md:gap-4 lg:gap-6 overflow-x-auto scrollbar-hide py-2 px-1 lg:px-10">
                        {categories.map((category, index) => (
                            <motion.button
                                key={category.name}
                                data-category-selected={selectedCategory === category.name ? "true" : undefined}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCategoryClick(category.name)}
                                className="flex flex-col items-center gap-1.5 md:gap-2 min-w-[64px] md:min-w-[76px] lg:min-w-[80px] group"
                            >
                                {/* Circular Image Container with Story Ring */}
                                <div className={`
                                    relative rounded-full p-[3px] transition-all duration-300
                                    ${selectedCategory === category.name
                                        ? 'bg-gradient-to-tr from-[#D4AF76] via-[#C19A6B] to-[#8B6B4C]'
                                        : 'bg-gradient-to-tr from-gray-200 to-gray-300 group-hover:from-[#D4AF76]/50 group-hover:to-[#8B6B4C]/50'
                                    }
                                `}>
                                    <div className="bg-white rounded-full p-[3px]">
                                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F5] flex items-center justify-center shadow-sm">
                                            {category.image ? (
                                                <img
                                                    src={category.image}
                                                    alt={category.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full">
                                                    {category.name === 'All' ? (
                                                        <svg className="w-6 h-6 md:w-7 md:h-7 text-[#D4AF76]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-6 h-6 md:w-7 md:h-7 text-[#D4AF76]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                        </svg>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Active Indicator */}
                                    {selectedCategory === category.name && (
                                        <motion.div
                                            layoutId="activeRing"
                                            className="absolute -inset-[2px] rounded-full"
                                            style={{
                                                background: 'linear-gradient(135deg, #D4AF76, #8B6B4C)',
                                                filter: 'blur(4px)',
                                                opacity: 0.4
                                            }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </div>

                                {/* Category Name */}
                                <span className={`
                                    text-[10px] md:text-xs font-light tracking-wide transition-colors duration-300 text-center
                                    ${selectedCategory === category.name
                                        ? 'text-[#D4AF76] font-medium'
                                        : 'text-[#2C2C2C] dark:text-gray-100 group-hover:text-[#D4AF76]'
                                    }
                                `}>
                                    {typeof category.name === 'object' ? category.name?.name || '' : category.name}
                                </span>
                            </motion.button>
                        ))}
                        </div>

                        {/* Right Arrow - Desktop Only */}
                        <button
                            onClick={() => scrollByAmount(categoryScrollRef, 'right')}
                            className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white/90 shadow-md border border-gray-200 text-[#8B6B4C] hover:bg-[#D4AF76] hover:text-white hover:border-[#D4AF76] transition-all duration-200 opacity-0 group-hover/scroll:opacity-100 translate-x-1"
                            aria-label="Scroll categories right"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </motion.div>

                {/* Subcategory Filters - Story Style Badges */}
                {allSubcategories.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.25 }}
                        className="mb-6 md:mb-8 lg:mb-10"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#D4AF76]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                <h3 className="text-base md:text-lg font-medium text-[#2C2C2C] dark:text-gray-100">
                                    Browse Subcategories
                                    {selectedCategory !== 'All' && (
                                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">in {selectedCategory}</span>
                                    )}
                                </h3>
                            </div>
                            {selectedSubcategory !== 'All' && (
                                <button
                                    onClick={() => handleSubcategoryClick('All')}
                                    className="text-xs md:text-sm text-[#D4AF76] hover:text-[#8B6B4C] font-medium transition-colors flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Story-style Scrollable Badges */}
                        <div className="relative group/scroll">
                            {/* Left Arrow - Desktop Only */}
                            <button
                                onClick={() => scrollByAmount(subcategoryScrollRef, 'left')}
                                className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white/90 shadow-md border border-gray-200 text-[#8B6B4C] hover:bg-[#D4AF76] hover:text-white hover:border-[#D4AF76] transition-all duration-200 opacity-0 group-hover/scroll:opacity-100 -translate-x-1"
                                aria-label="Scroll subcategories left"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <div ref={subcategoryScrollRef} className="flex gap-3 md:gap-4 lg:gap-5 overflow-x-auto scrollbar-hide py-2 px-1 lg:px-10">
                            {/* All Subcategories Badge */}
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSubcategoryClick('All')}
                                data-subcategory-selected={selectedSubcategory === 'All' ? "true" : undefined}
                                className="flex flex-col items-center gap-1.5 md:gap-2 min-w-[70px] md:min-w-[80px] lg:min-w-[90px] group"
                            >
                                {/* Circular Image Container with Story Ring */}
                                <div className={`
                                    relative rounded-full p-[3px] transition-all duration-300
                                    ${selectedSubcategory === 'All'
                                        ? 'bg-gradient-to-tr from-[#D4AF76] via-[#C19A6B] to-[#8B6B4C]'
                                        : 'bg-gradient-to-tr from-gray-200 to-gray-300 group-hover:from-[#D4AF76]/50 group-hover:to-[#8B6B4C]/50'
                                    }
                                `}>
                                    <div className="bg-white rounded-full p-[3px]">
                                        <div className="w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F5] flex items-center justify-center shadow-sm">
                                            <svg className="w-7 h-7 md:w-8 md:h-8 text-[#D4AF76]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Active Indicator */}
                                    {selectedSubcategory === 'All' && (
                                        <motion.div
                                            layoutId="activeSubcategory"
                                            className="absolute -inset-[2px] rounded-full"
                                            style={{
                                                background: 'linear-gradient(135deg, #D4AF76, #8B6B4C)',
                                                filter: 'blur(4px)',
                                                opacity: 0.4
                                            }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </div>

                                {/* Label */}
                                <span className={`
                                    text-[10px] md:text-xs font-light tracking-wide transition-colors duration-300 text-center line-clamp-2 leading-tight
                                    ${selectedSubcategory === 'All'
                                        ? 'text-[#D4AF76] font-medium'
                                        : 'text-[#2C2C2C] dark:text-gray-100 group-hover:text-[#D4AF76]'
                                    }
                                `}>
                                    All
                                </span>
                            </motion.button>

                            {/* Subcategory Badges */}
                            {subcategories.map((subcategory, index) => (
                                <motion.button
                                    key={subcategory._id}
                                    data-subcategory-selected={selectedSubcategory === subcategory._id ? "true" : undefined}
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleSubcategoryClick(subcategory._id)}
                                    className="flex flex-col items-center gap-1.5 md:gap-2 min-w-[70px] md:min-w-[80px] lg:min-w-[90px] group"
                                >
                                    {/* Circular Image Container with Story Ring */}
                                    <div className={`
                                        relative rounded-full p-[3px] transition-all duration-300
                                        ${selectedSubcategory === subcategory._id
                                            ? 'bg-gradient-to-tr from-[#D4AF76] via-[#C19A6B] to-[#8B6B4C]'
                                            : 'bg-gradient-to-tr from-gray-200 to-gray-300 group-hover:from-[#D4AF76]/50 group-hover:to-[#8B6B4C]/50'
                                        }
                                    `}>
                                        <div className="bg-white rounded-full p-[3px]">
                                            <div className="w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F5] flex items-center justify-center shadow-sm">
                                                {subcategory.image ? (
                                                    <img
                                                        src={subcategory.image}
                                                        alt={subcategory.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <svg className="w-7 h-7 md:w-8 md:h-8 text-[#D4AF76]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>

                                        {/* Active Indicator */}
                                        {selectedSubcategory === subcategory._id && (
                                            <motion.div
                                                layoutId="activeSubcategory"
                                                className="absolute -inset-[2px] rounded-full"
                                                style={{
                                                    background: 'linear-gradient(135deg, #D4AF76, #8B6B4C)',
                                                    filter: 'blur(4px)',
                                                    opacity: 0.4
                                                }}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                    </div>

                                    {/* Subcategory Name */}
                                    <span className={`
                                        text-[10px] md:text-xs font-light tracking-wide transition-colors duration-300 text-center line-clamp-2 leading-tight max-w-[70px] md:max-w-[80px] lg:max-w-[90px]
                                        ${selectedSubcategory === subcategory._id
                                            ? 'text-[#D4AF76] font-medium'
                                            : 'text-[#2C2C2C] dark:text-gray-100 group-hover:text-[#D4AF76]'
                                        }
                                    `}>
                                        {typeof subcategory.name === 'object' ? subcategory.name?.name || '' : subcategory.name}
                                    </span>
                                </motion.button>
                            ))}
                            </div>

                            {/* Right Arrow - Desktop Only */}
                            <button
                                onClick={() => scrollByAmount(subcategoryScrollRef, 'right')}
                                className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white/90 shadow-md border border-gray-200 text-[#8B6B4C] hover:bg-[#D4AF76] hover:text-white hover:border-[#D4AF76] transition-all duration-200 opacity-0 group-hover/scroll:opacity-100 translate-x-1"
                                aria-label="Scroll subcategories right"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Tag Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mb-6 md:mb-8"
                >
                    <div className="bg-white dark:bg-[#0A0A0A] rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-white/[0.06]">
                        <label className="block text-sm font-medium text-[#2C2C2C] dark:text-gray-200 mb-3">
                            Filter by Target Audience
                        </label>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                            {['Men', 'Women', 'Kids'].map((tag) => (
                                <motion.button
                                    key={tag}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        if (selectedTags.includes(tag)) {
                                            setSelectedTags(selectedTags.filter(t => t !== tag));
                                        } else {
                                            setSelectedTags([...selectedTags, tag]);
                                        }
                                    }}
                                    className={`
                                        px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                                        ${selectedTags.includes(tag)
                                            ? 'bg-[#D4AF76] text-white shadow-md'
                                            : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                                        }
                                    `}
                                >
                                    {tag}
                                    {selectedTags.includes(tag) && (
                                        <span className="ml-2">✓</span>
                                    )}
                                </motion.button>
                            ))}
                            {selectedTags.length > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedTags([])}
                                    className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-300"
                                >
                                    Clear Tags ✕
                                </motion.button>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Metal Type Filter */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="mb-6 md:mb-8"
                >
                    <div className="bg-white dark:bg-[#0A0A0A] rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-white/[0.06]">
                        <label className="block text-sm font-medium text-[#2C2C2C] dark:text-gray-200 mb-3">
                            Filter by Metal Type
                        </label>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                            {[
                                { value: 'all', label: 'All', icon: '✨' },
                                { value: 'gold', label: 'Gold', icon: '🥇', color: 'from-yellow-400 to-amber-500' },
                                { value: 'silver', label: 'Silver', icon: '🥈', color: 'from-gray-300 to-slate-400' }
                            ].map((type) => (
                                <motion.button
                                    key={type.value}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setMetalTypeFilter(type.value)}
                                    className={`
                                        px-4 md:px-5 py-2 md:py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2
                                        ${metalTypeFilter === type.value
                                            ? type.value === 'gold'
                                                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-200'
                                                : type.value === 'silver'
                                                    ? 'bg-gradient-to-r from-gray-400 to-slate-500 text-white shadow-lg shadow-gray-300'
                                                    : 'bg-[#D4AF76] text-white shadow-md'
                                            : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                                        }
                                    `}
                                >
                                    <span>{type.icon}</span>
                                    <span>{type.label}</span>
                                    {metalTypeFilter === type.value && (
                                        <span className="ml-1">✓</span>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Filter & Sort Bar - Always visible, shows instant count from categories */}
                {(dataReady || totalProductsCount > 0) && (
                    <motion.div
                        ref={productsGridRef}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#0A0A0A] rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm border border-gray-100 dark:border-white/[0.06]"
                    >
                        {/* Results Count */}
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-[#D4AF76]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="text-xs md:text-sm font-medium text-[#2C2C2C] dark:text-gray-200">
                                {loading && !totalProductsCount ? (
                                    estimatedTotalProducts > 0 ? (
                                        <>~{estimatedTotalProducts} Products{selectedCategory !== 'All' && <span className="hidden sm:inline"> in {selectedCategory}</span>}</>
                                    ) : (
                                        <span className="inline-flex items-center gap-2">
                                            <span className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded shimmer inline-block align-middle" /> Products
                                        </span>
                                    )
                                ) : (
                                    <>
                                        {totalProductsCount} {totalProductsCount === 1 ? 'Product' : 'Products'}
                                        {selectedCategory !== 'All' && <span className="hidden sm:inline"> in {selectedCategory}</span>}
                                        {totalPages > 1 && (
                                            <span className="text-gray-500 ml-1">
                                                (Page {currentPage} of {totalPages})
                                            </span>
                                        )}
                                    </>
                                )}
                            </span>
                        </div>

                        {/* Sort & View Controls */}
                        <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                            {/* Sort Dropdown */}
                            <div className="relative flex-1 sm:flex-initial min-w-0">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full sm:w-auto appearance-none bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-2.5 pr-8 md:pr-10 text-xs md:text-sm font-light text-[#2C2C2C] dark:text-gray-200 hover:border-[#D4AF76] focus:outline-none focus:ring-2 focus:ring-[#D4AF76]/20 focus:border-[#D4AF76] transition-all cursor-pointer"
                                >
                                    <option value="featured">Featured</option>
                                    <option value="newest">Newest</option>
                                    <option value="price-low">Price ↑</option>
                                    <option value="price-high">Price ↓</option>
                                </select>
                                <svg className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* View Toggle */}
                            <div className="flex items-center gap-0.5 md:gap-1 bg-gray-50 dark:bg-white/[0.06] rounded-lg md:rounded-xl p-0.5 md:p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 md:p-2.5 rounded-md md:rounded-lg transition-all ${viewMode === 'grid'
                                        ? 'bg-white text-[#D4AF76] shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    title="Grid View"
                                >
                                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 md:p-2.5 rounded-md md:rounded-lg transition-all ${viewMode === 'list'
                                        ? 'bg-white text-[#D4AF76] shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    title="List View"
                                >
                                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Products Grid/List */}
                {loading ? (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="bg-white dark:bg-[#0A0A0A] rounded-xl md:rounded-2xl overflow-hidden shadow-sm">
                                    <div className="relative aspect-[4/5] bg-gray-200 dark:bg-gray-800 shimmer" />
                                    <div className="p-3 md:p-4 lg:p-6 space-y-2 md:space-y-3">
                                        <div className="h-4 md:h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-3/4 shimmer" />
                                        <div className="h-3 md:h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/2 shimmer" />
                                        <div className="h-4 md:h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/3 shimmer" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="bg-white dark:bg-[#0A0A0A] rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 shadow-sm border border-transparent dark:border-white/[0.06]">
                                    <div className="flex gap-3 md:gap-4 lg:gap-6">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-48 xl:h-48 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-lg md:rounded-xl shimmer" />
                                        <div className="flex-1 flex flex-col justify-center space-y-2 md:space-y-3">
                                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-20 shimmer" />
                                            <div className="h-4 md:h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-3/4 shimmer" />
                                            <div className="h-4 md:h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/4 shimmer" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : filteredProducts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center h-64 text-center"
                    >
                        <svg className="w-20 h-20 text-[#D4AF76] opacity-40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-xl text-[#2C2C2C] dark:text-gray-100 font-light">
                            {searchTerm || selectedCategory !== 'All'
                                ? 'No products found'
                                : 'No products available'
                            }
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            {searchTerm
                                ? 'Try adjusting your search terms'
                                : selectedCategory !== 'All'
                                    ? 'Try selecting a different category'
                                    : 'Check back soon for new items'
                            }
                        </p>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${selectedCategory}-${viewMode}-${currentPage}-${sortBy}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            className={
                                viewMode === 'grid'
                                    ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8"
                                    : "space-y-4"
                            }
                        >
                            {filteredProducts.map((product, index) => (
                                viewMode === 'grid' ? (
                                    <ProductCard key={product._id} product={product} index={index} />
                                ) : (
                                    <ProductListItem key={product._id} product={product} index={index} />
                                )
                            ))}
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* Pagination Controls */}
                {!loading && filteredProducts.length > 0 && totalPages > 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="mt-8 md:mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#0A0A0A] rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-white/[0.06]"
                    >
                        {/* Page Info */}
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Showing <span className="font-medium text-[#D4AF76]">{startIndex + 1}</span> to{' '}
                            <span className="font-medium text-[#D4AF76]">{Math.min(endIndex, totalProductsCount)}</span> of{' '}
                            <span className="font-medium text-[#D4AF76]">{totalProductsCount}</span> products
                        </div>

                        {/* Pagination Buttons */}
                        <div className="flex items-center gap-2">
                            {/* Previous Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setCurrentPage(prev => Math.max(1, prev - 1));
                                    scrollToProducts();
                                }}
                                disabled={currentPage === 1}
                                className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm transition-all ${currentPage === 1
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-[#D4AF76] text-white hover:bg-[#8B6B4C] shadow-sm'
                                    }`}
                            >
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </motion.button>

                            {/* Page Numbers */}
                            <div className="flex items-center gap-1 md:gap-2">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page => {
                                        // Show first page, last page, current page, and pages around current
                                        return (
                                            page === 1 ||
                                            page === totalPages ||
                                            Math.abs(page - currentPage) <= 1
                                        );
                                    })
                                    .map((page, index, array) => (
                                        <React.Fragment key={page}>
                                            {/* Add ellipsis if there's a gap */}
                                            {index > 0 && array[index - 1] !== page - 1 && (
                                                <span className="px-2 text-gray-400">...</span>
                                            )}

                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => {
                                                    setCurrentPage(page);
                                                    scrollToProducts();
                                                }}
                                                className={`w-8 h-8 md:w-10 md:h-10 rounded-lg font-medium text-sm transition-all ${currentPage === page
                                                    ? 'bg-[#D4AF76] text-white shadow-md'
                                                    : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                                                    }`}
                                            >
                                                {page}
                                            </motion.button>
                                        </React.Fragment>
                                    ))}
                            </div>

                            {/* Next Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                    scrollToProducts();
                                }}
                                disabled={currentPage === totalPages}
                                className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm transition-all ${currentPage === totalPages
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-[#D4AF76] text-white hover:bg-[#8B6B4C] shadow-sm'
                                    }`}
                            >
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

// Grid Product Card Component
function ProductCard({ product, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group"
        >
            <Link href={`/products/${product._id}`} className="block">
                <div className="bg-white dark:bg-[#0A0A0A] rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group-hover:-translate-y-1 md:group-hover:-translate-y-2">
                    <div className="relative aspect-[4/5] overflow-hidden">
                        <SafeImage
                            src={product.image}
                            alt={product.name}
                            fill={true}
                            className="object-cover transform group-hover:scale-110 transition-transform duration-700"
                        />
                        {/* Mobile-optimized badge */}
                        <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col gap-1">
                            <span className="bg-white/90 backdrop-blur-sm text-[#D4AF76] text-[10px] md:text-xs px-2 py-1 rounded-full font-medium">
                                {typeof product.category === 'object' ? product.category?.name : product.category}
                            </span>
                            {product.subcategory?.name && (
                                <span className="bg-[#D4AF76]/90 backdrop-blur-sm text-white text-[10px] md:text-xs px-2 py-1 rounded-full font-medium">
                                    {product.subcategory.name}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="p-3 md:p-4 lg:p-6">
                        <h3 className="text-[#2C2C2C] dark:text-gray-100 font-light text-sm md:text-base lg:text-lg mb-2 md:mb-3 group-hover:text-[#D4AF76] transition-colors line-clamp-2">
                            {product.name}
                        </h3>
                        <p className="text-[#2C2C2C] dark:text-gray-200 font-medium text-sm md:text-base lg:text-xl">
                            ₹{(product.sellingPrice || product.price).toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// List Product Item Component
function ProductListItem({ product, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="group"
        >
            <Link href={`/products/${product._id}`} className="block">
                <div className="bg-white dark:bg-[#0A0A0A] rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 shadow-sm hover:shadow-lg transition-all duration-300 group-hover:border-[#D4AF76]/20 border border-transparent dark:border-white/[0.06]">
                    <div className="flex gap-3 md:gap-4 lg:gap-6">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-48 xl:h-48 flex-shrink-0 relative">
                            <SafeImage
                                src={product.image}
                                alt={product.name}
                                fill={true}
                                className="object-cover rounded-lg md:rounded-xl group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                        <div className="flex-1 flex flex-col justify-center min-w-0">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                <p className="text-[10px] sm:text-xs text-[#D4AF76] font-medium tracking-wide uppercase">
                                    {typeof product.category === 'object' ? product.category?.name : product.category}
                                </p>
                                {product.subcategory?.name && (
                                    <>
                                        <span className="text-gray-300">•</span>
                                        <p className="text-[10px] sm:text-xs text-[#8B6B4C] font-medium tracking-wide uppercase">
                                            {product.subcategory.name}
                                        </p>
                                    </>
                                )}
                            </div>
                            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl text-[#2C2C2C] dark:text-gray-100 font-light mb-1 sm:mb-2 md:mb-3 group-hover:text-[#D4AF76] transition-colors line-clamp-2">
                                {product.name}
                            </h3>
                            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-[#2C2C2C] dark:text-gray-200 font-medium">
                                ₹{product.sellingPrice.toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}