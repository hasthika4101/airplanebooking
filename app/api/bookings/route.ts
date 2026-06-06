import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Schedule from '@/models/Schedule';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  await connectDB();
  const { scheduleId, firstName, lastName, email, title } = await req.json();

  if (!scheduleId || !firstName || !lastName || !email || !title) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  const schedule = await Schedule.findById(scheduleId);
  if (!schedule) return NextResponse.json({ error: 'Flight not found' }, { status: 404 });

  if (schedule.bookings.length >= schedule.capacity) {
    return NextResponse.json({ error: 'Flight is full' }, { status: 400 });
  }

  const bookingRef = randomBytes(4).toString('hex').toUpperCase();
  schedule.bookings.push({
    bookingRef,
    passengerName: `${title} ${firstName} ${lastName}`,
    passengerEmail: email,
    title,
    bookedAt: new Date(),
  });
  await schedule.save();

  return NextResponse.json({ bookingRef, schedule });
}