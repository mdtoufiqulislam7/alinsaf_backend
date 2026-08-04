const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Sale = require('../models/Sale');

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const createSaleRecord = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/alinsaf';
    console.log('Connecting to MongoDB database...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    // Count existing documents to generate sequential invoice number
    const count = await Sale.countDocuments();
    const currentYear = new Date().getFullYear();
    const sequence = String(count + 1).padStart(4, '0');
    const timestamp = Date.now().toString().slice(-3);
    const invoiceNo = `INV-${currentYear}-${sequence}${timestamp}`;

    const totalAmount = 10 * 80000; // 800,000 BDT
    const paidAmount = 500000;      // 500,000 BDT
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15); // Due in 15 days

    const newSale = new Sale({
      invoiceNo,
      customerType: 'Person',
      customerName: 'Md Toufiqul Islam',
      customerPhone: '01866733279',
      companyName: '',
      productType: 'Air Group Ticket',
      productDetails: '10 Saudia Airlines Air Tickets (Per Ticket Rate: 80,000 BDT)',
      quantity: 10,
      unitPrice: 80000,
      totalAmount,
      paidAmount,
      dueDate,
      notes: 'Customer paid 500,000 BDT advance for 10 Saudia Airlines air tickets. Remaining balance due before ticket issuance/flight date.',
      createdBy: 'Admin Script'
    });

    const savedSale = await newSale.save();

    console.log('\n==================================================');
    console.log('🎉 SALE RECORD CREATED SUCCESSFULLY!');
    console.log('==================================================');
    console.log(`Invoice Number : ${savedSale.invoiceNo}`);
    console.log(`Customer Name  : ${savedSale.customerName}`);
    console.log(`Phone Number   : ${savedSale.customerPhone}`);
    console.log(`Product Type   : ${savedSale.productType}`);
    console.log(`Product Details: ${savedSale.productDetails}`);
    console.log(`Quantity       : ${savedSale.quantity} tickets @ ৳${savedSale.unitPrice.toLocaleString()}`);
    console.log(`Total Amount   : ৳${savedSale.totalAmount.toLocaleString()} BDT`);
    console.log(`Given / Paid   : ৳${savedSale.paidAmount.toLocaleString()} BDT`);
    console.log(`Due Amount     : ৳${savedSale.dueAmount.toLocaleString()} BDT`);
    console.log(`Payment Status : ${savedSale.paymentStatus}`);
    console.log(`Due Date       : ${savedSale.dueDate.toLocaleDateString()}`);
    console.log('==================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sale record:', error);
    process.exit(1);
  }
};

createSaleRecord();
