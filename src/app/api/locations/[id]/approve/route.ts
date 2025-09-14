import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { parkingLocations, userRoles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const locationId = parseInt(params.id);
    if (isNaN(locationId)) {
      return NextResponse.json({ 
        error: 'Valid location ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const body = await request.json();
    const { approve } = body;

    if (typeof approve !== 'boolean') {
      return NextResponse.json({ 
        error: 'approve field must be a boolean',
        code: 'INVALID_APPROVE_FIELD'
      }, { status: 400 });
    }

    const adminRoles = await db.select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, session.user.id), eq(userRoles.role, 'admin')))
      .limit(1);

    if (adminRoles.length === 0) {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }

    const locations = await db.select()
      .from(parkingLocations)
      .where(eq(parkingLocations.id, locationId))
      .limit(1);

    if (locations.length === 0) {
      return NextResponse.json({ 
        error: 'Location not found',
        code: 'LOCATION_NOT_FOUND'
      }, { status: 404 });
    }

    const now = new Date();
    let updateData: any = {
      updatedAt: now.toISOString()
    };

    if (approve) {
      updateData.approved = 1;
      updateData.approvedBy = session.user.id;
      updateData.approvedAt = now;
    } else {
      updateData.approved = 0;
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    }

    const updated = await db.update(parkingLocations)
      .set(updateData)
      .where(eq(parkingLocations.id, locationId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update location',
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('POST /api/locations/[id]/approve error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}