const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    unique: true,
    required: true
  },
  customerType: {
    type: String,
    enum: ['Person', 'Company'],
    default: 'Person'
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  customerPhone: {
    type: String,
    required: [true, 'Customer phone number is required'],
    trim: true
  },
  companyName: {
    type: String,
    trim: true,
    default: ''
  },
  productType: {
    type: String,
    enum: ['Umrah Visa', 'Single Air Ticket', 'Air Group Ticket', 'Umrah Package', 'Other'],
    required: [true, 'Product type is required']
  },
  productDetails: {
    type: String,
    required: [true, 'Product details are required'],
    trim: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  dueAmount: {
    type: Number,
    default: 0
  },
  dueDate: {
    type: Date
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Partial', 'Unpaid'],
    default: 'Unpaid'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: String,
    default: 'Admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to compute dueAmount & paymentStatus before save
saleSchema.pre('save', function () {
  const total = Number(this.totalAmount) || 0;
  const paid = Number(this.paidAmount) || 0;
  this.dueAmount = Math.max(0, total - paid);

  if (paid >= total && total > 0) {
    this.paymentStatus = 'Paid';
  } else if (paid > 0 && paid < total) {
    this.paymentStatus = 'Partial';
  } else {
    this.paymentStatus = 'Unpaid';
  }
});

module.exports = mongoose.model('Sale', saleSchema);
