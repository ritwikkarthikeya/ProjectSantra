const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assuming the User model is in the models folder

// Middleware to authenticate user
const authenticateToken = async (req, res, next) => {
    const token =
      req.cookies.user_jwt ||
      (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        console.log('Authenticated user:', req.user); // Debugging
        return next();
      }
  
      return res.status(404).json({ message: 'User Not Found' });
  
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({ message: 'Invalid token' });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
module.exports = authenticateToken;
