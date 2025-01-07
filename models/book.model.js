const mongoose = require('mongoose');

// Define the schema for the Book
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  genre: { type: String, required: true },
  description: { type: String, required: true },
  link: { type: String, required: true },
});

// Create the model
const Books = mongoose.model('Books', bookSchema);

module.exports = Books;
