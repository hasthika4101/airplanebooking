import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Schedule from '@/models/Schedule';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  await connectDB();
  const { email } = await params;
  const decoded = decodeURIComponent(email);

  const schedules = await Schedule.find({ 'bookings.passengerEmail': decoded });
  return NextResponse.json(schedules);
}