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

// GET all blogs (admin view - includes unpublished)
export async function GET(request) {
    try {
        const authCheck = await checkAdminAccess();
        if (authCheck.error) {
            return NextResponse.json(
                { error: authCheck.error },
                { status: authCheck.status }
            );
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const status = searchParams.get('status'); // 'published', 'draft', 'all'
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        await connectDB();

        // Build query
        let matchStage = {};
        
        if (status === 'published') {
            matchStage.isPublished = true;
        } else if (status === 'draft') {
            matchStage.isPublished = false;
        }
        
        if (category && category !== 'all') {
            matchStage.category = category;
        }
        
        if (search) {
            matchStage.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        // Use aggregation for better performance
        const [blogsResult, totalCount] = await Promise.all([
            Blog.aggregate([
                { $match: matchStage },
                { $sort: { createdAt: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'author',
                        foreignField: '_id',
                        as: 'authorData'
                    }
                },
                {
                    $addFields: {
                        author: {
                            $let: {
                                vars: {
                                    authorDoc: { $arrayElemAt: ['$authorData', 0] }
                                },
                                in: {
                                    _id: '$$authorDoc._id',
                                    name: '$$authorDoc.name',
                                    email: '$$authorDoc.email'
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        authorData: 0
                    }
                }
            ]),
            Blog.countDocuments(matchStage)
        ]);

        return NextResponse.json({
            success: true,
            blogs: blogsResult,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch blogs' },
            { status: 500 }
        );
    }
}

// POST create new blog
export async function POST(request) {
    try {
        const authCheck = await checkAdminAccess();
        if (authCheck.error) {
            return NextResponse.json(
                { error: authCheck.error },
                { status: authCheck.status }
            );
        }

        const data = await request.json();

        // Validate required fields
        if (!data.title || !data.excerpt || !data.content) {
            return NextResponse.json(
                { error: 'Title, excerpt, and content are required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Generate unique slug
        let slug = data.slug || data.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Check if slug exists and make it unique
        let slugExists = await Blog.findOne({ slug });
        let counter = 1;
        while (slugExists) {
            slug = `${slug}-${counter}`;
            slugExists = await Blog.findOne({ slug });
            counter++;
        }

        // Create blog
        const blog = new Blog({
            ...data,
            slug,
            author: authCheck.user._id
        });

        await blog.save();
        await blog.populate('author', 'name email');

        // Invalidate public blog list cache so the new blog appears immediately
        cache.deleteByPrefix('blogs:public:');

        return NextResponse.json({
            success: true,
            blog,
            message: 'Blog created successfully'
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating blog:', error);
        return NextResponse.json(
            { error: 'Failed to create blog' },
            { status: 500 }
        );
    }
}
