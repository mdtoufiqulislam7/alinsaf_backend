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

// Helper to get or generate permanent Customer ID per phone number
const getOrGenerateCustomerId = async (customerPhone) => {
  const cleanPhone = (customerPhone || '').trim();
  if (!cleanPhone) return { customerId: 'CUST-0001', customerOrderSeq: 1 };

  // Check if an existing sale exists with this phone number
  const existing = await Sale.findOne({ customerPhone: cleanPhone }).sort({ createdAt: 1 });

  if (existing && existing.customerId) {
    const totalCustomerOrders = await Sale.countDocuments({ customerPhone: cleanPhone });
    return {
      customerId: existing.customerId,
      customerOrderSeq: totalCustomerOrders + 1
    };
  }

  // Count distinct customer phone numbers to assign next CUST-XXXX
  const distinctPhones = await Sale.distinct('customerPhone');
  const nextSeq = String(distinctPhones.length + 1).padStart(4, '0');
  const customerId = `CUST-${nextSeq}`;

  return {
    customerId,
    customerOrderSeq: 1
  };
};

// Helper to backfill customerId for legacy sales
const backfillCustomerIds = async () => {
  try {
    const unassigned = await Sale.find({ $or: [{ customerId: { $exists: false } }, { customerId: '' }, { customerId: null }] }).sort({ createdAt: 1 });
    if (unassigned.length > 0) {
      for (const sale of unassigned) {
        const { customerId, customerOrderSeq } = await getOrGenerateCustomerId(sale.customerPhone);
        sale.customerId = customerId;
        sale.customerOrderSeq = customerOrderSeq;
        await sale.save();
      }
    }
  } catch (err) {
    console.error('Error backfilling customer IDs:', err);
  }
};

// @route   GET /api/sales
// @desc    Get all sales with optional filtering and pagination (20 per page)
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    // Backfill any unassigned sales records
    await backfillCustomerIds();

    const { search, paymentStatus, productType, dueOnly, page, limit, all } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { invoiceNo: { $regex: search, $options: 'i' } },
        { productDetails: { $regex: search, $options: 'i' } },
        { 'items.description': { $regex: search, $options: 'i' } }
      ];
    }

    if (paymentStatus === 'Due' || dueOnly === 'true') {
      query.dueAmount = { $gt: 0 };
    } else if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (productType) {
      query.productType = productType;
    }

    const total = await Sale.countDocuments(query);

    // If all=true is passed, return full list without pagination
    if (all === 'true') {
      const sales = await Sale.find(query).sort({ createdAt: -1 });
      return res.json({
        sales,
        page: 1,
        pages: 1,
        total,
        limit: total
      });
    }

    // Default pagination: 20 items per page
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (currentPage - 1) * pageLimit;

    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const totalPages = Math.ceil(total / pageLimit) || 1;

    res.json({
      sales,
      page: currentPage,
      pages: totalPages,
      total,
      limit: pageLimit
    });
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

    const upcomingDues = [];

    const categoryMap = {
      'Umrah Visa': 0,
      'Single Air Ticket': 0,
      'Air Group Ticket': 0,
      'Umrah Package': 0,
      'Transport': 0,
      'Hotel': 0,
      'Other': 0
    };

    const monthlyMap = {};

    sales.forEach(sale => {
      totalRevenue += sale.totalAmount || 0;
      totalPaid += sale.paidAmount || 0;
      totalDue += sale.dueAmount || 0;

      if (sale.dueAmount > 0) {
        dueAlertCount += 1;
        upcomingDues.push(sale);
      }

      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          const type = item.productType || 'Other';
          if (categoryMap[type] !== undefined) {
            categoryMap[type] += item.totalPrice || 0;
          } else {
            categoryMap['Other'] += item.totalPrice || 0;
          }
        });
      } else if (categoryMap[sale.productType] !== undefined) {
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
      upcomingDues: upcomingDues.slice(0, 10),
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
      items,
      productType,
      productDetails,
      quantity,
      unitPrice,
      totalAmount,
      paidAmount,
      dueDate,
      notes
    } = req.body;

    if (!customerName || !customerPhone) {
      return res.status(400).json({ message: 'Please provide customer name and phone number' });
    }

    const invoiceNo = await generateInvoiceNumber();
    const { customerId, customerOrderSeq } = await getOrGenerateCustomerId(customerPhone);

    const saleData = {
      invoiceNo,
      customerId,
      customerOrderSeq,
      customerType: customerType || 'Person',
      customerName,
      customerPhone,
      companyName: companyName || '',
      paidAmount: Number(paidAmount) || 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || '',
      createdBy: req.user.name || 'Admin',
      paymentHistory: []
    };

    // If initial payment is made upon creation, log it as the 1st installment
    if (saleData.paidAmount > 0) {
      saleData.paymentHistory.push({
        amount: saleData.paidAmount,
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
        paymentMethod: req.body.paymentMethod || 'Cash',
        nextDueDate: saleData.dueDate,
        note: req.body.paymentNote || 'Initial advance payment',
        recordedBy: req.user.name || 'Admin'
      });
    }

    if (items && Array.isArray(items) && items.length > 0) {
      saleData.items = items.map(item => ({
        productType: item.productType || 'Other',
        description: item.description || 'Product Item',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)
      }));
    } else {
      // Fallback single item
      saleData.productType = productType || 'Umrah Visa';
      saleData.productDetails = productDetails || 'Product details';
      saleData.quantity = Number(quantity) || 1;
      saleData.unitPrice = Number(unitPrice) || 0;
      saleData.totalAmount = Number(totalAmount) || (saleData.quantity * saleData.unitPrice);
      saleData.items = [{
        productType: saleData.productType,
        description: saleData.productDetails,
        quantity: saleData.quantity,
        unitPrice: saleData.unitPrice,
        totalPrice: saleData.totalAmount
      }];
    }

    const sale = new Sale(saleData);
    const savedSale = await sale.save();
    res.status(201).json(savedSale);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ message: 'Failed to create sale record: ' + error.message });
  }
});

// @route   POST /api/sales/:id/payments
// @desc    Record a new installment payment on a sale
// @access  Private/Admin
router.post('/:id/payments', protect, admin, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale record not found' });
    }

    const { amount, paymentDate, paymentMethod, nextDueDate, note } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid payment amount greater than 0' });
    }

    const paymentRecord = {
      amount: numAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || 'Cash',
      nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      note: note || '',
      recordedBy: req.user.name || 'Admin'
    };

    if (!sale.paymentHistory) {
      sale.paymentHistory = [];
    }

    sale.paymentHistory.push(paymentRecord);
    sale.paidAmount = (Number(sale.paidAmount) || 0) + numAmount;

    // Update scheduled next due date
    if (nextDueDate !== undefined) {
      sale.dueDate = nextDueDate ? new Date(nextDueDate) : null;
    }

    const updatedSale = await sale.save();
    res.status(201).json(updatedSale);
  } catch (error) {
    console.error('Error recording installment payment:', error);
    res.status(500).json({ message: 'Failed to record installment payment: ' + error.message });
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

    if (req.body.items && Array.isArray(req.body.items)) {
      sale.items = req.body.items.map(item => ({
        productType: item.productType || 'Other',
        description: item.description || 'Product Item',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)
      }));
    }

    const simpleFields = [
      'customerType',
      'customerName',
      'customerPhone',
      'companyName',
      'productType',
      'productDetails',
      'notes'
    ];

    simpleFields.forEach(field => {
      if (req.body[field] !== undefined) {
        sale[field] = req.body[field];
      }
    });

    // Keep customerId linked cleanly if phone changed
    if (req.body.customerPhone && req.body.customerPhone !== sale.customerPhone) {
      const { customerId, customerOrderSeq } = await getOrGenerateCustomerId(req.body.customerPhone);
      sale.customerId = customerId;
      sale.customerOrderSeq = customerOrderSeq;
    }

    if (req.body.paidAmount !== undefined) sale.paidAmount = Number(req.body.paidAmount);
    if (req.body.totalAmount !== undefined && (!req.body.items || req.body.items.length === 0)) {
      sale.totalAmount = Number(req.body.totalAmount);
    }
    if (req.body.dueDate !== undefined) {
      sale.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    }
    if (req.body.paymentHistory && Array.isArray(req.body.paymentHistory)) {
      sale.paymentHistory = req.body.paymentHistory;
    }

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
