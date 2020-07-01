const mongoose = require('mongoose');

const PollSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
  },
  author: {
    type: String,
  },
  status: {
    type: Boolean,
    default: false,
  },
  topic: {
    type: String,
    required: true,
    unique: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('poll', PollSchema);
