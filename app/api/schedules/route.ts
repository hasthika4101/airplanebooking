import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Schedule from '@/models/Schedule';

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const orig = searchParams.get('orig');
  const dest = searchParams.get('dest');
  const date1 = searchParams.get('date1');
  const date2 = searchParams.get('date2');

  const query: any = {};
  if (orig) query.origin = orig;
  if (dest) query.destination = dest;
  if (date1 && date2) {
    query.departureTime = {
      $gte: new Date(date1),
      $lte: new Date(date2 + 'T23:59:59Z')
    };
  }

  const schedules = await Schedule.find(query).sort({ departureTime: 1 });
  return NextResponse.json(schedules);
}