import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Schedule from '@/models/Schedule';

export async function GET(req: NextRequest, { params }: { params: { email: string } }) {
  await connectDB();
  const email = decodeURIComponent(params.email);
  const schedules = await Schedule.find({ 'bookings.passengerEmail': email });
  return NextResponse.json(schedules);
}