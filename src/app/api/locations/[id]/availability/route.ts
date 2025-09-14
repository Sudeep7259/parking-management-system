import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { parkingLocations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    const locationId = parseInt(id);
    
    const location = await db.select({
      available_slots: parkingLocations.availableSlots,
      updated_at: parkingLocations.updatedAt
    })
    .from(parkingLocations)
    .where(and(
      eq(parkingLocations.id, locationId),
      eq(parkingLocations.approved, true)
    ))
    .limit(1);

    if (location.length === 0) {
      return NextResponse.json({ 
        error: 'Location not found or not approved',
        code: 'LOCATION_NOT_FOUND'
      }, { status: 404 });
    }

    return NextResponse.json({
      available_slots: location[0].available_slots,
      updated_at: location[0].updated_at
    }, { status: 200 });

  } catch (error) {
    console.error('GET availability error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}