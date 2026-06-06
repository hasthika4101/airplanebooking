import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Schedule from '@/models/Schedule';

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function makeDate(monday: Date, dayOffset: number, hour: number, minute: number, tzOffsetMinutes: number): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + dayOffset);
  const utcMinutes = hour * 60 + minute - tzOffsetMinutes;
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMinutes(utcMinutes);
  return d;
}

const NZ = 12 * 60;
const SYD = 10 * 60;
const CHAT = 12 * 60 + 45;

export async function GET() {
  await connectDB();
  await Schedule.deleteMany({});

  const monday = getMonday(new Date());
  const schedules = [];

  for (let week = 0; week < 4; week++) {
    const wm = new Date(monday);
    wm.setDate(monday.getDate() + week * 7);

    // Sydney (Fri out, Sun return)
    schedules.push({ flightNumber: 'DF101', origin: 'NZNE', destination: 'YSSY',
      departureTime: makeDate(wm, 4, 9, 30, NZ), arrivalTime: makeDate(wm, 4, 13, 0, SYD),
      aircraft: 'SyberJet SJ30i', capacity: 6, price: 1200, bookings: [] });
    schedules.push({ flightNumber: 'DF102', origin: 'YSSY', destination: 'NZNE',
      departureTime: makeDate(wm, 6, 14, 0, SYD), arrivalTime: makeDate(wm, 6, 19, 30, NZ),
      aircraft: 'SyberJet SJ30i', capacity: 6, price: 1200, bookings: [] });

    // Rotorua (Mon–Fri, 2x daily)
    for (let d = 0; d < 5; d++) {
      schedules.push({ flightNumber: 'DF201', origin: 'NZNE', destination: 'NZRO',
        departureTime: makeDate(wm, d, 7, 0, NZ), arrivalTime: makeDate(wm, d, 8, 0, NZ),
        aircraft: 'Cirrus SF50', capacity: 4, price: 180, bookings: [] });
      schedules.push({ flightNumber: 'DF202', origin: 'NZRO', destination: 'NZNE',
        departureTime: makeDate(wm, d, 8, 30, NZ), arrivalTime: makeDate(wm, d, 9, 30, NZ),
        aircraft: 'Cirrus SF50', capacity: 4, price: 180, bookings: [] });
      schedules.push({ flightNumber: 'DF203', origin: 'NZNE', destination: 'NZRO',
        departureTime: makeDate(wm, d, 16, 30, NZ), arrivalTime: makeDate(wm, d, 17, 30, NZ),
        aircraft: 'Cirrus SF50', capacity: 4, price: 180, bookings: [] });
      schedules.push({ flightNumber: 'DF204', origin: 'NZRO', destination: 'NZNE',
        departureTime: makeDate(wm, d, 18, 15, NZ), arrivalTime: makeDate(wm, d, 19, 15, NZ),
        aircraft: 'Cirrus SF50', capacity: 4, price: 180, bookings: [] });
    }

    // Great Barrier (Mon/Wed/Fri out, Tue/Thu/Sat return)
    for (const d of [0, 2, 4]) {
      schedules.push({ flightNumber: 'DF301', origin: 'NZNE', destination: 'NZGB',
        departureTime: makeDate(wm, d, 9, 0, NZ), arrivalTime: makeDate(wm, d, 9, 45, NZ),
        aircraft: 'Cirrus SF50', capacity: 4, price: 220, bookings: [] });
    }
    for (const d of [1, 3, 5]) {
      schedules.push({ flightNumber: 'DF302', origin: 'NZGB', destination: 'NZNE',
        departureTime: makeDate(wm, d, 10, 0, NZ), arrivalTime: makeDate(wm, d, 10, 45, NZ),
        aircraft: 'Cirrus SF50', capacity: 4, price: 220, bookings: [] });
    }

    // Chatham Islands (Tue/Fri out, Wed/Sat return)
    for (const d of [1, 4]) {
      schedules.push({ flightNumber: 'DF401', origin: 'NZNE', destination: 'NZCI',
        departureTime: makeDate(wm, d, 8, 0, NZ), arrivalTime: makeDate(wm, d, 10, 30, CHAT),
        aircraft: 'HondaJet Elite', capacity: 5, price: 650, bookings: [] });
    }
    for (const d of [2, 5]) {
      schedules.push({ flightNumber: 'DF402', origin: 'NZCI', destination: 'NZNE',
        departureTime: makeDate(wm, d, 11, 0, CHAT), arrivalTime: makeDate(wm, d, 13, 0, NZ),
        aircraft: 'HondaJet Elite', capacity: 5, price: 650, bookings: [] });
    }

    // Lake Tekapo (Mon out, Tue return)
    schedules.push({ flightNumber: 'DF501', origin: 'NZNE', destination: 'NZTL',
      departureTime: makeDate(wm, 0, 10, 0, NZ), arrivalTime: makeDate(wm, 0, 12, 15, NZ),
      aircraft: 'HondaJet Elite', capacity: 5, price: 420, bookings: [] });
    schedules.push({ flightNumber: 'DF502', origin: 'NZTL', destination: 'NZNE',
      departureTime: makeDate(wm, 1, 9, 0, NZ), arrivalTime: makeDate(wm, 1, 11, 15, NZ),
      aircraft: 'HondaJet Elite', capacity: 5, price: 420, bookings: [] });
  }

  await Schedule.insertMany(schedules);
  return NextResponse.json({ message: `Seeded ${schedules.length} schedules successfully!` });
}