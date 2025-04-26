const mongoose = require('mongoose');

const DestSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  imgPath: { type: String, required: true },
  desc:    { type: String, required: true },
  price:   { type: Number, required: true }
});

module.exports = mongoose.model('Destination', DestSchema);
