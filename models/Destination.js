// models/Destination.js
const mongoose = require('mongoose');

// Sub‐schema for each day in the itinerary
const ItinerarySchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: String,
    required: true
  }
  // price removed — no longer required per-day
});

// Main Destination schema
const DestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  imgPath: {
    type: String,
    required: true
  },
  desc: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  itinerary: {
    type: [ItinerarySchema],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Destination', DestSchema);
