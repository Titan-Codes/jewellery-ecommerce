'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Eye, Search, Upload, X, Image as ImageIcon, Bold, Italic, Underline, List, ListOrdered, Quote, Link as LinkIcon, Type, RotateCcw, RemoveFormatting } from 'lucide-react';

import { toast } from 'sonner';


const CATEGORIES = [
    'jewellery-care',
    'fashion-trends',
    'buying-guide',
    'company-news',
    'lifestyle',
    'other'
];

export default function BlogManagement() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBlog, setEditingBlog] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [pagination, setPagination] = useState({});
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState('');
    const editorRef = useRef(null);
    const savedSelectionRef = useRef(null);

    // Sync editor HTML into formData
    const syncEditorContent = useCallback(() => {
        if (editorRef.current) {
            setFormData(prev => ({ ...prev, content: editorRef.current.innerHTML }));
        }
    }, []);

    // Save the current selection so toolbar clicks don't lose it
    const saveSelection = useCallback(() => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
            savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
        }
    }, []);

    // Restore the saved selection into the editor
    const restoreSelection = useCallback(() => {
        if (savedSelectionRef.current) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedSelectionRef.current);
        }
    }, []);

    // Execute formatting commands with robust toggle for mixed-state selections
    const execFormat = useCallback((command, value = null) => {
        // Restore selection that may have been lost to toolbar button focus
        restoreSelection();

        // Toggle commands: bold, italic, underline, strikeThrough
        const toggleCommands = ['bold', 'italic', 'underline', 'strikeThrough'];
        if (toggleCommands.includes(command)) {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) {
                // Check if the command is currently active on the selection
                const isActive = document.queryCommandState(command);

                // Walk through the selected content to detect mixed formatting
                const range = sel.getRangeAt(0);
                const fragment = range.cloneContents();
                const tempDiv = document.createElement('div');
                tempDiv.appendChild(fragment);

                // Determine the tag names associated with each command
                const tagMap = { bold: ['B', 'STRONG'], italic: ['I', 'EM'], underline: ['U'], strikeThrough: ['S', 'STRIKE', 'DEL'] };
                const tags = tagMap[command] || [];
                const hasFormatted = tags.some(tag => tempDiv.querySelector(tag));
                const plainText = tempDiv.textContent || '';
                const allText = editorRef.current?.textContent || '';

                // Mixed state: some formatted, some not — normalize by removing first, then applying
                if (hasFormatted && !isActive) {
                    // Remove existing formatting on the selection, then apply uniformly
                    document.execCommand(command, false, null); // this may partially toggle
                    document.execCommand(command, false, null); // now all off
                    document.execCommand(command, false, null); // apply uniformly
                } else {
                    // Standard toggle: if all on → turn off, if all off → turn on
                    document.execCommand(command, false, null);
                }
            } else {
                // No selection — just toggle at cursor
                document.execCommand(command, false, null);
            }
        } else if (command === 'formatBlock' && value) {
            // Toggle block formatting: if already in the target block, revert to <p>
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                let node = sel.anchorNode;
                // Walk up to find the closest block element
                while (node && node !== editorRef.current) {
                    if (node.nodeType === 1) { // Element node
                        const tagName = node.tagName?.toLowerCase();
                        if (tagName === value.toLowerCase()) {
                            // Already this format — toggle back to paragraph
                            document.execCommand('formatBlock', false, 'p');
                            saveSelection();
                            syncEditorContent();
                            return;
                        }
                        // Stop at block-level elements
                        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'div'].includes(tagName)) {
                            break;
                        }
                    }
                    node = node.parentNode;
                }
            }
            document.execCommand(command, false, value);
        } else {
            document.execCommand(command, false, value);
        }

        // Save the new selection state after formatting
        saveSelection();
        syncEditorContent();
    }, [restoreSelection, saveSelection, syncEditorContent]);

    // Prevent toolbar buttons from stealing focus (keeps text selection alive)
    const preventFocusLoss = useCallback((e) => {
        e.preventDefault();
    }, []);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        category: 'other',
        tags: '',
        featuredImage: { url: '', alt: '' },
        isPublished: false,
        seo: {
            metaTitle: '',
            metaDescription: '',
            keywords: ''
        }
    });

    useEffect(() => {
        fetchBlogs();
    }, [statusFilter, categoryFilter, searchTerm]);

    const fetchBlogs = async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });
            
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);
            if (searchTerm) params.append('search', searchTerm);

            const response = await fetch(`/api/admin/blogs?${params}`);
            const data = await response.json();
            
            if (data.success) {
                setBlogs(data.blogs);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching blogs:', error);
            toast.error('Failed to fetch blogs');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Sync latest editor content before submitting
        if (editorRef.current) {
            formData.content = editorRef.current.innerHTML;
        }
        
        try {
            const payload = {
                ...formData,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                seo: {
                    ...formData.seo,
                    keywords: formData.seo.keywords.split(',').map(k => k.trim()).filter(Boolean)
                }
            };

            const url = editingBlog 
                ? `/api/admin/blogs/${editingBlog._id}`
                : '/api/admin/blogs';
            
            const method = editingBlog ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message);
                setShowForm(false);
                setEditingBlog(null);
                resetForm();
                fetchBlogs();
            } else {
                toast.error(data.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error saving blog:', error);
            toast.error('Failed to save blog');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this blog?')) return;

        try {
            const response = await fetch(`/api/admin/blogs/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message);
                fetchBlogs();
            } else {
                toast.error(data.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting blog:', error);
            toast.error('Failed to delete blog');
        }
    };

    const handleEdit = (blog) => {
        setEditingBlog(blog);
        setFormData({
            title: blog.title,
            slug: blog.slug,
            excerpt: blog.excerpt,
            content: blog.content,
            category: blog.category,
            tags: blog.tags?.join(', ') || '',
            featuredImage: blog.featuredImage || { url: '', alt: '' },
            isPublished: blog.isPublished,
            seo: {
                metaTitle: blog.seo?.metaTitle || '',
                metaDescription: blog.seo?.metaDescription || '',
                keywords: blog.seo?.keywords?.join(', ') || ''
            }
        });
        setImagePreview(blog.featuredImage?.url || '');
        setShowForm(true);
        // Populate the WYSIWYG editor with existing content
        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.innerHTML = blog.content || '';
            }
        }, 50);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            slug: '',
            excerpt: '',
            content: '',
            category: 'other',
            tags: '',
            featuredImage: { url: '', alt: '' },
            isPublished: false,
            seo: {
                metaTitle: '',
                metaDescription: '',
                keywords: ''
            }
        });
        setImagePreview('');
        // Clear the WYSIWYG editor
        if (editorRef.current) {
            editorRef.current.innerHTML = '';
        }
    };

    const generateSlug = (title) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'blogs');

            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setFormData(prev => ({
                    ...prev,
                    featuredImage: {
                        ...prev.featuredImage,
                        url: data.url
                    }
                }));
                setImagePreview(data.url);
                toast.success('Image uploaded successfully');
            } else {
                toast.error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        setFormData(prev => ({
            ...prev,
            featuredImage: { ...prev.featuredImage, url: '' }
        }));
        setImagePreview('');
    };

    if (showForm) {
        return (
            <div className="max-w-5xl mx-auto px-2 sm:px-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-light tracking-wide text-gray-900">
                        {editingBlog ? 'Edit Article' : 'Create New Article'}
                    </h2>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setShowForm(false);
                            setEditingBlog(null);
                            resetForm();
                        }}
                        className="rounded-full px-6 font-light border-gray-300 hover:border-[#D4AF76] hover:text-[#8B6B4C]"
                    >
                        Cancel
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100">
                    <div>
                        <label className="block text-sm font-light mb-3 text-gray-700">Title *</label>
                        <Input
                            value={formData.title}
                            onChange={(e) => {
                                setFormData({
                                    ...formData,
                                    title: e.target.value,
                                    slug: generateSlug(e.target.value)
                                });
                            }}
                            required
                            className="rounded-2xl border-gray-200 focus:border-[#D4AF76] focus:ring-[#D4AF76] font-light"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-light mb-3 text-gray-700">Slug *</label>
                        <Input
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            required
                            className="rounded-2xl border-gray-200 focus:border-[#D4AF76] focus:ring-[#D4AF76] font-light font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-light mb-3 text-gray-700">Excerpt *</label>
                        <Textarea
                            value={formData.excerpt}
                            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                            rows={3}
                            maxLength={500}
                            required
                            className="rounded-2xl border-gray-200 focus:border-[#D4AF76] focus:ring-[#D4AF76] font-light"
                        />
                        <p className="text-xs text-gray-500 mt-2 font-light">
                            {formData.excerpt.length}/500 characters
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-light mb-3 text-gray-700">Content *</label>
                        
                        <div className="border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-[#D4AF76] focus-within:border-transparent transition-all shadow-sm hover:shadow-md bg-white">
                            {/* WYSIWYG Toolbar */}
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-1 p-2 sm:p-2 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                {/* Font Family */}
                                <select
                                    onMouseDown={saveSelection}
                                    onChange={(e) => {
                                        const font = e.target.value;
                                        if (font) {
                                            execFormat('fontName', font);
                                        }
                                        e.target.value = '';
                                    }}
                                    className="h-8 px-2 text-xs border border-gray-200 rounded bg-white focus:border-[#D4AF76] focus:outline-none font-light text-gray-600 cursor-pointer hover:border-gray-300 transition-colors"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Font</option>
                                    <option value="Playfair Display">Playfair Display</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Arial">Arial</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Roboto">Roboto</option>
                                    <option value="Open Sans">Open Sans</option>
                                </select>

                                {/* Font Size */}
                                <select
                                    onMouseDown={saveSelection}
                                    onChange={(e) => {
                                        const size = e.target.value;
                                        if (size) {
                                            execFormat('fontSize', size);
                                        }
                                        e.target.value = '';
                                    }}
                                    className="h-8 px-2 text-xs border border-gray-200 rounded bg-white focus:border-[#D4AF76] focus:outline-none font-light text-gray-600 cursor-pointer hover:border-gray-300 transition-colors"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Size</option>
                                    <option value="1">Small</option>
                                    <option value="3">Normal</option>
                                    <option value="4">Large</option>
                                    <option value="5">Extra Large</option>
                                    <option value="6">Heading</option>
                                </select>

                                <div className="hidden sm:block w-px h-5 bg-gray-300 mx-1"></div>

                                {/* Heading Tags */}
                                <div className="flex items-center gap-0.5 bg-white rounded-lg border border-gray-200 p-0.5">
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => execFormat('formatBlock', 'h2')}
                                        className="p-1 px-2 text-xs font-bold text-gray-600 hover:text-[#D4AF76] hover:bg-gray-50 rounded transition-colors"
                                        title="Heading 2"
                                    >
                                        H2
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => execFormat('formatBlock', 'h3')}
                                        className="p-1 px-2 text-xs font-bold text-gray-600 hover:text-[#D4AF76] hover:bg-gray-50 rounded transition-colors"
                                        title="Heading 3"
                                    >
                                        H3
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => execFormat('formatBlock', 'p')}
                                        className="p-1 px-2 text-xs font-bold text-gray-600 hover:text-[#D4AF76] hover:bg-gray-50 rounded transition-colors"
                                        title="Paragraph"
                                    >
                                        P
                                    </button>
                                </div>

                                <div className="hidden sm:block w-px h-5 bg-gray-300 mx-1"></div>

                                {/* Text Formatting */}
                                <div className="flex items-center gap-0.5 bg-white rounded-lg border border-gray-200 p-0.5">
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => execFormat('bold')}
                                        className="p-1.5 text-gray-600 hover:text-[#D4AF76] hover:bg-gray-50 rounded transition-colors"
                                        title="Bold"
                                    >
                                        <Bold className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => execFormat('italic')}
                                        className="p-1.5 text-gray-600 hover:text-[#D4AF76] hover:bg-gray-50 rounded transition-colors"
                                        title="Italic"
                                    >
                                        <Italic className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => execFormat('underline')}
                                        className="p-1.5 text-gray-600 hover:text-[#D4AF76] hover:bg-gray-50 rounded transition-colors"
                                        title="Underline"
                                    >
                                        <Underline className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="hidden sm:block w-px h-5 bg-gray-300 mx-1"></div>

                                {/* Lists */}
                                <div className="flex items-center gap-0.5 bg-white rounded-lg border border-gray-200 p-0.5">
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => execFormat('insertUnorderedList')}
                                        className="p-1.5 text-gray-600 hover:text-[#D4AF76] hover:bg-gray-50 rounded transition-colors"
                                        title="Bullet List"
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => execFormat('insertOrderedList')}
                                        className="p-1.5 text-gray-600 hover:text-[#D4AF76] hover:bg-gray-50 rounded transition-colors"
                                        title="Numbered List"
                                    >
                                        <ListOrdered className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="hidden sm:block w-px h-5 bg-gray-300 mx-1"></div>

                                {/* Blockquote & Link */}
                                <div className="flex items-center gap-0.5 bg-white rounded-lg border border-gray-200 p-0.5">
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => execFormat('formatBlock', 'blockquote')}
                                        className="p-1.5 text-gray-600 hover:text-[#D4AF76] hover:bg-gray-50 rounded transition-colors"
                                        title="Blockquote"
                                    >
                                        <Quote className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => {
                                            const url = prompt('Enter the URL:');
                                            if (url) {
                                                execFormat('createLink', url);
                                            }
                                        }}
                                        className="p-1.5 text-gray-600 hover:text-[#D4AF76] hover:bg-gray-50 rounded transition-colors"
                                        title="Link"
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="hidden sm:block w-px h-5 bg-gray-300 mx-1"></div>

                                {/* Clear Formatting & Reset */}
                                <div className="flex items-center gap-0.5 bg-white rounded-lg border border-gray-200 p-0.5">
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => execFormat('removeFormat')}
                                        className="p-1.5 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                                        title="Clear Formatting (selected text)"
                                    >
                                        <RemoveFormatting className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={preventFocusLoss}
                                        onClick={() => {
                                            if (window.confirm('Reset all content? This cannot be undone.')) {
                                                if (editorRef.current) {
                                                    editorRef.current.innerHTML = '';
                                                    syncEditorContent();
                                                }
                                            }
                                        }}
                                        className="p-1.5 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                        title="Reset All Content"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* WYSIWYG Content Editor */}
                            <div
                                ref={editorRef}
                                contentEditable
                                suppressContentEditableWarning
                                onInput={syncEditorContent}
                                onBlur={syncEditorContent}
                                onMouseUp={saveSelection}
                                onKeyUp={saveSelection}
                                data-placeholder="Start writing your beautiful story..."
                                className="min-h-[250px] sm:min-h-[400px] font-light text-sm leading-relaxed p-3 sm:p-6 bg-white outline-none focus:outline-none blog-content empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
                                style={{ overflowY: 'auto', maxHeight: '600px', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-2 font-light flex items-center gap-1.5 pl-1">
                            <Type className="w-3.5 h-3.5" />
                            Select text and click a toolbar button to apply formatting. Content is displayed exactly as it will appear on the website.
                        </p>
                    </div>



                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                            <label className="block text-sm font-light mb-3 text-gray-700">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full p-3 border border-gray-200 rounded-2xl focus:border-[#D4AF76] focus:ring-[#D4AF76] focus:outline-none font-light"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-light mb-3 text-gray-700">Tags</label>
                            <Input
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                placeholder="gold, silver, trends (comma separated)"
                                className="rounded-2xl border-gray-200 focus:border-[#D4AF76] focus:ring-[#D4AF76] font-light"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-light mb-3 text-gray-700">Featured Image</label>
                        
                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50 group">
                                <img 
                                    src={imagePreview} 
                                    alt="Preview" 
                                    className="w-full h-64 object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Upload Button */}
                        <div className="flex gap-4">
                            <label className="flex-1">
                                <div className={`
                                    flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-2xl cursor-pointer
                                    transition-all hover:border-[#D4AF76] hover:bg-[#D4AF76]/5
                                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                                    ${imagePreview ? 'border-gray-200' : 'border-gray-300'}
                                `}>
                                    {uploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-[#D4AF76]"></div>
                                            <span className="text-sm font-light text-gray-600">Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5 text-[#8B6B4C]" />
                                            <span className="text-sm font-light text-gray-700">
                                                {imagePreview ? 'Change Image' : 'Upload Image'}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 font-light">Maximum file size: 5MB. Supported formats: JPG, PNG, WebP</p>

                        {/* Alternative: URL Input */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500 font-light">or enter URL</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Input
                                    value={formData.featuredImage.url}
                                    onChange={(e) => {
                                        const url = e.target.value;
                                        setFormData({
                                            ...formData,
                                            featuredImage: { ...formData.featuredImage, url }
                                        });
                                        setImagePreview(url);
                                    }}
                                    placeholder="Image URL (https://...)"
                                    className="rounded-2xl border-gray-200 focus:border-[#D4AF76] focus:ring-[#D4AF76] font-light"
                                />
                            </div>

                            <div>
                                <Input
                                    value={formData.featuredImage.alt}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        featuredImage: { ...formData.featuredImage, alt: e.target.value }
                                    })}
                                    placeholder="Image Alt Text"
                                    className="rounded-2xl border-gray-200 focus:border-[#D4AF76] focus:ring-[#D4AF76] font-light"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6 sm:pt-8">
                        <h3 className="text-base sm:text-lg font-light tracking-wide mb-4 sm:mb-6 text-gray-900">SEO Settings</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-light mb-3 text-gray-700">Meta Title</label>
                                <Input
                                    value={formData.seo.metaTitle}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        seo: { ...formData.seo, metaTitle: e.target.value }
                                    })}
                                    maxLength={60}
                                    className="rounded-2xl border-gray-200 focus:border-[#D4AF76] focus:ring-[#D4AF76] font-light"
                                />
                                <p className="text-xs text-gray-500 mt-2 font-light">
                                    {formData.seo.metaTitle.length}/60 characters
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-light mb-3 text-gray-700">Meta Description</label>
                                <Textarea
                                    value={formData.seo.metaDescription}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        seo: { ...formData.seo, metaDescription: e.target.value }
                                    })}
                                    rows={2}
                                    maxLength={160}
                                    className="rounded-2xl border-gray-200 focus:border-[#D4AF76] focus:ring-[#D4AF76] font-light"
                                />
                                <p className="text-xs text-gray-500 mt-2 font-light">
                                    {formData.seo.metaDescription.length}/160 characters
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-light mb-3 text-gray-700">Keywords</label>
                                <Input
                                    value={formData.seo.keywords}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        seo: { ...formData.seo, keywords: e.target.value }
                                    })}
                                    placeholder="jewellery, gold, fashion (comma separated)"
                                    className="rounded-2xl border-gray-200 focus:border-[#D4AF76] focus:ring-[#D4AF76] font-light"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#D4AF76]/10 to-[#B8956A]/5 rounded-2xl border border-[#D4AF76]/30">
                        <input
                            type="checkbox"
                            id="isPublished"
                            checked={formData.isPublished}
                            onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                            className="w-5 h-5 rounded border-[#D4AF76] text-[#D4AF76] focus:ring-[#D4AF76]"
                        />
                        <label htmlFor="isPublished" className="text-sm font-light text-gray-700">
                            Publish this article immediately
                        </label>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button 
                            type="submit" 
                            className="flex-1 bg-gradient-to-r from-[#D4AF76] to-[#B8956A] hover:from-[#B8956A] hover:to-[#D4AF76] text-[#2C2C2C] rounded-full py-6 font-light shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            {editingBlog ? 'Update Article' : 'Create Article'}
                        </Button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-wide text-gray-900 mb-1 sm:mb-2">
                        Article Management
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 font-light">
                        Create and manage your blog articles
                    </p>
                </div>
                <Button 
                    onClick={() => setShowForm(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-[#D4AF76] to-[#B8956A] hover:from-[#B8956A] hover:to-[#D4AF76] text-[#2C2C2C] rounded-full px-6 sm:px-8 py-5 sm:py-6 font-light shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Create Article
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg mb-6 sm:mb-8 border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search articles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 rounded-2xl border-gray-200 focus:border-[#D4AF76] focus:ring-[#D4AF76] font-light"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="p-3 border border-gray-200 rounded-2xl focus:border-[#D4AF76] focus:ring-[#D4AF76] focus:outline-none font-light"
                    >
                        <option value="all">All Status</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                    </select>

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="p-3 border border-gray-200 rounded-2xl focus:border-[#D4AF76] focus:ring-[#D4AF76] focus:outline-none font-light"
                    >
                        <option value="all">All Categories</option>
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>
                                {cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                        ))}
                    </select>

                    <Button 
                        variant="outline" 
                        onClick={() => fetchBlogs()}
                        className="rounded-full font-light border-gray-300 hover:border-[#D4AF76] hover:bg-[#D4AF76]/5"
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Blog List */}
            {loading ? (
                <div className="space-y-4 sm:space-y-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-4 sm:p-6 lg:p-8">
                            <div className="flex gap-4">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-xl shimmer flex-shrink-0"></div>
                                <div className="flex-1 space-y-3">
                                    <div className="h-5 w-3/4 bg-gray-200 rounded shimmer"></div>
                                    <div className="h-4 w-full bg-gray-100 rounded shimmer"></div>
                                    <div className="h-4 w-1/2 bg-gray-100 rounded shimmer"></div>
                                    <div className="flex gap-2 mt-2">
                                        <div className="h-6 w-16 bg-gray-200 rounded-full shimmer"></div>
                                        <div className="h-6 w-20 bg-gray-200 rounded-full shimmer"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : blogs.length === 0 ? (
                <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-100">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF76]/20 to-[#B8956A]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search size={40} className="text-[#8B6B4C]" />
                    </div>
                    <p className="text-gray-500 font-light text-lg">No articles found</p>
                </div>
            ) : (
                <div className="space-y-4 sm:space-y-6">
                    {blogs.map((blog) => (
                        <div 
                            key={blog._id} 
                            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300"
                        >
                            <div className="p-4 sm:p-6 lg:p-8">
                                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                                    {blog.featuredImage?.url && (
                                        <img
                                            src={blog.featuredImage.url}
                                            alt={blog.featuredImage.alt || blog.title}
                                            className="w-full sm:w-40 lg:w-48 h-40 sm:h-28 lg:h-32 object-cover rounded-xl sm:rounded-2xl flex-shrink-0"
                                        />
                                    )}
                                    
                                    <div className="flex-1 min-w-0 w-full">
                                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                                    <h3 className="text-lg sm:text-xl lg:text-2xl font-light tracking-wide text-gray-900">{blog.title}</h3>
                                                    <span className={`px-3 sm:px-4 py-1 sm:py-1.5 text-xs font-light rounded-full whitespace-nowrap ${
                                                        blog.isPublished 
                                                            ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-200' 
                                                            : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border border-gray-200'
                                                    }`}>
                                                        {blog.isPublished ? 'Published' : 'Draft'}
                                                    </span>
                                                </div>
                                                
                                                <p className="text-sm sm:text-base text-gray-600 font-light mb-3 sm:mb-4 line-clamp-2">{blog.excerpt}</p>
                                                
                                                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 font-light">
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF76]"></span>
                                                        {blog.category.replace(/-/g, ' ')}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <Eye size={14} />
                                                        {blog.views || 0} views
                                                    </span>
                                                    <span className="hidden sm:inline">By: {blog.author?.name || 'Admin'}</span>
                                                    {blog.publishedAt && (
                                                        <span className="hidden sm:inline">
                                                            {new Date(blog.publishedAt).toLocaleDateString('en-US', { 
                                                                year: 'numeric', 
                                                                month: 'short', 
                                                                day: 'numeric' 
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2 flex-shrink-0">
                                                {blog.isPublished && (
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => window.open(`/blogs/${blog.slug}`, '_blank')}
                                                        className="rounded-full h-9 w-9 sm:h-10 sm:w-10 border-blue-300 hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200"
                                                    >
                                                        <Eye size={15} className="text-blue-500" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleEdit(blog)}
                                                    className="rounded-full h-9 w-9 sm:h-10 sm:w-10 border-gray-300 hover:border-[#D4AF76] hover:bg-[#D4AF76]/5 transition-colors duration-200"
                                                >
                                                    <Edit size={15} className="text-[#8B6B4C]" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleDelete(blog._id)}
                                                    className="rounded-full h-9 w-9 sm:h-10 sm:w-10 border-red-300 hover:border-red-400 hover:bg-red-50 transition-colors duration-200"
                                                >
                                                    <Trash2 size={15} className="text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
                    <Button
                        variant="outline"
                        onClick={() => fetchBlogs(pagination.page - 1)}
                        disabled={!pagination.hasPrev}
                        className="w-full sm:w-auto rounded-full px-6 font-light border-gray-300 hover:border-[#D4AF76] hover:bg-[#D4AF76]/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </Button>
                    <span className="px-6 py-2 bg-gradient-to-r from-[#D4AF76]/20 to-[#B8956A]/10 rounded-full font-light text-[#8B6B4C] border border-[#D4AF76]/30 text-sm sm:text-base">
                        Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => fetchBlogs(pagination.page + 1)}
                        disabled={!pagination.hasNext}
                        className="w-full sm:w-auto rounded-full px-6 font-light border-gray-300 hover:border-[#D4AF76] hover:bg-[#D4AF76]/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
