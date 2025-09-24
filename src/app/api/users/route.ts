import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appUsers, user, userRoles } from '@/db/schema';
import { eq, like, and, or, desc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// Admin authentication middleware
async function authenticateAdmin(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || !session.user) {
      return { authenticated: false, user: null, error: 'Authentication required' };
    }

    // Check if user has admin role
    const adminRole = await db.select()
      .from(userRoles)
      .where(and(
        eq(userRoles.userId, session.user.id),
        eq(userRoles.role, 'admin')
      ))
      .limit(1);

    if (adminRole.length === 0) {
      return { authenticated: false, user: null, error: 'Admin access required' };
    }

    return { authenticated: true, user: session.user, error: null };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authenticated: false, user: null, error: 'Authentication failed' };
  }
}

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation helper for +91 format
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+91[1-9]\d{9}$/;
  return phoneRegex.test(phone);
}

export async function GET(request: NextRequest) {
  try {
    const { authenticated, error } = await authenticateAdmin(request);
    
    if (!authenticated) {
      const status = error === 'Admin access required' ? 403 : 401;
      return NextResponse.json({ error, code: 'UNAUTHORIZED' }, { status });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10'), 100);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    if (page < 1 || pageSize < 1) {
      return NextResponse.json({ 
        error: 'Page and pageSize must be positive integers',
        code: 'INVALID_PAGINATION' 
      }, { status: 400 });
    }

    let whereConditions = [];

    // Search by name or email
    if (search) {
      whereConditions.push(
        or(
          like(appUsers.name, `%${search}%`),
          like(appUsers.email, `%${search}%`)
        )
      );
    }

    // Filter by role
    if (role && ['customer', 'client', 'admin'].includes(role)) {
      whereConditions.push(eq(appUsers.role, role));
    }

    // Filter by status
    if (status && ['active', 'inactive'].includes(status)) {
      whereConditions.push(eq(appUsers.status, status));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count for pagination
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(appUsers)
      .where(whereClause);
    
    const total = totalResult[0].count;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    // Get paginated results
    let query = db.select().from(appUsers);
    
    if (whereClause) {
      query = query.where(whereClause);
    }

    const results = await query
      .orderBy(desc(appUsers.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('GET app_users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authenticated, error } = await authenticateAdmin(request);
    
    if (!authenticated) {
      const status = error === 'Admin access required' ? 403 : 401;
      return NextResponse.json({ error, code: 'UNAUTHORIZED' }, { status });
    }

    const body = await request.json();
    const { authUserId, name, email, phone, role, status } = body;

    // Validate required fields
    if (!authUserId) {
      return NextResponse.json({ 
        error: 'authUserId is required',
        code: 'MISSING_AUTH_USER_ID' 
      }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Name is required and must be non-empty',
        code: 'INVALID_NAME' 
      }, { status: 400 });
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ 
        error: 'Valid email is required',
        code: 'INVALID_EMAIL' 
      }, { status: 400 });
    }

    if (!role || !['customer', 'client', 'admin'].includes(role)) {
      return NextResponse.json({ 
        error: 'Role must be one of: customer, client, admin',
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }

    // Validate optional phone format
    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ 
        error: 'Phone must be in +91 format (e.g., +919876543210)',
        code: 'INVALID_PHONE' 
      }, { status: 400 });
    }

    // Validate status if provided
    if (status && !['active', 'inactive'].includes(status)) {
      return NextResponse.json({ 
        error: 'Status must be one of: active, inactive',
        code: 'INVALID_STATUS' 
      }, { status: 400 });
    }

    // Check if authUserId exists in user table
    const userExists = await db.select()
      .from(user)
      .where(eq(user.id, authUserId))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json({ 
        error: 'Referenced user does not exist',
        code: 'USER_NOT_FOUND' 
      }, { status: 400 });
    }

    // Check for duplicate email
    const emailExists = await db.select()
      .from(appUsers)
      .where(eq(appUsers.email, email.toLowerCase()))
      .limit(1);

    if (emailExists.length > 0) {
      return NextResponse.json({ 
        error: 'Email already exists',
        code: 'EMAIL_DUPLICATE' 
      }, { status: 409 });
    }

    // Check for duplicate authUserId
    const authUserExists = await db.select()
      .from(appUsers)
      .where(eq(appUsers.authUserId, authUserId))
      .limit(1);

    if (authUserExists.length > 0) {
      return NextResponse.json({ 
        error: 'User is already registered in app_users',
        code: 'AUTH_USER_DUPLICATE' 
      }, { status: 409 });
    }

    // Create new app user
    const newAppUser = await db.insert(appUsers).values({
      authUserId,
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone || null,
      role,
      status: status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    return NextResponse.json(newAppUser[0], { status: 201 });

  } catch (error) {
    console.error('POST app_users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { authenticated, error } = await authenticateAdmin(request);
    
    if (!authenticated) {
      const status = error === 'Admin access required' ? 403 : 401;
      return NextResponse.json({ error, code: 'UNAUTHORIZED' }, { status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, phone, role, status } = body;

    // Check if record exists
    const existingUser = await db.select()
      .from(appUsers)
      .where(eq(appUsers.id, parseInt(id)))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'App user not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    const updates: any = {};

    // Validate and prepare updates
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Name must be non-empty string',
          code: 'INVALID_NAME' 
        }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return NextResponse.json({ 
          error: 'Valid email is required',
          code: 'INVALID_EMAIL' 
        }, { status: 400 });
      }

      // Check for duplicate email (excluding current record)
      const emailExists = await db.select()
        .from(appUsers)
        .where(and(
          eq(appUsers.email, email.toLowerCase()),
          sql`${appUsers.id} != ${parseInt(id)}`
        ))
        .limit(1);

      if (emailExists.length > 0) {
        return NextResponse.json({ 
          error: 'Email already exists',
          code: 'EMAIL_DUPLICATE' 
        }, { status: 409 });
      }

      updates.email = email.toLowerCase();
    }

    if (phone !== undefined) {
      if (phone && !isValidPhone(phone)) {
        return NextResponse.json({ 
          error: 'Phone must be in +91 format (e.g., +919876543210)',
          code: 'INVALID_PHONE' 
        }, { status: 400 });
      }
      updates.phone = phone || null;
    }

    if (role !== undefined) {
      if (!['customer', 'client', 'admin'].includes(role)) {
        return NextResponse.json({ 
          error: 'Role must be one of: customer, client, admin',
          code: 'INVALID_ROLE' 
        }, { status: 400 });
      }
      updates.role = role;
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return NextResponse.json({ 
          error: 'Status must be one of: active, inactive',
          code: 'INVALID_STATUS' 
        }, { status: 400 });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields to update',
        code: 'NO_UPDATES' 
      }, { status: 400 });
    }

    updates.updatedAt = new Date().toISOString();

    const updatedUser = await db.update(appUsers)
      .set(updates)
      .where(eq(appUsers.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedUser[0]);

  } catch (error) {
    console.error('PUT app_users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { authenticated, error } = await authenticateAdmin(request);
    
    if (!authenticated) {
      const status = error === 'Admin access required' ? 403 : 401;
      return NextResponse.json({ error, code: 'UNAUTHORIZED' }, { status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    // Check if record exists
    const existingUser = await db.select()
      .from(appUsers)
      .where(eq(appUsers.id, parseInt(id)))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'App user not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    const deletedUser = await db.delete(appUsers)
      .where(eq(appUsers.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'App user deleted successfully',
      data: deletedUser[0]
    });

  } catch (error) {
    console.error('DELETE app_users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}