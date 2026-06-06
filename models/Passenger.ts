import mongoose from 'mongoose';

const PassengerSchema = new mongoose.Schema({
  title: String,
  firstName: String,
  lastName: String,
  gender: String,
  email: String,
});

export default mongoose.models.Passenger || mongoose.model('Passenger', PassengerSchema);