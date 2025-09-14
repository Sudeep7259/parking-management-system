import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reservations, parkingLocations, user, userRoles } from '@/db/schema';
import { eq, and, or, lt, gt, desc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const as = searchParams.get('as');
    const status = searchParams.get('status');

    if (as === 'owner') {
      // Check if user has owner role
      const hasOwnerRole = await db.select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, session.user.id), eq(userRoles.role, 'owner')))
        .limit(1);

      if (hasOwnerRole.length === 0) {
        return NextResponse.json({ error: 'Owner role required' }, { status: 403 });
      }

      // Get reservations for locations owned by this user
      let query = db.select({
        reservation: reservations,
        customerName: user.name,
        customerEmail: user.email,
        locationTitle: parkingLocations.title,
        locationAddress: parkingLocations.address,
        locationCity: parkingLocations.city,
        locationState: parkingLocations.state,
      })
      .from(reservations)
      .innerJoin(user, eq(reservations.customerUserId, user.id))
      .innerJoin(parkingLocations, eq(reservations.locationId, parkingLocations.id))
      .where(eq(parkingLocations.ownerUserId, session.user.id));

      if (status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
        query = query.where(and(
          eq(parkingLocations.ownerUserId, session.user.id),
          eq(reservations.status, status)
        ));
      }

      const results = await query.orderBy(desc(reservations.createdAt));
      
      return NextResponse.json(results.map(result => ({
        ...result.reservation,
        customerName: result.customerName,
        customerEmail: result.customerEmail,
        locationTitle: result.locationTitle,
        locationAddress: result.locationAddress,
        locationCity: result.locationCity,
        locationState: result.locationState,
      })));

    } else {
      // Get user's own reservations
      let query = db.select({
        reservation: reservations,
        locationTitle: parkingLocations.title,
        locationAddress: parkingLocations.address,
        locationCity: parkingLocations.city,
        locationState: parkingLocations.state,
        latitude: parkingLocations.latitude,
        longitude: parkingLocations.longitude,
      })
      .from(reservations)
      .innerJoin(parkingLocations, eq(reservations.locationId, parkingLocations.id))
      .where(eq(reservations.customerUserId, session.user.id));

      if (status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
        query = query.where(and(
          eq(reservations.customerUserId, session.user.id),
          eq(reservations.status, status)
        ));
      }

      const results = await query.orderBy(desc(reservations.createdAt));
      
      return NextResponse.json(results.map(result => ({
        ...result.reservation,
        locationTitle: result.locationTitle,
        locationAddress: result.locationAddress,
        locationCity: result.locationCity,
        locationState: result.locationState,
        latitude: result.latitude,
        longitude: result.longitude,
      })));
    }
  } catch (error) {
    console.error('GET reservations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    
    if ('customerUserId' in body || 'customer_user_id' in body || 'userId' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { location_id, vehicle_number, start_time, end_time } = body;

    if (!location_id || isNaN(parseInt(location_id))) {
      return NextResponse.json({ error: 'Valid location_id is required' }, { status: 400 });
    }

    if (!vehicle_number || typeof vehicle_number !== 'string') {
      return NextResponse.json({ error: 'vehicle_number is required' }, { status: 400 });
    }

    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'start_time and end_time are required' }, { status: 400 });
    }

    const startTimeMs = new Date(start_time).getTime();
    const endTimeMs = new Date(end_time).getTime();

    if (isNaN(startTimeMs) || isNaN(endTimeMs)) {
      return NextResponse.json({ error: 'Invalid timestamp format' }, { status: 400 });
    }

    if (endTimeMs <= startTimeMs) {
      return NextResponse.json({ error: 'end_time must be after start_time' }, { status: 400 });
    }

    const location = await db.select()
      .from(parkingLocations)
      .where(eq(parkingLocations.id, parseInt(location_id)))
      .limit(1);

    if (location.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const loc = location[0];

    if (loc.availableSlots <= 0) {
      return NextResponse.json({ error: 'No available slots' }, { status: 400 });
    }

    const durationMinutes = Math.round((endTimeMs - startTimeMs) / (1000 * 60));
    let pricePaise = 0;

    if (loc.pricingMode === 'hourly') {
      const hours = Math.ceil(durationMinutes / 60);
      pricePaise = hours * loc.basePricePerHourPaise;
    } else if (loc.pricingMode === 'slab' && loc.slabJson) {
      const slabs = JSON.parse(loc.slabJson);
      const matchingSlab = slabs.find((s: any) => 
        durationMinutes >= s.minMinutes && durationMinutes <= s.maxMinutes
      );
      
      if (matchingSlab) {
        pricePaise = matchingSlab.pricePaise;
      } else {
        const hours = Math.ceil(durationMinutes / 60);
        pricePaise = hours * loc.basePricePerHourPaise;
      }
    } else {
      const hours = Math.ceil(durationMinutes / 60);
      pricePaise = hours * loc.basePricePerHourPaise;
    }

    const overlappingReservations = await db.select()
      .from(reservations)
      .where(and(
        eq(reservations.locationId, parseInt(location_id)),
        eq(reservations.status, 'confirmed'),
        or(
          and(
            sql`${reservations.startTime} <= ${new Date(startTimeMs)}`,
            sql`${reservations.endTime} > ${new Date(startTimeMs)}`
          ),
          and(
            sql`${reservations.startTime} < ${new Date(endTimeMs)}`,
            sql`${reservations.endTime} >= ${new Date(endTimeMs)}`
          )
        )
      ));

    if (overlappingReservations.length >= loc.totalSlots) {
      return NextResponse.json({ error: 'No available slots for requested time slot' }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [newReservation] = await tx.insert(reservations)
        .values({
          locationId: parseInt(location_id),
          customerUserId: session.user.id,
          vehicleNumber: vehicle_number.trim(),
          startTime: new Date(startTimeMs),
          endTime: new Date(endTimeMs),
          durationMinutes,
          pricePaise,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();

      await tx.update(parkingLocations)
        .set({ 
          availableSlots: loc.availableSlots - 1,
          updatedAt: new Date().toISOString()
        })
        .where(eq(parkingLocations.id, parseInt(location_id)));

      return newReservation;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST reservations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}