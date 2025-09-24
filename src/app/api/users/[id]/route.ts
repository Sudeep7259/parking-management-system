import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appUsers, userRoles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

async function checkAdminAuth(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED' 
      }, { status: 401 });
    }

    const userRole = await db.select()
      .from(userRoles)
      .where(and(
        eq(userRoles.userId, session.user.id),
        eq(userRoles.role, 'admin')
      ))
      .limit(1);

    if (userRole.length === 0) {
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    return { user: session.user };
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED' 
    }, { status: 401 });
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+91[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const appUser = await db.select()
      .from(appUsers)
      .where(eq(appUsers.id, parseInt(id)))
      .limit(1);

    if (appUser.length === 0) {
      return NextResponse.json({ 
        error: 'App user not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(appUser[0]);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    const { name, email, phone, role, status } = requestBody;

    // Validation for provided fields
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json({ 
        error: "Name cannot be empty",
        code: "INVALID_NAME" 
      }, { status: 400 });
    }

    if (email !== undefined && (!email || !validateEmail(email))) {
      return NextResponse.json({ 
        error: "Valid email is required",
        code: "INVALID_EMAIL" 
      }, { status: 400 });
    }

    if (phone !== undefined && phone && !validatePhone(phone)) {
      return NextResponse.json({ 
        error: "Phone must be in +91XXXXXXXXXX format",
        code: "INVALID_PHONE" 
      }, { status: 400 });
    }

    if (role !== undefined && !['customer', 'client', 'admin'].includes(role)) {
      return NextResponse.json({ 
        error: "Role must be customer, client, or admin",
        code: "INVALID_ROLE" 
      }, { status: 400 });
    }

    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      return NextResponse.json({ 
        error: "Status must be active or inactive",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Check if user exists
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

    // Check for email uniqueness if email is being updated
    if (email && email !== existingUser[0].email) {
      const emailExists = await db.select()
        .from(appUsers)
        .where(eq(appUsers.email, email))
        .limit(1);

      if (emailExists.length > 0) {
        return NextResponse.json({ 
          error: "Email already exists",
          code: "EMAIL_ALREADY_EXISTS" 
        }, { status: 409 });
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    const updated = await db.update(appUsers)
      .set(updateData)
      .where(eq(appUsers.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if user exists
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

    const deleted = await db.delete(appUsers)
      .where(eq(appUsers.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: "success",
      data: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}