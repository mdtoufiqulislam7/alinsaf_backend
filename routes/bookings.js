const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Package = require('../models/Package');

// GET all bookings (Admin) - sorted by date descending, with package details populated
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('packageId')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create a new booking
router.post('/', async (req, res) => {
  const {
    packageId,
    fullName,
    email,
    phone,
    pilgrimsCount,
    departureDate,
    specialRequests
  } = req.body;

  try {
    // Validate package exists
    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(404).json({ message: 'Umrah package not found' });
    }

    const newBooking = new Booking({
      packageId,
      fullName,
      email,
      phone,
      pilgrimsCount,
      departureDate,
      specialRequests
    });

    const savedBooking = await newBooking.save();
    
    // We can populate the package info back for response consistency
    const populatedBooking = await Booking.findById(savedBooking._id).populate('packageId');

    res.status(201).json(populatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update booking status (Admin) - e.g. confirm or cancel
router.put('/:id', async (req, res) => {
  const { status } = req.body;

  if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid booking status' });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = status;
    const updatedBooking = await booking.save();
    const populatedBooking = await Booking.findById(updatedBooking._id).populate('packageId');

    res.json(populatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
