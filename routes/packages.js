const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const { protect, admin } = require('../middleware/authMiddleware');

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

// GET latest three packages (most recently created, starting from current month onwards)
router.get('/latest', async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonthIdx = currentDate.getMonth(); // 0 for Jan, 5 for June
    
    const monthsOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Fetch all packages sorted by creation date (newest first)
    const allPackages = await Package.find({}).sort({ createdAt: -1 });
    
    // Filter to only include packages of current or future months (and Ramadan)
    const upcomingPackages = allPackages.filter(pkg => {
      if (pkg.month.toLowerCase() === 'ramadan') return true;
      const pkgMonthIdx = monthsOrder.findIndex(m => m.toLowerCase() === pkg.month.toLowerCase());
      if (pkgMonthIdx === -1) return false;
      return pkgMonthIdx >= currentMonthIdx;
    });
    
    // Take the 3 most recently created upcoming packages
    let latestThree = upcomingPackages.slice(0, 3);
    
    // Fallback if not enough upcoming packages are found
    if (latestThree.length < 3) {
      latestThree = allPackages.slice(0, 3);
    }
    
    res.json(latestThree);
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
router.post('/', protect, admin, async (req, res) => {
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
    isFeatured,
    tag
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
      isFeatured,
      tag
    });

    const savedPackage = await newPackage.save();
    res.status(201).json(savedPackage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update a package (Admin)
router.put('/:id', protect, admin, async (req, res) => {
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
router.delete('/:id', protect, admin, async (req, res) => {
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
