// models/Contact.js
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  destination:    { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
  name:           { type: String, required: true },
  email:          { type: String, required: true },
  phone:          String,
  country:        String,
  dateFrom:       Date,
  dateTo:         Date,
  adults:         Number,
  children:       Number,
  travelStyle:    String,
  budget:         Number,
  interests:      String,
  message:        { type: String, required: true },
  createdAt:      { type: Date,   default: Date.now }
});

module.exports = mongoose.model('Contact', ContactSchema);
