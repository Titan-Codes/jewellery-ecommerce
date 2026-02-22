'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Calendar, Clock, Eye, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import CloudinaryImage from '@/app/components/CloudinaryImage';

const CATEGORIES = [
    { value: 'all', label: 'All Categories' },
    { value: 'jewellery-care', label: 'Jewellery Care' },
    { value: 'fashion-trends', label: 'Fashion Trends' },
    { value: 'buying-guide', label: 'Buying Guide' },
    { value: 'company-news', label: 'Company News' },
    { value: 'lifestyle', label: 'Lifestyle' },
    { value: 'other', label: 'Other' }
];

export default function BlogsPage() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('all');
    const [pagination, setPagination] = useState({});
    const [currentPage, setCurrentPage] = useState(1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchBlogs();
    }, [category, currentPage]);

    const fetchBlogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '12'
            });
            
            if (category !== 'all') params.append('category', category);
            if (searchTerm) params.append('search', searchTerm);

            const response = await fetch(`/api/blogs?${params}`);
            const data = await response.json();
            
            if (data.success) {
                setBlogs(data.blogs);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching blogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchBlogs();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-black dark:via-[#050505] dark:to-[#0A0A0A]">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-[#2C2C2C] via-[#3A3A3A] to-[#2C2C2C] text-white py-24 overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-[#D4AF76] rounded-full filter blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#D4AF76] rounded-full filter blur-3xl"></div>
                </div>
                
                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-12">
                        <h1 className="text-5xl md:text-6xl font-light tracking-wide mb-6">
                            Our <span className="text-[#D4AF76] font-normal">Journal</span>
                        </h1>
                        <p className="text-xl font-light text-gray-300 max-w-2xl mx-auto leading-relaxed">
                            Discover timeless elegance through stories, trends, and expert insights from the world of fine jewellery
                        </p>
                    </div>
                    
                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                        <div className="relative">
                            <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search for articles, trends, care tips..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-14 pr-32 py-5 text-gray-900 dark:text-gray-100 bg-white/95 dark:bg-white/10 backdrop-blur-sm rounded-full shadow-2xl focus:outline-none focus:ring-2 focus:ring-[#D4AF76] transition-all font-light dark:placeholder-gray-500"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#D4AF76] text-[#2C2C2C] px-8 py-3 rounded-full hover:bg-[#B8956A] transition-all duration-300 font-light shadow-lg"
                            >
                                Search
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16">
                {/* Category Filter */}
                <div className="mb-12">
                    <div className="flex flex-wrap gap-3 justify-center">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => {
                                    setCategory(cat.value);
                                    setCurrentPage(1);
                                }}
                                className={`px-6 py-3 rounded-full font-light transition-all duration-300 ${
                                    category === cat.value
                                        ? 'bg-[#D4AF76] text-[#2C2C2C] shadow-lg scale-105'
                                        : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.15] hover:shadow-md border border-gray-200 dark:border-white/[0.06]'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Blog Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-[#0A0A0A] rounded-3xl overflow-hidden shadow-sm dark:border dark:border-white/[0.06]">
                                <div className="aspect-[16/10] bg-gray-200 dark:bg-gray-800 shimmer"></div>
                                <div className="p-5 space-y-3">
                                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded shimmer"></div>
                                    <div className="h-5 w-full bg-gray-200 dark:bg-gray-800 rounded shimmer"></div>
                                    <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded shimmer"></div>
                                    <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-800 rounded shimmer"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : blogs.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-[#0A0A0A] rounded-3xl shadow-sm dark:shadow-none dark:border dark:border-white/[0.06]">
                        <svg className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-light">No articles found</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2 font-light">Try adjusting your search or filter</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {blogs.map((blog) => (
                                <Link
                                    key={blog._id}
                                    href={`/blogs/${blog.slug}`}
                                    className="group bg-white dark:bg-[#0A0A0A] rounded-3xl shadow-md dark:shadow-none dark:border dark:border-white/[0.06] overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
                                >
                                    {/* Featured Image */}
                                    {blog.featuredImage?.url ? (
                                        <div className="relative h-56 w-full overflow-hidden">
                                            <CloudinaryImage
                                                src={blog.featuredImage.url}
                                                alt={blog.featuredImage.alt || blog.title}
                                                width={400}
                                                height={224}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        </div>
                                    ) : (
                                        <div className="h-56 bg-gradient-to-br from-[#D4AF76]/20 via-[#B8956A]/10 to-[#D4AF76]/20 flex items-center justify-center">
                                            <svg className="w-16 h-16 text-[#D4AF76]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="p-6">
                                        {/* Category Badge */}
                                        <div className="mb-3">
                                            <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-[#D4AF76]/20 to-[#B8956A]/20 text-[#8B6B4C] text-xs font-light rounded-full border border-[#D4AF76]/30">
                                                {blog.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-xl font-normal mb-3 text-gray-900 dark:text-gray-100 group-hover:text-[#8B6B4C] dark:group-hover:text-[#D4AF76] transition-colors line-clamp-2 tracking-wide">
                                            {blog.title}
                                        </h3>

                                        {/* Excerpt */}
                                        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 font-light leading-relaxed text-sm">
                                            {blog.excerpt}
                                        </p>

                                        {/* Meta Info */}
                                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
                                            <div className="flex items-center gap-4 font-light">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4 text-[#D4AF76]" />
                                                    {blog.readTime} min
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Eye className="w-4 h-4 text-[#D4AF76]" />
                                                    {blog.views || 0}
                                                </span>
                                            </div>
                                            <span className="flex items-center gap-1.5 text-xs font-light">
                                                <Calendar className="w-3.5 h-3.5 text-[#D4AF76]" />
                                                {new Date(blog.publishedAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        {/* Tags */}
                                        {blog.tags && blog.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-4">
                                                {blog.tags.slice(0, 3).map((tag, index) => (
                                                    <span
                                                        key={index}
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 text-xs rounded-full font-light border border-gray-200 dark:border-white/[0.06]"
                                                    >
                                                        <Tag className="w-3 h-3" />
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-16">
                                <button
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    disabled={!pagination.hasPrev}
                                    className="px-8 py-3 bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-white/[0.15] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg font-light border border-gray-200 dark:border-white/[0.06]"
                                >
                                    Previous
                                </button>
                                <span className="px-6 py-3 bg-gradient-to-r from-[#D4AF76] to-[#B8956A] text-white rounded-full font-light shadow-lg">
                                    {pagination.page} / {pagination.pages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    disabled={!pagination.hasNext}
                                    className="px-8 py-3 bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-white/[0.15] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg font-light border border-gray-200 dark:border-white/[0.06]"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
