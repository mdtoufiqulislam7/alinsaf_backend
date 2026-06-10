const express = require('express');
const router = express.Router();
const Package = require('../models/Package');

// GET all packages - with optional month filtering
router.get('/', async (req, res) => {
  try {
    const { month, featured } = req.query;
    let query = {};
    
    if (month && month !== 'All') {
      // Case-insensitive query for month name (e.g. "January", "Ramadan")
      query.month = { $regex: new RegExp(`^${month}$`, 'i') };
    }
    
    if (featured === 'true') {
      query.isFeatured = true;
    }
    
    const packages = await Package.find(query).sort({ createdAt: -1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single package details
router.get('/:id', async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create a package (Admin)
router.post('/', async (req, res) => {
  const {
    title,
    month,
    duration,
    price,
    makkahHotel,
    makkahHotelRating,
    madinahHotel,
    madinahHotelRating,
    flights,
    inclusions,
    description,
    isFeatured
  } = req.body;

  try {
    const newPackage = new Package({
      title,
      month,
      duration,
      price,
      makkahHotel,
      makkahHotelRating,
      madinahHotel,
      madinahHotelRating,
      flights,
      inclusions,
      description,
      isFeatured
    });

    const savedPackage = await newPackage.save();
    res.status(201).json(savedPackage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update a package (Admin)
router.put('/:id', async (req, res) => {
  try {
    const updatedPackage = await Package.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedPackage) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.json(updatedPackage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a package (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
