const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  name:        { type: String, required: true },
  email:       { type: String, required: true },
  phone:       String,
  dateFrom:    { type: Date, required: true },
  dateTo:      { type: Date, required: true },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);
