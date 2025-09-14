import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { parkingLocations } from '@/db/schema';
import { and, eq, gt } from 'drizzle-orm';

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusParam = searchParams.get('radiusMeters');

    console.log('URL:', request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    console.log('Nearby API params:', { latParam, lngParam, radiusParam });

    if (!latParam || !lngParam) {
      return NextResponse.json({ 
        error: 'lat and lng are required',
        code: 'MISSING_COORDINATES' 
      }, { status: 400 });
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ 
        error: 'lat and lng must be valid numbers',
        code: 'INVALID_COORDINATES' 
      }, { status: 400 });
    }

    if (lat < -90 || lat > 90) {
      return NextResponse.json({ 
        error: 'lat must be between -90 and 90',
        code: 'INVALID_LATITUDE' 
      }, { status: 400 });
    }

    if (lng < -180 || lng > 180) {
      return NextResponse.json({ 
        error: 'lng must be between -180 and 180',
        code: 'INVALID_LONGITUDE' 
      }, { status: 400 });
    }

    let radiusMeters = 1000;
    if (radiusParam) {
      radiusMeters = parseFloat(radiusParam);
      if (isNaN(radiusMeters) || radiusMeters <= 0) {
        return NextResponse.json({ 
          error: 'radiusMeters must be a positive number',
          code: 'INVALID_RADIUS' 
        }, { status: 400 });
      }
      if (radiusMeters > 10000) {
        radiusMeters = 10000;
      }
    }

    const locations = await db
      .select()
      .from(parkingLocations)
      .where(
        and(
          eq(parkingLocations.approved, 1),
          gt(parkingLocations.availableSlots, 0)
        )
      )
      .limit(100);

    console.log('Found locations:', locations.length);

    const results = locations
      .map(location => {
        const distance = haversineDistance(lat, lng, location.latitude, location.longitude);
        const etaMinutes = Math.round(distance / (4.5 * 1000 / 60));
        
        return {
          ...location,
          distance_meters: Math.round(distance),
          eta_minutes: etaMinutes
        };
      })
      .filter(location => location.distance_meters <= radiusMeters)
      .sort((a, b) => a.distance_meters - b.distance_meters)
      .slice(0, 20);

    console.log('Filtered results:', results.length);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET nearby parking locations error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}