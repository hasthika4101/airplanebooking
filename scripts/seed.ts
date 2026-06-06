import { connectDB } from '../lib/mongodb';
import Schedule from '../models/Schedule';
import Passenger from '../models/Passenger';
import fs from 'fs';
import path from 'path';

// Timezone offsets in minutes
const TZ = {
  NZNE: 12 * 60,      // NZ mainland
  NZRO: 12 * 60,
  NZGB: 12 * 60,
  NZTL: 12 * 60,
  NZCI: 12 * 60 + 45, // Chatham Islands
  YSSY: 10 * 60,      // Sydney
};

// Convert local time to UTC Date for a given week's Monday
function localToUTC(mondayDate: Date, dayOffset: number, hour: number, minute: number, tzMinutes: number): Date {
  const d = new Date(mondayDate);
  d.setDate(d.getDate() + dayOffset);
  d.setUTCHours(0, 0, 0, 0);
  const localMinutes = hour * 60 + minute;
  const utcMinutes = localMinutes - tzMinutes;
  d.setUTCMinutes(d.getUTCMinutes() + utcMinutes + 24 * 60); // add day buffer then normalize
  return d;
}

async function seed() {
  await connectDB();
  await Schedule.deleteMany({});
  await Passenger.deleteMany({});

  // Seed passengers from CSV
  const csvPath = path.join(__dirname, '../randomnames.csv');
  const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').slice(0, 100); // first 100
  const passengers = lines.filter(Boolean).map(line => {
    const [, title, firstName, lastName, gender, email] = line.split(',');
    return { title, firstName, lastName, gender, email };
  });
  await Passenger.insertMany(passengers);

  // Generate 4 weeks of schedules starting from this Monday
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  monday.setUTCHours(0, 0, 0, 0);

  const schedules = [];
  for (let week = 0; week < 4; week++) {
    const wm = new Date(monday);
    wm.setDate(monday.getDate() + week * 7);

    // --- Sydney service (Friday outbound, Sunday return) ---
    schedules.push({ flightNumber: 'DF101', origin: 'NZNE', destination: 'YSSY',
      departureTime: localToUTC(wm, 4, 9, 30, TZ.NZNE),
      arrivalTime: localToUTC(wm, 4, 13, 0, TZ.YSSY),
      aircraft: 'SyberJet SJ30i', capacity: 6, price: 1200, bookings: [] });
    schedules.push({ flightNumber: 'DF102', origin: 'YSSY', destination: 'NZNE',
      departureTime: localToUTC(wm, 6, 14, 0, TZ.YSSY),
      arrivalTime: localToUTC(wm, 6, 19, 30, TZ.NZNE),
      aircraft: 'SyberJet SJ30i', capacity: 6, price: 1200, bookings: [] });

    // --- Rotorua shuttle (Mon–Fri, 2x daily) ---
    for (let d = 0; d < 5; d++) {
      schedules.push({ flightNumber: 'DF201', origin: 'NZNE', destination: 'NZRO',
        departureTime: localToUTC(wm, d, 7, 0, TZ.NZNE),
        arrivalTime: localToUTC(wm, d, 8, 0, TZ.NZRO),
        aircraft: 'Cirrus SF50', capacity: 4, price: 180, bookings: [] });
      schedules.push({ flightNumber: 'DF202', origin: 'NZRO', destination: 'NZNE',
        departureTime: localToUTC(wm, d, 8, 30, TZ.NZRO),
        arrivalTime: localToUTC(wm, d, 9, 30, TZ.NZNE),
        aircraft: 'Cirrus SF50', capacity: 4, price: 180, bookings: [] });
      schedules.push({ flightNumber: 'DF203', origin: 'NZNE', destination: 'NZRO',
        departureTime: localToUTC(wm, d, 16, 30, TZ.NZNE),
        arrivalTime: localToUTC(wm, d, 17, 30, TZ.NZRO),
        aircraft: 'Cirrus SF50', capacity: 4, price: 180, bookings: [] });
      schedules.push({ flightNumber: 'DF204', origin: 'NZRO', destination: 'NZNE',
        departureTime: localToUTC(wm, d, 18, 15, TZ.NZRO),
        arrivalTime: localToUTC(wm, d, 19, 15, TZ.NZNE),
        aircraft: 'Cirrus SF50', capacity: 4, price: 180, bookings: [] });
    }

    // --- Great Barrier Island (Mon/Wed/Fri out, Tue/Thu/Sat return) ---
    for (const d of [0, 2, 4]) { // Mon, Wed, Fri
      schedules.push({ flightNumber: 'DF301', origin: 'NZNE', destination: 'NZGB',
        departureTime: localToUTC(wm, d, 9, 0, TZ.NZNE),
        arrivalTime: localToUTC(wm, d, 9, 45, TZ.NZGB),
        aircraft: 'Cirrus SF50', capacity: 4, price: 220, bookings: [] });
    }
    for (const d of [1, 3, 5]) { // Tue, Thu, Sat
      schedules.push({ flightNumber: 'DF302', origin: 'NZGB', destination: 'NZNE',
        departureTime: localToUTC(wm, d, 10, 0, TZ.NZGB),
        arrivalTime: localToUTC(wm, d, 10, 45, TZ.NZNE),
        aircraft: 'Cirrus SF50', capacity: 4, price: 220, bookings: [] });
    }

    // --- Chatham Islands (Tue/Fri out, Wed/Sat return) ---
    for (const d of [1, 4]) {
      schedules.push({ flightNumber: 'DF401', origin: 'NZNE', destination: 'NZCI',
        departureTime: localToUTC(wm, d, 8, 0, TZ.NZNE),
        arrivalTime: localToUTC(wm, d, 10, 30, TZ.NZCI),
        aircraft: 'HondaJet Elite', capacity: 5, price: 650, bookings: [] });
    }
    for (const d of [2, 5]) {
      schedules.push({ flightNumber: 'DF402', origin: 'NZCI', destination: 'NZNE',
        departureTime: localToUTC(wm, d, 11, 0, TZ.NZCI),
        arrivalTime: localToUTC(wm, d, 13, 0, TZ.NZNE),
        aircraft: 'HondaJet Elite', capacity: 5, price: 650, bookings: [] });
    }

    // --- Lake Tekapo (Mon out, Tue return) ---
    schedules.push({ flightNumber: 'DF501', origin: 'NZNE', destination: 'NZTL',
      departureTime: localToUTC(wm, 0, 10, 0, TZ.NZNE),
      arrivalTime: localToUTC(wm, 0, 12, 15, TZ.NZTL),
      aircraft: 'HondaJet Elite', capacity: 5, price: 420, bookings: [] });
    schedules.push({ flightNumber: 'DF502', origin: 'NZTL', destination: 'NZNE',
      departureTime: localToUTC(wm, 1, 9, 0, TZ.NZTL),
      arrivalTime: localToUTC(wm, 1, 11, 15, TZ.NZNE),
      aircraft: 'HondaJet Elite', capacity: 5, price: 420, bookings: [] });
  }

  await Schedule.insertMany(schedules);
  console.log(`Seeded ${schedules.length} schedules and ${passengers.length} passengers.`);
  process.exit(0);
}

seed().catch(console.error);