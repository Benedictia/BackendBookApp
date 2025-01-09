const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const router = express.Router();

// Create a reusable Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,  
    pass: process.env.EMAIL_PASSWORD,  
  },
});

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
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      library: []  
    });

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
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

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

// Get user profile (protected route)
router.get('/user', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);  // Use the decoded userId from the token
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
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

// Add or update a book in the user's library
router.put('/library', verifyToken, async (req, res) => {
  const { bookId, title, author, genre, description, link, status } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const existingBookIndex = user.library.findIndex(book => book.bookId === bookId);

    if (existingBookIndex > -1) {
      // If the book exists, update it
      user.library[existingBookIndex] = { bookId, title, author, genre, description, link, status };
    } else {
      // If the book doesn't exist, add it to the library
      const newBook = { bookId, title, author, genre, description, link, status };
      user.library.push(newBook);
    }

    await user.save();
    res.json(user.library);  
  } catch (error) {
    console.error('Error adding/updating book in library:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete a book from the user's library
router.delete('/library/:bookId', verifyToken, async (req, res) => {
  const { bookId } = req.params;

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const bookIndex = user.library.findIndex(book => book.bookId === bookId);

    if (bookIndex > -1) {
      // If book exists, delete it
      user.library.splice(bookIndex, 1);  
      await user.save();
      return res.json({ msg: 'Book deleted successfully', library: user.library });
    } else {
      return res.status(404).json({ msg: 'Book not found' });
    }
  } catch (error) {
    console.error('Error deleting book from library:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Password Reset Request (send reset link)
router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: 'No user found with this email' });
    }

    // Generate a reset token (with expiration)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // Token expires in 1 hour

    // Save token and expiry in the database
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Generate the reset link
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    // Send the reset link to the user's email
    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: 'Password Reset Request',
      text: `To reset your password, please click the following link: ${resetLink}`,
    };

    // Send the email with the reset link
    await transporter.sendMail(mailOptions);

    res.json({ msg: 'Password reset link has been sent to your email.' });
  } catch (err) {
    console.error('Error requesting password reset:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Password Reset (update password)
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({ resetToken: token });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired reset token' });
    }

    if (user.resetTokenExpiry && user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ msg: 'Reset token has expired' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    // Remove reset token and expiry after password is updated
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    
    // Save the user with the new password
    await user.save();

    res.json({ msg: 'Password has been successfully reset' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
