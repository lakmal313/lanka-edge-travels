const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  title:    { type: String, required: true },
  bio:      { type: String },
  imgPath:  { type: String },        // e.g. '/uploads/alice.jpg'
  order:    { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
