
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Middleware to verify the JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];  
  if (!token) {
    return res.status(403).json({ msg: 'Access Denied' });
  }

  // Verify token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ msg: 'Invalid or expired token' });
    req.userId = decoded.userId;  
    next();
  });
};

// User Registration
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with an empty library array
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      library: []  
    });

    // Save user to database
    await newUser.save();
    res.status(201).json({ msg: 'User created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// User Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Respond with token and user data (name, email)
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get User Profile (with Library)
router.get('/user', verifyToken, async (req, res) => {
  try {
    // Find the user by userId and return their library
    const user = await User.findById(req.userId).select('-password');  // Exclude password from the response

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Return user data with library
    res.json({
      name: user.name,
      email: user.email,
      library: user.library, 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Add a book to the user's library
router.put('/library', verifyToken, async (req, res) => {
  const { bookId, title, author, status } = req.body;

  // Validate input
  if (!bookId || !title || !author || !status) {
    return res.status(400).json({ msg: 'All fields (bookId, title, author, status) are required' });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Add the book to the user's library
    user.library.push({ bookId, title, author, status });
    await user.save();

    res.status(201).json(user.library); // Respond with the updated library
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error adding book to library', error });
  }
});

// Update the status of a book in the user's library
router.put('/library/status', verifyToken, async (req, res) => {
  const { bookId, status } = req.body;

  // Validate input
  if (!bookId || !status) {
    return res.status(400).json({ msg: 'Book ID and status are required' });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Find the book in the library and update its status
    const book = user.library.find(book => book.bookId === bookId);
    if (!book) {
      return res.status(400).json({ msg: 'Book not found in library' });
    }

    // Update the book's status
    book.status = status;
    await user.save(); 

    res.json(user.library); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error updating book status', error });
  }
});

module.exports = router;
