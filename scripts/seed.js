const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Package = require('../models/Package');
const About = require('../models/About');

const teamMembers = [
  {
    name: 'আল্লামা খালিদ সাইফুল্লাহ আইয়ূবী',
    role: 'Managing Director',
    designation: 'Founder মারকাযুত তারবিয়াহ বাংলাদেশ',
    image: 'https://res.cloudinary.com/dshkbza19/image/upload/v1781119835/WhatsApp_Image_2026-06-11_at_1.19.48_AM_zjn3zy.jpg'
  },
  {
    name: 'Mowlana Kawser Ahmed Habibi',
    role: 'CEO',
    designation: 'খতিব:- সিটি কর্পোরেশন জামে মসজিদ, গাজীপুর মহানগর।',
    image: 'https://res.cloudinary.com/dshkbza19/image/upload/v1781119690/Gemini_Generated_Image_8e7ux98e7ux98e7u_cnbq7v.png'
  },
  {
    name: 'মুফতি শহিদুল ইসলাম',
    role: 'Hajj Management Manager',
    designation: 'খতিব বাইতুল মামুর জামে মসজিদ ( গেন্ডা সাভার,ঢাকা)',
    image: 'https://res.cloudinary.com/dshkbza19/image/upload/v1781119724/Gemini_Generated_Image_5fxuer5fxuer5fxu_vmwfqa.png'
  }
];

// Load environment variables
dotenv.config();

const packages = [
  {
    title: 'Premium Ramadan Special Umrah',
    month: 'Ramadan',
    duration: '14 Days',
    price: 3200,
    makkahHotel: 'Pullman Zamzam Makkah',
    makkahHotelRating: 5,
    madinahHotel: 'Anwar Al Madinah Mövenpick',
    madinahHotelRating: 5,
    flights: 'Direct Flight (Saudi Arabian Airlines)',
    inclusions: [
      'Visa Processing & Insurance',
      '5-Star Makkah Hotel (Zamzam Tower)',
      '5-Star Madinah Hotel (Front of Haram)',
      'Luxury VIP Transport',
      'Guided Ziyarat in Makkah & Madinah',
      '24/7 Ground Assistance',
      'Iftar & Suhoor Buffet'
    ],
    description: 'Experience the blessings of Ramadan in the holy cities of Makkah and Madinah. Our premium Ramadan package includes accommodation in close proximity to the Haram, high-quality buffet meals, and VIP ground transfers.',
    isFeatured: true,
    tag: 'Premium'
  },
  {
    title: 'Autumn Umrah Package',
    month: 'October',
    duration: '10 Days',
    price: 1850,
    makkahHotel: 'Swissôtel Makkah',
    makkahHotelRating: 5,
    madinahHotel: 'Al Aqeeq Madinah Hotel',
    madinahHotelRating: 4,
    flights: 'Direct Flight (FlyNas)',
    inclusions: [
      'Umrah Visa & Health Insurance',
      'Makkah Hotel 5-Star (Clock Tower)',
      'Madinah Hotel 4-Star (2 mins walk)',
      'Air-Conditioned Transport',
      'Historical Ziyarat Tours',
      'Complementary Zamzam water'
    ],
    description: 'Perform Umrah in the pleasant autumn weather. This package balances luxury and affordability, featuring a 5-star hotel in Makkah and a comfortable 4-star hotel in Madinah close to Masjid Nabawi.',
    isFeatured: true,
    tag: 'Gold'
  },
  {
    title: 'Winter Warmth Umrah',
    month: 'December',
    duration: '14 Days',
    price: 2100,
    makkahHotel: 'Makkah Towers',
    makkahHotelRating: 5,
    madinahHotel: 'Millennium Madinah Hotel',
    madinahHotelRating: 5,
    flights: 'Indirect Flight (Emirates)',
    inclusions: [
      'Visa & Health Cover',
      'Luxury Hotels (Makkah & Madinah)',
      'Buffet Breakfast included',
      'Guided Group Ziyarat',
      'High-Speed Haramain Train Ticket',
      'Free Sim Card with Data'
    ],
    description: 'Avoid the intense summer heat by travelling during December. Perfect for families, this package features premium 5-star lodging in both holy cities and transport via the high-speed Haramain Train.',
    isFeatured: true,
    tag: 'Diamond'
  },
  {
    title: 'New Year Blessings Umrah',
    month: 'January',
    duration: '12 Days',
    price: 1750,
    makkahHotel: 'Hotel Hilton Suite Makkah',
    makkahHotelRating: 5,
    madinahHotel: 'Saja Al Madinah',
    madinahHotelRating: 4,
    flights: 'Direct Flight (Saudi Arabian Airlines)',
    inclusions: [
      'Umrah Visa processing',
      'Hilton Suites Makkah (Jabal Omar)',
      'Saja Al Madinah (Near Masjid Nabawi)',
      'AC Bus Transport',
      'Ziyarat in Makkah & Madinah',
      'Umrah Training Kit'
    ],
    description: 'Start the new year with spiritual rejuvenation. Enjoy your stay in Makkah at the elegant Hilton Suites in Jabal Omar, combined with a comfortable and modern hotel experience in Madinah.',
    isFeatured: false,
    tag: 'Gold'
  },
  {
    title: 'Spring Season Devotion Umrah',
    month: 'March',
    duration: '10 Days',
    price: 1600,
    makkahHotel: 'Mina Concordia Hotel',
    makkahHotelRating: 4,
    madinahHotel: 'Dallah Taibah Hotel',
    madinahHotelRating: 4,
    flights: 'Indirect Flight (Gulf Air)',
    inclusions: [
      'Visa & Insurance',
      '4-Star Hotels in Makkah & Madinah',
      'Shared Transport',
      'Guided Ziyarat',
      'Experienced Tour Guide'
    ],
    description: 'A pocket-friendly, high-quality spring package ideal for groups and individual pilgrims. Enjoy a comfortable stay in highly-rated 4-star hotels with excellent service and proximity to the holy sites.',
    isFeatured: false,
    tag: 'Gold'
  },
  {
    title: 'Shaban Pre-Ramadan Special',
    month: 'February',
    duration: '14 Days',
    price: 2400,
    makkahHotel: 'Fairmont Makkah Clock Royal Tower',
    makkahHotelRating: 5,
    madinahHotel: 'Madinah Hilton',
    madinahHotelRating: 5,
    flights: 'Direct Flight (Saudi Arabian Airlines)',
    inclusions: [
      'Visa Processing & Premium Insurance',
      'Fairmont Makkah (Clock Tower view)',
      'Madinah Hilton Accommodation',
      'VIP Airport Pickup & Transfers',
      'Full Board Catering (Optional)',
      'Exclusive Ziyarat tour with historian guide'
    ],
    description: 'Perform Umrah in the sacred month of Shaban and prepare your heart for Ramadan. Stay at the world-famous Fairmont Clock Tower in Makkah and enjoy top-tier hospitality in Madinah.',
    isFeatured: false,
    tag: 'Premium'
  },
  {
    title: 'Mid-Summer Spiritual Journey',
    month: 'July',
    duration: '10 Days',
    price: 1450,
    makkahHotel: 'Le Méridien Towers Makkah',
    makkahHotelRating: 4,
    madinahHotel: 'Raza Al Madinah',
    madinahHotelRating: 3,
    flights: 'Indirect Flight (Air Arabia)',
    inclusions: [
      'Umrah Visa',
      'Hotel Lodging (Makkah Shuttle Service)',
      'Madinah Hotel (5 mins walk)',
      'Air-Conditioned Transport',
      'Ziyarat Tours'
    ],
    description: 'Our most economical package for those who wish to visit the Holy House during the summer break. Le Méridien Towers provides 24/7 private shuttle service directly to the Haram courtyard.',
    isFeatured: false,
    tag: 'Gold'
  },
  {
    title: 'Rabi al-Awwal Mawlid Special',
    month: 'September',
    duration: '12 Days',
    price: 1950,
    makkahHotel: 'Swissôtel Al Maqam Makkah',
    makkahHotelRating: 5,
    madinahHotel: 'Al Haram Hotel Madinah',
    madinahHotelRating: 4,
    flights: 'Direct Flight (Saudi Arabian Airlines)',
    inclusions: [
      'Visa and Health Cover',
      '5-Star Makkah Hotel (Haram View)',
      '4-Star Madinah Hotel (Near gate 25)',
      'AC coach transfers',
      'Ziyarat with historical guidance'
    ],
    description: 'Celebrate the month of the Prophet\'s birth (Mawlid al-Nabawi) in Madinah and Makkah. This special package includes rich historical sightseeing and excellent close-to-Haram hotels.',
    isFeatured: false,
    tag: 'Diamond'
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seeding...');
    
    // Clear existing packages
    await Package.deleteMany();
    console.log('Existing packages cleared.');
    
    // Insert new packages
    const createdPackages = await Package.insertMany(packages);
    console.log(`${createdPackages.length} packages successfully seeded!`);

    // Clear existing abouts
    await About.deleteMany();
    console.log('Existing about members cleared.');

    // Insert new abouts
    const createdAbouts = await About.insertMany(teamMembers);
    console.log(`${createdAbouts.length} about members successfully seeded!`);
    
    mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error(`Seeding error: ${error.message}`);
    process.exit(1);
  }
};

seedDB();
