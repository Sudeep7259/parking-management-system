import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { parkingLocations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location_id, start_time, end_time } = body;

    // Validate inputs
    if (!location_id || isNaN(parseInt(location_id))) {
      return NextResponse.json({ 
        error: "Valid location_id is required",
        code: "INVALID_LOCATION_ID" 
      }, { status: 400 });
    }

    if (!start_time || isNaN(Date.parse(start_time))) {
      return NextResponse.json({ 
        error: "Valid start_time is required",
        code: "INVALID_START_TIME" 
      }, { status: 400 });
    }

    if (!end_time || isNaN(Date.parse(end_time))) {
      return NextResponse.json({ 
        error: "Valid end_time is required",
        code: "INVALID_END_TIME" 
      }, { status: 400 });
    }

    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    if (endTime <= startTime) {
      return NextResponse.json({ 
        error: "end_time must be after start_time",
        code: "INVALID_TIME_RANGE" 
      }, { status: 400 });
    }

    // Check location exists and is approved
    const location = await db.select()
      .from(parkingLocations)
      .where(eq(parkingLocations.id, parseInt(location_id)))
      .limit(1);

    if (location.length === 0) {
      return NextResponse.json({ 
        error: "Location not found",
        code: "LOCATION_NOT_FOUND" 
      }, { status: 404 });
    }

    const locationData = location[0];
    if (!locationData.approved) {
      return NextResponse.json({ 
        error: "Location not approved",
        code: "LOCATION_NOT_APPROVED" 
      }, { status: 400 });
    }

    // Calculate duration in minutes
    const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Calculate price based on pricing mode
    let pricePaise: number;
    let pricingMode: string;
    let appliedRate: number;
    let calculationMethod: string;

    if (locationData.pricingMode === 'hourly') {
      // Hourly pricing: ceil(minutes/60) * base_price_per_hour_paise
      const hours = Math.ceil(durationMinutes / 60);
      pricePaise = hours * locationData.basePricePerHourPaise;
      pricingMode = 'hourly';
      appliedRate = locationData.basePricePerHourPaise;
      calculationMethod = `${hours} hour(s) × ${locationData.basePricePerHourPaise} paise/hour`;
    } else if (locationData.pricingMode === 'slab' && locationData.slabJson) {
      // Slab pricing: find matching slab range
      const slabs = locationData.slabJson as Array<{
        minMinutes: number;
        maxMinutes: number;
        pricePaise: number;
      }>;

      const matchingSlab = slabs.find(slab => 
        durationMinutes >= slab.minMinutes && durationMinutes <= slab.maxMinutes
      );

      if (matchingSlab) {
        // Use slab pricing
        pricePaise = matchingSlab.pricePaise;
        pricingMode = 'slab';
        appliedRate = matchingSlab.pricePaise;
        calculationMethod = `Slab pricing: ${matchingSlab.minMinutes}-${matchingSlab.maxMinutes} minutes = ${matchingSlab.pricePaise} paise`;
      } else {
        // Fallback to hourly pricing
        const hours = Math.ceil(durationMinutes / 60);
        pricePaise = hours * locationData.basePricePerHourPaise;
        pricingMode = 'hourly';
        appliedRate = locationData.basePricePerHourPaise;
        calculationMethod = `No matching slab found, fallback: ${hours} hour(s) × ${locationData.basePricePerHourPaise} paise/hour`;
      }
    } else {
      // Default to hourly pricing
      const hours = Math.ceil(durationMinutes / 60);
      pricePaise = hours * locationData.basePricePerHourPaise;
      pricingMode = 'hourly';
      appliedRate = locationData.basePricePerHourPaise;
      calculationMethod = `${hours} hour(s) × ${locationData.basePricePerHourPaise} paise/hour`;
    }

    return NextResponse.json({
      duration_minutes: durationMinutes,
      price_paise: pricePaise,
      pricing_details: {
        mode: pricingMode,
        applied_rate: appliedRate,
        calculation_method: calculationMethod
      }
    }, { status: 200 });

  } catch (error) {
    console.error('POST /api/reservations/price error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}