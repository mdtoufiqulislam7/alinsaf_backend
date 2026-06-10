const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Package title is required'],
    trim: true
  },
  month: {
    type: String,
    required: [true, 'Month is required'],
    trim: true
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required']
  },
  makkahHotel: {
    type: String,
    required: [true, 'Makkah hotel name is required']
  },
  makkahHotelRating: {
    type: Number,
    default: 3,
    min: 1,
    max: 5
  },
  madinahHotel: {
    type: String,
    required: [true, 'Madinah hotel name is required']
  },
  madinahHotelRating: {
    type: Number,
    default: 3,
    min: 1,
    max: 5
  },
  flights: {
    type: String,
    default: 'Direct Flight'
  },
  inclusions: {
    type: [String],
    default: []
  },
  description: {
    type: String,
    trim: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Package', packageSchema);
