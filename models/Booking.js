const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true },
  phone:         { type: String, required: true },
  destinationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },

  adults:        { type: Number, required: true, min: 1 },
  children:      { type: Number, required: true, min: 0 },
  travelStyle:   { type: String, required: true, enum: ['Adventure', 'Relaxation', 'Cultural'] },

  dateFrom:      { type: Date,   required: true },
  dateTo:        { type: Date,   required: true },

  budget:        { type: Number, min: 0 },
  interests:     [{ type: String }],
  message:       { type: String },

  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);
