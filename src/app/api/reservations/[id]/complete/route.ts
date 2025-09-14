import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reservations, parkingLocations, userRoles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid reservation ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const reservationId = parseInt(id);

    // Start transaction
    return await db.transaction(async (tx) => {
      // Get reservation with location details
      const reservationResult = await tx
        .select({
          reservation: reservations,
          location: parkingLocations
        })
        .from(reservations)
        .innerJoin(
          parkingLocations,
          eq(reservations.locationId, parkingLocations.id)
        )
        .where(eq(reservations.id, reservationId))
        .limit(1);

      if (reservationResult.length === 0) {
        return NextResponse.json(
          { error: 'Reservation not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      const { reservation, location } = reservationResult[0];

      // Check if reservation can be completed
      if (reservation.status !== 'confirmed') {
        return NextResponse.json(
          { 
            error: 'Reservation must be confirmed to be completed', 
            code: 'INVALID_STATUS' 
          },
          { status: 400 }
        );
      }

      // Check if user is owner or admin
      const isOwner = location.ownerUserId === session.user.id;
      let isAdmin = false;

      if (!isOwner) {
        const roleResult = await tx
          .select()
          .from(userRoles)
          .where(
            and(
              eq(userRoles.userId, session.user.id),
              eq(userRoles.role, 'admin')
            )
          )
          .limit(1);
        
        isAdmin = roleResult.length > 0;
      }

      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { error: 'Permission denied', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }

      // Complete reservation and update location slots
      const now = new Date().toISOString();

      const [updatedReservation] = await tx
        .update(reservations)
        .set({
          status: 'completed',
          updatedAt: now
        })
        .where(eq(reservations.id, reservationId))
        .returning();

      const [updatedLocation] = await tx
        .update(parkingLocations)
        .set({
          availableSlots: location.availableSlots + 1,
          updatedAt: now
        })
        .where(eq(parkingLocations.id, reservation.locationId))
        .returning();

      return NextResponse.json(updatedReservation, { status: 200 });
    });
  } catch (error) {
    console.error('Complete reservation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}