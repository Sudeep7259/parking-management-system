import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { parkingLocations, user, userRoles } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const adminRole = await db.select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, session.user.id), eq(userRoles.role, 'admin')))
      .limit(1);

    if (adminRole.length === 0) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Fetch pending parking locations with owner information
    const pendingLocations = await db
      .select({
        id: parkingLocations.id,
        ownerUserId: parkingLocations.ownerUserId,
        title: parkingLocations.title,
        description: parkingLocations.description,
        address: parkingLocations.address,
        city: parkingLocations.city,
        state: parkingLocations.state,
        pincode: parkingLocations.pincode,
        latitude: parkingLocations.latitude,
        longitude: parkingLocations.longitude,
        photos: parkingLocations.photos,
        totalSlots: parkingLocations.totalSlots,
        availableSlots: parkingLocations.availableSlots,
        pricingMode: parkingLocations.pricingMode,
        basePricePerHourPaise: parkingLocations.basePricePerHourPaise,
        slabJson: parkingLocations.slabJson,
        approved: parkingLocations.approved,
        approvedBy: parkingLocations.approvedBy,
        approvedAt: parkingLocations.approvedAt,
        createdAt: parkingLocations.createdAt,
        updatedAt: parkingLocations.updatedAt,
        ownerName: user.name,
        ownerEmail: user.email,
      })
      .from(parkingLocations)
      .innerJoin(user, eq(parkingLocations.ownerUserId, user.id))
      .where(eq(parkingLocations.approved, 0))
      .orderBy(desc(parkingLocations.createdAt));

    // Transform the response to include nested owner object
    const transformedLocations = pendingLocations.map(location => ({
      id: location.id,
      ownerUserId: location.ownerUserId,
      title: location.title,
      description: location.description,
      address: location.address,
      city: location.city,
      state: location.state,
      pincode: location.pincode,
      latitude: location.latitude,
      longitude: location.longitude,
      photos: location.photos,
      totalSlots: location.totalSlots,
      availableSlots: location.availableSlots,
      pricingMode: location.pricingMode,
      basePricePerHourPaise: location.basePricePerHourPaise,
      slabJson: location.slabJson,
      approved: location.approved,
      approvedBy: location.approvedBy,
      approvedAt: location.approvedAt,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      owner: {
        name: location.ownerName,
        email: location.ownerEmail,
        id: location.ownerUserId
      }
    }));

    return NextResponse.json(transformedLocations);
  } catch (error) {
    console.error('GET pending parking locations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}