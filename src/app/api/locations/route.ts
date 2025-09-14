import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { parkingLocations, user, userRoles } from '@/db/schema';
import { eq, like, and, or, desc, asc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

async function getCurrentUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const search = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10'), 50);

    const offset = (page - 1) * pageSize;

    // Temporarily remove approved filter for debugging
    let whereConditions = undefined;
    
    if (city) {
      whereConditions = eq(parkingLocations.city, city);
    }

    if (search) {
      const searchCondition = or(
        like(parkingLocations.title, `%${search}%`),
        like(parkingLocations.address, `%${search}%`)
      );
      whereConditions = whereConditions ? and(whereConditions, searchCondition) : searchCondition;
    }

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(parkingLocations)
      .where(whereConditions);

    const total = Number(totalResult[0]?.count || 0);

    // Get paginated results with owner info
    const results = await db.select({
      id: parkingLocations.id,
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
      ownerName: user.name
    })
    .from(parkingLocations)
    .leftJoin(user, eq(parkingLocations.ownerUserId, user.id))
    .where(whereConditions)
    .limit(pageSize)
    .offset(offset)
    .orderBy(desc(parkingLocations.createdAt));

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    // Check if user has owner role
    const userRole = await db.select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, user.id), eq(userRoles.role, 'owner')))
      .limit(1);

    if (userRole.length === 0) {
      return NextResponse.json({ error: 'Owner role required' }, { status: 403 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('ownerUserId' in body || 'owner_user_id' in body) {
      return NextResponse.json({ 
        error: "Owner user ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const {
      title,
      description,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      photos,
      totalSlots,
      pricingMode,
      basePricePerHourPaise,
      slabJson
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ 
        error: "Title is required and must be a non-empty string",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      return NextResponse.json({ 
        error: "Address is required and must be a non-empty string",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!city || typeof city !== 'string' || city.trim().length === 0) {
      return NextResponse.json({ 
        error: "City is required and must be a non-empty string",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (typeof latitude !== 'number' || isNaN(latitude)) {
      return NextResponse.json({ 
        error: "Latitude is required and must be a valid number",
        code: "INVALID_LATITUDE" 
      }, { status: 400 });
    }

    if (typeof longitude !== 'number' || isNaN(longitude)) {
      return NextResponse.json({ 
        error: "Longitude is required and must be a valid number",
        code: "INVALID_LONGITUDE" 
      }, { status: 400 });
    }

    if (typeof totalSlots !== 'number' || totalSlots < 1) {
      return NextResponse.json({ 
        error: "Total slots is required and must be a positive number",
        code: "INVALID_TOTAL_SLOTS" 
      }, { status: 400 });
    }

    if (!pricingMode || !['hourly', 'daily', 'slab'].includes(pricingMode)) {
      return NextResponse.json({ 
        error: "Pricing mode is required and must be one of: hourly, daily, slab",
        code: "INVALID_PRICING_MODE" 
      }, { status: 400 });
    }

    if (typeof basePricePerHourPaise !== 'number' || basePricePerHourPaise < 0) {
      return NextResponse.json({ 
        error: "Base price per hour paise is required and must be a non-negative number",
        code: "INVALID_BASE_PRICE" 
      }, { status: 400 });
    }

    // Validate optional fields
    let validatedPhotos = null;
    if (photos !== undefined) {
      try {
        if (typeof photos === 'string') {
          validatedPhotos = JSON.parse(photos);
        } else {
          validatedPhotos = photos;
        }
        if (!Array.isArray(validatedPhotos)) {
          return NextResponse.json({ 
            error: "Photos must be a valid JSON array",
            code: "INVALID_PHOTOS" 
          }, { status: 400 });
        }
      } catch (e) {
        return NextResponse.json({ 
          error: "Photos must be a valid JSON array",
          code: "INVALID_PHOTOS" 
        }, { status: 400 });
      }
    }

    let validatedSlabJson = null;
    if (slabJson !== undefined) {
      try {
        if (typeof slabJson === 'string') {
          validatedSlabJson = JSON.parse(slabJson);
        } else {
          validatedSlabJson = slabJson;
        }
      } catch (e) {
        return NextResponse.json({ 
          error: "Slab JSON must be valid JSON",
          code: "INVALID_SLAB_JSON" 
        }, { status: 400 });
      }
    }

    const now = new Date().toISOString();

    const newLocation = await db.insert(parkingLocations)
      .values({
        ownerUserId: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        address: address.trim(),
        city: city.trim(),
        state: state?.trim() || null,
        pincode: pincode?.trim() || null,
        latitude,
        longitude,
        photos: validatedPhotos,
        totalSlots,
        availableSlots: totalSlots,
        pricingMode,
        basePricePerHourPaise,
        slabJson: validatedSlabJson,
        approved: false,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json(newLocation[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}