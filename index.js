const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authentication');  
const adminRoutes = require('./routes/adminRoutes');  
const bookRoutes = require('./routes/book.routes');  
const User = require('./models/User'); 
const Books = require('./models/book.model.js'); 
const jwt = require('jsonwebtoken');
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; 

  if (!token) {
    return res.status(401).send('Access denied.');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send('Invalid token.');
    }
    req.user = user; 
    next();
  });
};

// Middleware

app.use(cors({
  origin: 'http://localhost:3000', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  
  allowedHeaders: ['Content-Type', 'Authorization'],  
})); 

// Routes
app.use('/api/auth', authRoutes);  
app.use('/api/admin', adminRoutes);  
app.use('/api/books', bookRoutes);  


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});