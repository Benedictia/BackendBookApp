const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  library: [
    {
      bookId: { type: String, required: true },
      title: { type: String, required: true },
      author: { type: String, required: true },
      status: { type: String, required: true }, 
    },
  ],
  resetToken: { type: String }, 
  resetTokenExpiry: { type: Date } 
});

const User = mongoose.model('User', userSchema);

module.exports = User;
