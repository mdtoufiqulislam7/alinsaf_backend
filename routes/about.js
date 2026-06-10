const express = require('express');
const router = express.Router();
const About = require('../models/About');

// GET all about members (team and guides)
router.get('/', async (req, res) => {
  try {
    const members = await About.find({}).sort({ createdAt: 1 });
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
