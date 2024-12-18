const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

exports.getSignupPage = (req, res) => {
  res.render('signup', { errorMessage: null }); // Render signup page
};

exports.signup = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ statusCode: 400, errorMessage: 'Invalid Details' });
  }

  try {
    // Check if email already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ statusCode: 400, errorMessage: 'Email already taken!' });
    }

    // Check if username already exists
    existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ statusCode: 400, errorMessage: 'Username already exists!' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Create a JWT token for the user
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    // Set the token as an HttpOnly cookie (for secure storage)
    res.cookie('user_jwt', token, {
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      secure: process.env.NODE_ENV === 'production', // Secure cookie in production
    });

    // Redirect to the sign-in page after successful signup
    res.redirect('/details-form');
  } catch (error) {
    console.error('Error during user creation:', error.message);
    res.status(500).json({ statusCode: 500, errorMessage: 'Internal Server Error' });
  }
};


exports.getSigninPage = (req, res) => {
  res.render('signin', { errorMessage: null }); // Render signin page
};

exports.signin = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ statusCode: 401, errorMessage: 'User not found' });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ statusCode: 401, errorMessage: 'Invalid username or password' });
    }

    // Create a JWT token for the user
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    // Set the token as an HttpOnly cookie (for secure storage)
    res.cookie('user_jwt', token, {
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      secure: process.env.NODE_ENV === 'production', // Secure cookie in production
    });

    // Redirect to the detailsForm page after successful signin
    res.redirect('/homepage');
  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({ statusCode: 500, errorMessage: 'Internal Server Error' });
  }
};


exports.logout = (req, res) => {
  res.clearCookie('token'); // Clear JWT cookie
  res.redirect('/signin');  // Redirect to signin page
};
