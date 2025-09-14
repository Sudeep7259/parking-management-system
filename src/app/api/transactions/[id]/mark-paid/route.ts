import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, reservations, userRoles } from '@/db/schema';
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

    const id = params.id;
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid transaction ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const transactionId = parseInt(id);

    // Get transaction with reservation details
    const transactionData = await db
      .select({
        transaction: transactions,
        reservation: reservations
      })
      .from(transactions)
      .innerJoin(reservations, eq(transactions.reservationId, reservations.id))
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (transactionData.length === 0) {
      return NextResponse.json({ 
        error: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      }, { status: 404 });
    }

    const { transaction, reservation } = transactionData[0];

    // Check if transaction can be marked as paid
    if (transaction.status !== 'initiated') {
      return NextResponse.json({ 
        error: 'Transaction cannot be marked as paid - invalid status',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    // Check authorization - user must be customer of reservation or admin
    const isReservationCustomer = reservation.customerUserId === session.user.id;
    
    const userRolesData = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, session.user.id), eq(userRoles.role, 'admin')))
      .limit(1);

    const isAdmin = userRolesData.length > 0;
    const canMarkPaid = isReservationCustomer || isAdmin;

    if (!canMarkPaid) {
      return NextResponse.json({ 
        error: 'Permission denied - not reservation customer or admin',
        code: 'PERMISSION_DENIED'
      }, { status: 403 });
    }

    // Determine reservation status based on end time
    const now = new Date();
    const reservationEndTime = new Date(reservation.endTime);
    const newReservationStatus = reservationEndTime <= now ? 'completed' : 'confirmed';

    // Start transaction for consistency
    try {
      // Update transaction status
      const updatedTransaction = await db
        .update(transactions)
        .set({
          status: 'paid',
          updatedAt: new Date().toISOString()
        })
        .where(eq(transactions.id, transactionId))
        .returning();

      // Update reservation status
      await db
        .update(reservations)
        .set({
          status: newReservationStatus,
          updatedAt: new Date().toISOString()
        })
        .where(eq(reservations.id, reservation.id));

      return NextResponse.json(updatedTransaction[0], { status: 200 });
    } catch (error) {
      console.error('Transaction update error:', error);
      throw new Error('Failed to update transaction and reservation');
    }
  } catch (error) {
    console.error('Mark paid error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}