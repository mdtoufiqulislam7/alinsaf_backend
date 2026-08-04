const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const { protect, admin } = require('../middleware/authMiddleware');

// Helper to generate unique Invoice Number (e.g., INV-2026-0001)
const generateInvoiceNumber = async () => {
  const currentYear = new Date().getFullYear();
  const count = await Sale.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  const timestamp = Date.now().toString().slice(-3);
  return `INV-${currentYear}-${sequence}${timestamp}`;
};

// @route   GET /api/sales
// @desc    Get all sales with optional filtering
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const { search, paymentStatus, productType, dueOnly } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { invoiceNo: { $regex: search, $options: 'i' } },
        { productDetails: { $regex: search, $options: 'i' } }
      ];
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (productType) {
      query.productType = productType;
    }

    if (dueOnly === 'true') {
      query.dueAmount = { $gt: 0 };
    }

    const sales = await Sale.find(query).sort({ createdAt: -1 });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Server error fetching sales data' });
  }
});

// @route   GET /api/sales/stats
// @desc    Get aggregated sales statistics & graph data
// @access  Private/Admin
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const sales = await Sale.find({});

    let totalRevenue = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let dueAlertCount = 0;

    const today = new Date();
    const upcomingDues = [];

    const categoryMap = {
      'Umrah Visa': 0,
      'Single Air Ticket': 0,
      'Air Group Ticket': 0,
      'Umrah Package': 0,
      'Other': 0
    };

    // Monthly aggregator (last 6-12 months)
    const monthlyMap = {};

    sales.forEach(sale => {
      totalRevenue += sale.totalAmount || 0;
      totalPaid += sale.paidAmount || 0;
      totalDue += sale.dueAmount || 0;

      if (sale.dueAmount > 0) {
        dueAlertCount += 1;
        upcomingDues.push(sale);
      }

      if (categoryMap[sale.productType] !== undefined) {
        categoryMap[sale.productType] += sale.totalAmount || 0;
      }

      const dateObj = new Date(sale.createdAt);
      const monthYear = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyMap[monthYear]) {
        monthlyMap[monthYear] = { month: monthYear, total: 0, paid: 0, due: 0, count: 0 };
      }
      monthlyMap[monthYear].total += sale.totalAmount || 0;
      monthlyMap[monthYear].paid += sale.paidAmount || 0;
      monthlyMap[monthYear].due += sale.dueAmount || 0;
      monthlyMap[monthYear].count += 1;
    });

    // Sort upcoming dues by dueDate asc
    upcomingDues.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const monthlyChart = Object.values(monthlyMap);

    res.json({
      totalSalesCount: sales.length,
      totalRevenue,
      totalPaid,
      totalDue,
      dueAlertCount,
      upcomingDues: upcomingDues.slice(0, 10), // return top 10 upcoming due items
      categoryBreakdown: categoryMap,
      monthlyChart
    });
  } catch (error) {
    console.error('Error calculating sales stats:', error);
    res.status(500).json({ message: 'Server error fetching sales analytics' });
  }
});

// @route   POST /api/sales
// @desc    Create a new sale record
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const {
      customerType,
      customerName,
      customerPhone,
      companyName,
      productType,
      productDetails,
      quantity,
      unitPrice,
      totalAmount,
      paidAmount,
      dueDate,
      notes
    } = req.body;

    if (!customerName || !customerPhone || !productType || !productDetails || totalAmount === undefined) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const invoiceNo = await generateInvoiceNumber();

    const sale = new Sale({
      invoiceNo,
      customerType: customerType || 'Person',
      customerName,
      customerPhone,
      companyName: companyName || '',
      productType,
      productDetails,
      quantity: Number(quantity) || 1,
      unitPrice: Number(unitPrice) || 0,
      totalAmount: Number(totalAmount),
      paidAmount: Number(paidAmount) || 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || '',
      createdBy: req.user.name || 'Admin'
    });

    const savedSale = await sale.save();
    res.status(201).json(savedSale);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ message: 'Failed to create sale record: ' + error.message });
  }
});

// @route   PUT /api/sales/:id
// @desc    Update a sale record
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale record not found' });
    }

    const fieldsToUpdate = [
      'customerType',
      'customerName',
      'customerPhone',
      'companyName',
      'productType',
      'productDetails',
      'quantity',
      'unitPrice',
      'totalAmount',
      'paidAmount',
      'dueDate',
      'notes'
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'dueDate') {
          sale.dueDate = req.body[field] ? new Date(req.body[field]) : null;
        } else if (['quantity', 'unitPrice', 'totalAmount', 'paidAmount'].includes(field)) {
          sale[field] = Number(req.body[field]);
        } else {
          sale[field] = req.body[field];
        }
      }
    });

    const updatedSale = await sale.save();
    res.json(updatedSale);
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({ message: 'Failed to update sale record: ' + error.message });
  }
});

// @route   DELETE /api/sales/:id
// @desc    Delete a sale record
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale record not found' });
    }

    await Sale.findByIdAndDelete(req.params.id);
    res.json({ message: 'Sale record deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ message: 'Failed to delete sale record' });
  }
});

module.exports = router;
