import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { parkingLocations, user, userRoles } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { auth } from '@/lib/auth';

async function isAdmin(userId: string): Promise<boolean> {
  const roles = await db.select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, 'admin')))
    .limit(1);
  
  return roles.length > 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    if (!params.id || isNaN(parseInt(params.id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const locationId = parseInt(params.id);

    const locations = await db.select({
      location: parkingLocations,
      owner: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    })
    .from(parkingLocations)
    .leftJoin(user, eq(parkingLocations.ownerUserId, user.id))
    .where(eq(parkingLocations.id, locationId))
    .limit(1);

    if (locations.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const location = locations[0];

    if (!location.location.approved && 
        location.location.ownerUserId !== session.user.id && 
        !await isAdmin(session.user.id)) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: location.location.id,
      ownerUserId: location.location.ownerUserId,
      ownerName: location.owner?.name,
      ownerEmail: location.owner?.email,
      title: location.location.title,
      description: location.location.description,
      address: location.location.address,
      city: location.location.city,
      state: location.location.state,
      pincode: location.location.pincode,
      latitude: location.location.latitude,
      longitude: location.location.longitude,
      photos: location.location.photos,
      totalSlots: location.location.totalSlots,
      availableSlots: location.location.availableSlots,
      pricingMode: location.location.pricingMode,
      basePricePerHourPaise: location.location.basePricePerHourPaise,
      slabJson: location.location.slabJson,
      approved: location.location.approved,
      approvedBy: location.location.approvedBy,
      approvedAt: location.location.approvedAt,
      createdAt: location.location.createdAt,
      updatedAt: location.location.updatedAt,
    });

  } catch (error) {
    console.error('GET location error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    if (!params.id || isNaN(parseInt(params.id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const locationId = parseInt(params.id);
    const body = await request.json();

    const location = await db.select()
      .from(parkingLocations)
      .where(eq(parkingLocations.id, locationId))
      .limit(1);

    if (location.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const currentLocation = location[0];

    const isUserAdmin = await isAdmin(session.user.id);
    if (currentLocation.ownerUserId !== session.user.id && !isUserAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const allowedFields = [
      'availableSlots', 'photos', 'pricingMode', 'basePricePerHourPaise', 
      'slabJson', 'address', 'city', 'state', 'pincode', 'title', 'description'
    ];

    const updates: any = {};
    const errors: string[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (!allowedFields.includes(key)) continue;

      switch (key) {
        case 'availableSlots':
          if (typeof value !== 'number' || value < 0) {
            errors.push('availableSlots must be a non-negative number');
          } else {
            updates.availableSlots = value;
          }
          break;
        case 'photos':
          if (value !== null && value !== undefined) {
            try {
              if (Array.isArray(value)) {
                updates.photos = value;
              } else if (typeof value === 'string') {
                JSON.parse(value);
                updates.photos = JSON.parse(value);
              }
            } catch {
              errors.push('photos must be a valid JSON array');
            }
          }
          break;
        case 'pricingMode':
          if (typeof value !== 'string' || !['hourly', 'slab'].includes(value)) {
            errors.push('pricingMode must be one of: hourly, slab');
          } else {
            updates.pricingMode = value;
          }
          break;
        case 'basePricePerHourPaise':
          if (typeof value !== 'number' || value < 0) {
            errors.push('basePricePerHourPaise must be a non-negative number');
          } else {
            updates.basePricePerHourPaise = value;
          }
          break;
        case 'slabJson':
          if (value !== null && value !== undefined) {
            try {
              if (typeof value === 'object') {
                updates.slabJson = value;
              } else {
                JSON.parse(value as string);
                updates.slabJson = JSON.parse(value as string);
              }
            } catch {
              errors.push('slabJson must be valid JSON');
            }
          }
          break;
        default:
          if (typeof value !== 'string') {
            errors.push(`${key} must be a string`);
          } else if (key === 'title' && value.trim().length === 0) {
            errors.push('title cannot be empty');
          } else {
            updates[key] = value;
          }
          break;
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: errors.join(', '),
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields to update',
        code: 'NO_UPDATES'
      }, { status: 400 });
    }

    updates.updatedAt = new Date().toISOString();

    const updatedLocation = await db.update(parkingLocations)
      .set(updates)
      .where(eq(parkingLocations.id, locationId))
      .returning();

    if (updatedLocation.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json(updatedLocation[0]);

  } catch (error) {
    console.error('PATCH location error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}