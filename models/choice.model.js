const mongoose = require('mongoose');

const ChoiceSchema = new mongoose.Schema({
  poll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'poll',
  },
  value: {
    type: String,
    required: true,
  },
  votes: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
  ],
});

module.exports = mongoose.model('choice', ChoiceSchema);
