const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  productType: {
    type: String,
    enum: ['Umrah Visa', 'Single Air Ticket', 'Air Group Ticket', 'Umrah Package', 'Transport', 'Hotel', 'Other'],
    default: 'Other'
  },
  description: {
    type: String,
    trim: true,
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    default: 0,
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    default: 0
  }
});

const paymentRecordSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Card', 'Cheque', 'Other'],
    default: 'Cash'
  },
  nextDueDate: {
    type: Date
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  recordedBy: {
    type: String,
    default: 'Admin'
  }
});

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
  customerId: {
    type: String,
    trim: true,
    index: true
  },
  customerOrderSeq: {
    type: Number,
    default: 1
  },
  // Multiple line items array
  items: [itemSchema],
  // Main product metadata for summary/filtering
  productType: {
    type: String,
    default: 'Umrah Visa'
  },
  productDetails: {
    type: String,
    trim: true,
    default: ''
  },
  quantity: {
    type: Number,
    default: 1
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0,
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
  // Detailed installment payment history
  paymentHistory: [paymentRecordSchema],
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

// Middleware to compute line item totals, grand total, dueAmount & paymentStatus before save
saleSchema.pre('save', function () {
  if (this.items && this.items.length > 0) {
    let computedTotal = 0;
    this.items.forEach(item => {
      item.totalPrice = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
      computedTotal += item.totalPrice;
    });

    if (computedTotal > 0) {
      this.totalAmount = computedTotal;
    }

    if (this.items.length === 1) {
      this.productType = this.items[0].productType;
      this.productDetails = this.items[0].description;
      this.quantity = this.items[0].quantity;
      this.unitPrice = this.items[0].unitPrice;
    } else {
      this.productType = 'Multiple Products';
      this.productDetails = this.items.map(i => `${i.description} (Qty: ${i.quantity} @ ৳${i.unitPrice})`).join(' | ');
      this.quantity = this.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
    }
  }

  // If paymentHistory has entries, ensure paidAmount stays in sync with total of all installments
  if (this.paymentHistory && this.paymentHistory.length > 0) {
    const historyTotal = this.paymentHistory.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    if (historyTotal > 0) {
      this.paidAmount = historyTotal;
    }
  }

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
