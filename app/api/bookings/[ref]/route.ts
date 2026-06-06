import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Schedule from '@/models/Schedule';

export async function DELETE(req: NextRequest, { params }: { params: { ref: string } }) {
  await connectDB();
  const schedule = await Schedule.findOne({ 'bookings.bookingRef': params.ref });
  if (!schedule) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  schedule.bookings = schedule.bookings.filter((b: any) => b.bookingRef !== params.ref);
  await schedule.save();
  return NextResponse.json({ message: 'Booking cancelled' });
}