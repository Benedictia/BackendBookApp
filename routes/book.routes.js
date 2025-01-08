
const express = require('express');
const router = express.Router();
const Book = require('../models/book.model.js');
const { check, validationResult } = require('express-validator');  
const jwt = require('jsonwebtoken');

// Middleware to verify the JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];  // Get token from Authorization header

  if (!token) {
    return res.status(401).json({ msg: 'Access denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ msg: 'Invalid or expired token' });
    }
    req.user = user; // Attach user data to request
    next();
  });
};

// Middleware to verify if the user is an admin
const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') { 
    return next();
  }
  return res.status(403).json({ msg: 'Admin access required' });
};

// Get all books
router.get('/all', async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new book
router.post(
  '/add', 
  verifyToken, 
  [
    // Validation for book fields
    check('title', 'Title is required').notEmpty(),
    check('author', 'Author is required').notEmpty(),
    check('genre', 'Genre is required').notEmpty(),
    check('description', 'Description is required').notEmpty(),
    check('link', 'Link is required').notEmpty().isURL(),
  ], 
  async (req, res) => {
    // Check if validation errors exist
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, author, genre, description, link } = req.body;

    const newBook = new Book({
      title,
      author,
      genre,
      description,
      link
    });

    try {
      const savedBook = await newBook.save();
      res.status(201).json(savedBook);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// Edit a book
router.put(
  '/edit/:id',
  verifyToken, // Only authorized users can edit
  async (req, res) => {
    try {
      const updatedBook = await Book.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      res.json(updatedBook);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// Delete a book
router.delete(
  '/delete/:id',
  verifyToken, 
  verifyAdmin, 
  async (req, res) => {
    try {
      await Book.findByIdAndDelete(req.params.id);
      res.json({ message: 'Book deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
