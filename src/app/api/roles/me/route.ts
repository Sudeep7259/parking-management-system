import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userRoles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRolesResult = await db
      .select({
        role: userRoles.role
      })
      .from(userRoles)
      .where(eq(userRoles.userId, session.user.id));

    const roles = userRolesResult.map(ur => ur.role);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('GET user roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}