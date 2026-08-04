const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Sale = require('../models/Sale');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedMultiItemSale = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/alinsaf';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    const count = await Sale.countDocuments();
    const currentYear = new Date().getFullYear();
    const sequence = String(count + 1).padStart(4, '0');
    const timestamp = Date.now().toString().slice(-3);
    const invoiceNo = `INV-${currentYear}-${sequence}${timestamp}`;

    // 10 Visas @ 17,000 BDT = 170,000 BDT
    // 10 Extra Transports @ 300 BDT = 3,000 BDT
    // Total Invoice = 173,000 BDT
    // Paid = 100,000 BDT, Due = 73,000 BDT
    const multiItemSale = new Sale({
      invoiceNo,
      customerType: 'Person',
      customerName: 'Md Toufiqul Islam',
      customerPhone: '01866733279',
      companyName: '',
      items: [
        {
          productType: 'Umrah Visa',
          description: 'Single Umrah Visa Processing (10 Persons)',
          quantity: 10,
          unitPrice: 17000,
          totalPrice: 170000
        },
        {
          productType: 'Transport',
          description: 'Extra Jeddah to Makkah Ground Transport (Per Visa Add-on)',
          quantity: 10,
          unitPrice: 300,
          totalPrice: 3000
        }
      ],
      paidAmount: 100000,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      notes: 'Umrah visas + transport add-on bundle for Md Toufiqul Islam group',
      createdBy: 'Multi-Product Seed Script'
    });

    const saved = await multiItemSale.save();

    console.log('\n==================================================');
    console.log('🎉 MULTI-PRODUCT & CUSTOM PRICING SALE CREATED!');
    console.log('==================================================');
    console.log(`Invoice Number: ${saved.invoiceNo}`);
    console.log(`Customer      : ${saved.customerName} (${saved.customerPhone})`);
    console.log(`Line Items Count: ${saved.items.length}`);
    saved.items.forEach((item, idx) => {
      console.log(`  [Item ${idx + 1}] ${item.productType} - ${item.description}`);
      console.log(`            Qty: ${item.quantity} @ ৳${item.unitPrice.toLocaleString()} -> Line Total: ৳${item.totalPrice.toLocaleString()}`);
    });
    console.log(`--------------------------------------------------`);
    console.log(`Grand Total   : ৳${saved.totalAmount.toLocaleString()} BDT`);
    console.log(`Paid Amount   : ৳${saved.paidAmount.toLocaleString()} BDT`);
    console.log(`Balance Due   : ৳${saved.dueAmount.toLocaleString()} BDT`);
    console.log(`Status        : ${saved.paymentStatus}`);
    console.log('==================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding multi-item sale:', err);
    process.exit(1);
  }
};

seedMultiItemSale();
