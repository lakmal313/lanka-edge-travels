const mongoose = require('mongoose');
const { Schema } = mongoose;

const testimonialSchema = new Schema({
  name:   { type: String, required: true },
  img:    { type: String, required: true },
  text:   { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5, default: 5 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Testimonial', testimonialSchema);