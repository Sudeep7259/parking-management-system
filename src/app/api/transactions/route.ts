import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reservations, transactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { reservation_id, method, upi_vpa } = body;

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body || 'authorId' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!reservation_id || isNaN(parseInt(reservation_id))) {
      return NextResponse.json({ 
        error: "Valid reservation_id is required",
        code: "INVALID_RESERVATION_ID"
      }, { status: 400 });
    }

    if (!method || !['upi', 'cash', 'card'].includes(method)) {
      return NextResponse.json({ 
        error: "Valid payment method is required (upi, cash, or card)",
        code: "INVALID_PAYMENT_METHOD"
      }, { status: 400 });
    }

    // Validate UPI VPA format if provided
    if (upi_vpa && !/^[a-zA-Z0-9.-]+@[a-zA-Z]+$/.test(upi_vpa)) {
      return NextResponse.json({ 
        error: "Invalid UPI VPA format",
        code: "INVALID_UPI_VPA"
      }, { status: 400 });
    }

    // Fetch reservation and verify ownership
    const reservation = await db.select()
      .from(reservations)
      .where(and(
        eq(reservations.id, parseInt(reservation_id)),
        eq(reservations.customerUserId, session.user.id)
      ))
      .limit(1);

    if (reservation.length === 0) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const reservationData = reservation[0];

    // Check if reservation is eligible for payment
    if (!['pending', 'confirmed'].includes(reservationData.status)) {
      return NextResponse.json({ 
        error: "Reservation not eligible for payment",
        code: "INVALID_RESERVATION_STATUS"
      }, { status: 400 });
    }

    // Generate UPI QR payload if method is UPI
    let qrPayload = null;
    if (method === 'upi') {
      const merchantVPA = process.env.NEXT_PUBLIC_UPI_VPA || 'merchant@upi';
      const amountInRupees = (reservationData.pricePaise / 100).toFixed(2);
      qrPayload = `upi://pay?pa=${merchantVPA}&pn=ParkOps&am=${amountInRupees}&cu=INR&tn=Reservation%20#${reservationData.id}`;
    }

    // Create transaction
    const newTransaction = await db.insert(transactions)
      .values({
        reservationId: parseInt(reservation_id),
        amountPaise: reservationData.pricePaise,
        paymentMethod: method,
        upiVpa: upi_vpa || null,
        qrPayload: qrPayload,
        status: 'initiated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newTransaction[0], { status: 201 });

  } catch (error) {
    console.error('POST transaction error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}