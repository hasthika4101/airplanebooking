import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Schedule from '@/models/Schedule';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ ref: string }> }
) {
  await connectDB();
  const { ref } = await context.params;

  const schedule = await Schedule.findOne({ 'bookings.bookingRef': ref.toUpperCase() });
  if (!schedule) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  schedule.bookings = schedule.bookings.filter((b: any) => b.bookingRef !== ref.toUpperCase());
  await schedule.save();
  return NextResponse.json({ message: 'Booking cancelled' });
}
