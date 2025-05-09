const mongoose = require('mongoose');
const { Schema } = mongoose;

const testimonialSchema = new Schema({
  name: { type: String, required: true },
  img:  { type: String, required: true },  // you can swap this for a multer upload if you like
  text: { type: String, required: true }
});

module.exports = mongoose.model('Testimonial', testimonialSchema);
