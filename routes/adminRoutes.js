const express = require('express');
const jwt = require('jsonwebtoken');
const Books = require('../models/book.model.js');  
const router = express.Router();

// Secret key for JWT 
const SECRET_KEY = process.env.JWT_SECRET || 'your_jwt_secret_key'; 

// Admin authentication middleware (only checks if the token is valid)
const authenticateAdmin = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; 

  if (!token) {
    return res.status(403).json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Verify the token using the same secret key
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; 
    next(); 
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(400).json({ message: 'Invalid token.' });
  }
};

// Route to add a new book (only accessible by authenticated users)
router.post('/add', authenticateAdmin, async (req, res) => {
  const { title, author, genre, description, link } = req.body;

  try {
    // Create a new book entry in the database
    const newBook = new Books({
      title,
      author,
      genre,
      description,
      link,
    });

    await newBook.save();
    res.status(201).json(newBook); 
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ message: 'Error adding book' });
  }
});

// Route to edit an existing book (only accessible by authenticated users)
router.put('/edit/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, author, genre, description, link } = req.body;

  try {
    const book = await Books.findByIdAndUpdate(
      id,
      { title, author, genre, description, link },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    res.status(200).json(book); 
  } catch (error) {
    console.error('Error editing book:', error);
    res.status(500).json({ message: 'Error editing book' });
  }
});

// Route to delete a book (only accessible by authenticated users)
router.delete('/delete/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const book = await Books.findByIdAndDelete(id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    res.status(200).json({ message: 'Book deleted successfully.' }); // Respond with success message
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ message: 'Error deleting book' });
  }
});

// Route to get all books (accessible by authenticated users)
router.get('/all', authenticateAdmin, async (req, res) => {
  try {
    const books = await Books.find();
    res.status(200).json(books); 
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ message: 'Error fetching books' });
  }
});

module.exports = router;
