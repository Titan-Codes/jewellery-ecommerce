import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Blog from '@/models/Blog';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import cache from '@/lib/cache';

// Check admin access
async function checkAdminAccess() {
    try {
        const cookieStore = await cookies();
        const token = await cookieStore.get('token');

        if (!token) {
            return { error: 'Unauthorized', status: 401 };
        }

        const decoded = verifyToken(token.value);
        if (!decoded) {
            return { error: 'Invalid token', status: 401 };
        }

        await connectDB();
        const user = await User.findById(decoded.userId);

        if (!user || !user.isAdmin) {
            return { error: 'Admin access required', status: 403 };
        }

        return { user };
    } catch (error) {
        console.error('Admin auth error:', error);
        return { error: 'Internal server error', status: 500 };
    }
}

// GET single blog
export async function GET(request, context) {
    try {
        const authCheck = await checkAdminAccess();
        if (authCheck.error) {
            return NextResponse.json(
                { error: authCheck.error },
                { status: authCheck.status }
            );
        }

        const params = await context.params;
        const { id } = params;

        await connectDB();
        const blog = await Blog.findById(id).populate('author', 'name email');

        if (!blog) {
            return NextResponse.json(
                { error: 'Blog not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, blog });
    } catch (error) {
        console.error('Error fetching blog:', error);
        return NextResponse.json(
            { error: 'Failed to fetch blog' },
            { status: 500 }
        );
    }
}

// PUT update blog
export async function PUT(request, context) {
    try {
        const authCheck = await checkAdminAccess();
        if (authCheck.error) {
            return NextResponse.json(
                { error: authCheck.error },
                { status: authCheck.status }
            );
        }

        const params = await context.params;
        const { id } = params;
        const data = await request.json();

        await connectDB();

        // If slug is being changed, check if it's unique
        if (data.slug) {
            const existingBlog = await Blog.findOne({ 
                slug: data.slug, 
                _id: { $ne: id } 
            });
            
            if (existingBlog) {
                return NextResponse.json(
                    { error: 'Slug already exists' },
                    { status: 400 }
                );
            }
        }

        // Get old blog to know the slug for cache invalidation
        const oldBlog = await Blog.findById(id).select('slug');

        const blog = await Blog.findByIdAndUpdate(
            id,
            { ...data },
            { new: true, runValidators: true }
        ).populate('author', 'name email');

        if (!blog) {
            return NextResponse.json(
                { error: 'Blog not found' },
                { status: 404 }
            );
        }

        // Invalidate caches
        if (oldBlog?.slug) {
            cache.delete(`blog:${oldBlog.slug}`);
        }
        if (blog?.slug && blog.slug !== oldBlog?.slug) {
            cache.delete(`blog:${blog.slug}`);
        }
        cache.deleteByPrefix('blogs:public:');

        return NextResponse.json({
            success: true,
            blog,
            message: 'Blog updated successfully'
        });
    } catch (error) {
        console.error('Error updating blog:', error);
        return NextResponse.json(
            { error: 'Failed to update blog' },
            { status: 500 }
        );
    }
}

// DELETE blog
export async function DELETE(request, context) {
    try {
        const authCheck = await checkAdminAccess();
        if (authCheck.error) {
            return NextResponse.json(
                { error: authCheck.error },
                { status: authCheck.status }
            );
        }

        const params = await context.params;
        const { id } = params;

        await connectDB();
        const blog = await Blog.findByIdAndDelete(id);

        if (!blog) {
            return NextResponse.json(
                { error: 'Blog not found' },
                { status: 404 }
            );
        }

        // Invalidate caches
        if (blog?.slug) {
            cache.delete(`blog:${blog.slug}`);
        }
        cache.deleteByPrefix('blogs:public:');

        return NextResponse.json({
            success: true,
            message: 'Blog deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting blog:', error);
        return NextResponse.json(
            { error: 'Failed to delete blog' },
            { status: 500 }
        );
    }
}
