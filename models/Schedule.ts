import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  bookingRef: String,
  passengerId: String,
  passengerName: String,
  passengerEmail: String,
  bookedAt: { type: Date, default: Date.now }
});

const ScheduleSchema = new mongoose.Schema({
  flightNumber: String,       // e.g. "DF101"
  origin: String,             // ICAO code e.g. "NZNE"
  destination: String,        // e.g. "YSSY"
  departureTime: Date,        // full UTC datetime
  arrivalTime: Date,
  aircraft: String,           // "SyberJet SJ30i" etc.
  capacity: Number,           // 4, 5, or 6
  price: Number,
  bookings: [BookingSchema]
});

export default mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);