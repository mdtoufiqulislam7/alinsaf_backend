const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const client = new OAuth2Client(process.env.CLIENT_ID || '601952770353-un7egcqbqq6el771775hp2f9vpcmk9aa.apps.googleusercontent.com');

// Helper to generate JWT Token
const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET || 'al_insaf_secret_key_12345';
  return jwt.sign({ id, role }, secret, {
    expiresIn: '30d'
  });
};

// POST /api/auth/google - Login/Register with Google
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: 'Credential token is required' });
  }

  try {
    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.CLIENT_ID || '601952770353-un7egcqbqq6el771775hp2f9vpcmk9aa.apps.googleusercontent.com'
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Google account has no email' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // Update details if profile picture/name changed
      user.name = name;
      user.picture = picture;
      await user.save();
    } else {
      // Promote the first registered user to admin automatically for testing purposes
      const userCount = await User.countDocuments({});
      const role = userCount === 0 ? 'admin' : 'user';

      user = await User.create({
        name,
        email,
        picture,
        role
      });
      console.log(`Created new user ${name} (${email}) with role: ${role}`);
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role: user.role,
      token
    });

  } catch (error) {
    console.error('Google Auth Error:', error.message);
    res.status(401).json({ message: 'Invalid Google token' });
  }
});

// POST /api/auth/email - Login with Email & Hardcoded Password (420420)
router.post('/email', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists in database
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    // Password check hardcoded to 420420
    if (password !== '420420') {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('Email Auth Error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
